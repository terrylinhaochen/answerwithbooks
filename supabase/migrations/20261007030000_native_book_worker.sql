-- Native extraction stages original files before the provider queue can see them.
-- Use the same lock and capacity accounting as claim_book_processing_job.
create index if not exists book_processing_jobs_native_queue
 on public.book_processing_jobs(next_attempt_at,created_at)
 where run_state='staging' and source_import->>'kind'='native';

create or replace function public.claim_native_book_job()
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare result public.book_processing_jobs;
begin
 perform pg_advisory_xact_lock(726310065);
 update public.book_processing_jobs
 set run_state='failed', source_import=source_import||'{"state":"failed"}'::jsonb,
     error='Native extraction stopped after three attempts. Upload the same file to retry.',
     lease_token=null,lease_until=null,updated_at=now()
 where run_state='staging' and source_import->>'kind'='native'
 and source_import->>'state' in ('queued','processing') and attempts>=3
 and (lease_until is null or lease_until<now());
 if (select count(*) from public.book_processing_jobs where lease_until>now())>=4 then return null; end if;
 select j.* into result from public.book_processing_jobs j
 where j.run_state='staging' and j.status='uploaded'
 and j.source_import->>'kind'='native' and j.source_import->>'state' in ('queued','processing')
 and j.next_attempt_at<=now() and j.attempts<3
 and (j.lease_until is null or j.lease_until<now())
 and (select count(*) from public.book_processing_jobs active where active.user_id=j.user_id and active.lease_until>now())<2
 order by j.next_attempt_at,j.created_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.book_processing_jobs
 set lease_token=gen_random_uuid(),lease_until=now()+interval '15 minutes',attempts=attempts+1,
     source_import=source_import||'{"state":"processing"}'::jsonb,updated_at=now()
 where id=result.id returning * into result;
 return result;
end; $$;
revoke all on function public.claim_native_book_job() from public,anon,authenticated;
grant execute on function public.claim_native_book_job() to service_role;

-- Public health is aggregated by the Edge function, never direct DB access.
create table if not exists public.book_native_worker_health (
 id text primary key check(id='native'), last_seen_at timestamptz not null
);
alter table public.book_native_worker_health enable row level security;
revoke all on public.book_native_worker_health from public,anon,authenticated;
grant select,insert,update on public.book_native_worker_health to service_role;
