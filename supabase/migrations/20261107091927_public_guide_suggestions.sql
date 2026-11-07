-- Public recommendations do not create guides or store questions. Counters bound model use.
create table public.guide_suggestion_limits (
 bucket text primary key, day date not null, requests integer not null check(requests>=0)
);
alter table public.guide_suggestion_limits enable row level security;
revoke all on public.guide_suggestion_limits from public,anon,authenticated;
grant all on public.guide_suggestion_limits to service_role;
create function public.consume_guide_suggestion(p_bucket text) returns boolean
language plpgsql security invoker set search_path=public as $$
declare personal integer; total integer;
begin
 if p_bucket !~ '^[a-f0-9]{64}$' then return false; end if;
 perform pg_advisory_xact_lock(726310068);
 delete from guide_suggestion_limits where day<current_date-1;
 select requests into personal from guide_suggestion_limits where bucket=p_bucket and day=current_date;
 select requests into total from guide_suggestion_limits where bucket='global' and day=current_date;
 if coalesce(personal,0)>=30 or coalesce(total,0)>=500 then return false; end if;
 insert into guide_suggestion_limits(bucket,day,requests) values(p_bucket,current_date,1),('global',current_date,1)
 on conflict(bucket) do update set day=current_date,requests=case when guide_suggestion_limits.day=current_date then guide_suggestion_limits.requests+1 else 1 end;
 return true;
end $$;
revoke all on function public.consume_guide_suggestion(text) from public,anon,authenticated;
grant execute on function public.consume_guide_suggestion(text) to service_role;
