-- Free guides reset on the first of each month at 00:00 UTC.
-- Keep paid billing-period usage separate, including after upgrading/canceling.
alter table public.reader_guide_allowances add column kind text not null default 'subscription' check(kind in ('free','subscription'));
create index reader_guide_tier_period on public.reader_guide_allowances(user_id,kind,period_start,state);

create or replace function public.reader_plan(p_user uuid) returns jsonb language sql security invoker set search_path=public as $$
 with entitlement as (
  select s.*,coalesce(s.status='active' and s.period_start<=now() and s.period_end>now(),false) as paid,
   date_trunc('month',now() at time zone 'UTC') at time zone 'UTC' as free_start
  from (select 1) seed left join reader_subscriptions s on s.user_id=p_user
 ), allowance as (
  select *,case when paid then period_start else free_start end as allowance_start,
   case when paid then period_end else (free_start at time zone 'UTC'+interval '1 month') at time zone 'UTC' end as allowance_end,
   case when paid then 'subscription' else 'free' end as allowance_kind
  from entitlement
 )
 select jsonb_build_object('priceCents',2400,'limit',case when paid then 30 else 3 end,'active',paid,'tier',case when paid then 'paid' else 'free' end,
  'status',coalesce(status,'none'),'periodEnd',allowance_end,'cancelAtPeriodEnd',coalesce(paid and cancel_at_period_end,false),
  'used',(select count(*) from reader_guide_allowances a where a.user_id=p_user and a.kind=allowance_kind and a.period_start=allowance_start and a.state in ('reserved','completed')))
 from allowance;
$$;

create or replace function public.confirm_reader_guide(p_user uuid,p_id uuid,p_length text) returns uuid language plpgsql security invoker set search_path=public as $$
declare g reading_guides; s reader_subscriptions; n integer; cap integer; allowance_kind text; starts timestamptz; ends timestamptz;
begin
 if p_length not in ('short','standard','long') then raise exception 'INVALID_LENGTH'; end if;
 -- Free accounts have no subscription row to lock. Serialize both tiers by account.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,825));
 select * into s from reader_subscriptions where user_id=p_user for update;
 select * into g from reading_guides where id=p_id and user_id=p_user for update;
 if not found then raise exception 'GUIDE_NOT_FOUND'; end if;
 if g.status in ('composing','ready') then return g.id; end if;
 if g.status<>'awaiting_confirmation' then raise exception 'NOT_READY'; end if;
 if s.status='active' and s.period_start<=now() and s.period_end>now() then
  allowance_kind:='subscription';cap:=30;starts:=s.period_start;ends:=s.period_end;
 else
  allowance_kind:='free';cap:=3;starts:=date_trunc('month',now() at time zone 'UTC') at time zone 'UTC';ends:=(starts at time zone 'UTC'+interval '1 month') at time zone 'UTC';
 end if;
 select count(*) into n from reader_guide_allowances where user_id=p_user and kind=allowance_kind and period_start=starts and state in ('reserved','completed');
 if n>=cap then
  if allowance_kind='free' then raise exception 'FREE_GUIDE_LIMIT';else raise exception 'GUIDE_LIMIT';end if;
 end if;
 insert into reader_guide_allowances(user_id,period_start,period_end,guide_id,state,kind) values(p_user,starts,ends,g.id,'reserved',allowance_kind);
 update reading_guides set status='composing',length=p_length,attempts=0,updated_at=now() where id=g.id;
 return g.id;
end $$;
-- Existing RLS and service_role-only grants remain unchanged. The existing settle
-- trigger releases failed/canceled reservations and retains completed usage.
