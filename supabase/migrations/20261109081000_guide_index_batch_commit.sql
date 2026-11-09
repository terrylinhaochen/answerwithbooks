-- Commit a full embedding batch atomically, with stale-lease protection.
create function public.complete_guide_index(p_rows jsonb) returns integer language plpgsql security invoker set search_path=public,extensions as $$
declare n integer;
begin
 if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>64 then raise exception 'INVALID_INDEX_BATCH';end if;
 update guide_retrieval_entries e set embedding=(r.value->>'embedding')::extensions.vector(512),lease_token=null,lease_until=null
 from jsonb_array_elements(p_rows) r(value)
 where e.id=(r.value->>'id')::uuid and e.lease_token=(r.value->>'lease')::uuid;
 get diagnostics n=row_count;return n;
end; $$;
create or replace function public.claim_guide_index() returns setof public.guide_retrieval_entries language plpgsql security invoker set search_path=public as $$
declare token uuid=gen_random_uuid();
begin
 perform pg_advisory_xact_lock(726310067);
 if (select count(distinct lease_token) from guide_retrieval_entries where lease_until>now())>=4 then return;end if;
 return query update guide_retrieval_entries set lease_token=token,lease_until=now()+interval '2 minutes',attempts=attempts+1 where id in(
 select id from guide_retrieval_entries where embedding is null and attempts<5 and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by next_attempt_at,id for update skip locked limit 64) returning *;
end; $$;
revoke all on function public.complete_guide_index(jsonb) from public,anon,authenticated;
grant execute on function public.complete_guide_index(jsonb) to service_role;
