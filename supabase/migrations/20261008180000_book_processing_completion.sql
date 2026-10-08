-- Keep model-review feedback private, and make a completed text package usable
-- independently of its optional illustration. Existing packages are preserved.
alter table public.book_processing_jobs add column section_feedback jsonb not null default '{}';
alter table public.book_processing_jobs add column generation_feedback jsonb;
alter table public.book_processing_jobs add column cover_status text not null default 'none' check(cover_status in ('none','pending','ready','failed'));
alter table public.book_processing_jobs add column cover_attempts integer not null default 0;
alter table public.book_processing_jobs add column cover_error text;
alter table public.book_processing_jobs add column cover_next_attempt_at timestamptz not null default now();
alter table public.book_processing_jobs add column cover_lease_until timestamptz;
alter table public.book_processing_jobs add column cover_lease_token uuid;
update public.book_processing_jobs set cover_status='ready' where cover_path is not null;
update public.book_processing_jobs set status='ready',run_state='complete',cover_status='pending',error=null,lease_until=null,lease_token=null where status='cover' and artifacts is not null and (lease_until is null or lease_until<now());
create index book_covers_pending on public.book_processing_jobs(cover_next_attempt_at) where cover_status='pending';
create table public.book_model_usage (
 id uuid primary key default gen_random_uuid(),
 job_id uuid not null references public.book_processing_jobs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 section integer, phase text not null, usage jsonb not null,
 created_at timestamptz not null default now()
);
create index book_usage_job on public.book_model_usage(user_id,job_id,created_at);
alter table public.book_model_usage enable row level security;
revoke all on public.book_model_usage from public,anon,authenticated;
grant all on public.book_model_usage to service_role;

create function public.claim_book_cover() returns public.book_processing_jobs
language plpgsql security invoker set search_path=public as $$
declare result public.book_processing_jobs;
begin
 perform pg_advisory_xact_lock(726310065);
 update public.book_processing_jobs set cover_status='failed',cover_error=coalesce(cover_error,'Cover stopped after repeated interruptions. Retry the cover; your book and skill are ready.')
 where cover_status='pending' and cover_attempts>=5 and (cover_lease_until is null or cover_lease_until<now());
 if (select count(*) from public.book_processing_jobs where cover_lease_until>now())>=2 then return null; end if;
 select j.* into result from public.book_processing_jobs j
 where j.status='ready' and j.run_state='complete' and j.cover_status='pending' and j.cover_attempts<5 and j.cover_next_attempt_at<=now()
 and (j.cover_lease_until is null or j.cover_lease_until<now())
 and not exists(select 1 from public.book_processing_jobs active where active.user_id=j.user_id and active.cover_lease_until>now())
 order by j.cover_next_attempt_at,j.created_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.book_processing_jobs set cover_lease_token=gen_random_uuid(),cover_lease_until=now()+interval '140 seconds',cover_attempts=cover_attempts+1,updated_at=now() where id=result.id returning * into result;
 return result;
end; $$;
revoke all on function public.claim_book_cover() from public,anon,authenticated;
grant execute on function public.claim_book_cover() to service_role;

create or replace function public.wake_book_processing(p_count integer default 1) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare runner text; endpoint text; n integer;
begin
 if not exists(select 1 from public.book_processing_jobs where
  (run_state='queued' and next_attempt_at<=now() and (lease_until is null or lease_until<now())) or
  (status='ready' and run_state='complete' and cover_status='pending' and cover_next_attempt_at<=now() and (cover_lease_until is null or cover_lease_until<now()))) then return; end if;
 select decrypted_secret into runner from vault.decrypted_secrets where name='book_queue_runner';
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='book_queue_url';
 if runner is null or endpoint is null then return; end if;
 for n in 1..least(greatest(p_count,1),4) loop
  perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||runner),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=180000);
 end loop;
end; $$;
