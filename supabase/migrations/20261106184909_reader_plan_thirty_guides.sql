-- Increase the monthly allowance without changing price or existing usage.
create or replace function public.reader_plan(p_user uuid) returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('priceCents',2400,'limit',30,'active',coalesce(s.status='active' and s.period_start<=now() and s.period_end>now(),false),
 'status',coalesce(s.status,'none'),'periodEnd',s.period_end,'cancelAtPeriodEnd',coalesce(s.cancel_at_period_end,false),
 'used',(select count(*) from reader_guide_allowances a where a.user_id=p_user and a.period_start=s.period_start and a.state in ('reserved','completed')))
 from (select 1) seed left join reader_subscriptions s on s.user_id=p_user;
$$;
create or replace function public.confirm_reader_guide(p_user uuid,p_id uuid,p_length text) returns uuid language plpgsql security invoker set search_path=public as $$
declare g reading_guides; s reader_subscriptions; n integer;
begin
 if p_length not in ('short','standard','long') then raise exception 'INVALID_LENGTH'; end if;
 -- Serialize all confirmations and entitlement changes for this subscriber.
 select * into s from reader_subscriptions where user_id=p_user for update;
 select * into g from reading_guides where id=p_id and user_id=p_user for update;
 if not found then raise exception 'GUIDE_NOT_FOUND'; end if;
 if g.status in ('composing','ready') then return g.id; end if;
 if g.status<>'awaiting_confirmation' then raise exception 'NOT_READY'; end if;
 if s.status is distinct from 'active' or s.period_start is null or s.period_start>now() or s.period_end is null or s.period_end<=now() then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
 select count(*) into n from reader_guide_allowances where user_id=p_user and period_start=s.period_start and state in ('reserved','completed');
 if n>=30 then raise exception 'GUIDE_LIMIT'; end if;
 insert into reader_guide_allowances(user_id,period_start,period_end,guide_id,state) values(p_user,s.period_start,s.period_end,g.id,'reserved');
 update reading_guides set status='composing',length=p_length,attempts=0,updated_at=now() where id=g.id;
 return g.id;
end $$;
