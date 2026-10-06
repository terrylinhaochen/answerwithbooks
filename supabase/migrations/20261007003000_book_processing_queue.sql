-- Separate jobs per source. Only server code can enqueue, claim or change progress.
alter table public.book_processing_jobs add column run_state text not null default 'manual'
 check (run_state in ('manual','staging','queued','paused','complete','failed'));
alter table public.book_processing_jobs add column options jsonb not null default '{"mode":"full","depth":"study","purpose":"apply"}';
alter table public.book_processing_jobs add column analysis jsonb;
alter table public.book_processing_jobs add column next_attempt_at timestamptz not null default now();
alter table public.book_processing_jobs drop constraint book_processing_jobs_status_check;
alter table public.book_processing_jobs add constraint book_processing_jobs_status_check check(status in ('uploaded','processing','analyzed','cover','ready','failed'));
create index book_processing_jobs_queue on public.book_processing_jobs(next_attempt_at,created_at) where run_state='queued';

create or replace function public.create_book_processing_job(p_user uuid,p_name text,p_sha text,p_text text,p_title text,p_chunks jsonb)
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare result public.book_processing_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into result from public.book_processing_jobs where user_id=p_user and source_sha=p_sha;
 if found then return result; end if;
 if (select count(*) from public.book_processing_jobs where user_id=p_user and created_at>now()-interval '1 day')>=10 then
  raise exception 'Daily limit reached. Try again tomorrow.';
 end if;
 insert into public.book_processing_jobs(user_id,source_name,source_sha,source_text,title,chunks)
 values(p_user,p_name,p_sha,p_text,p_title,p_chunks) returning * into result;
 return result;
end; $$;

create function public.claim_book_processing_job(p_id uuid default null,p_user uuid default null)
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare result public.book_processing_jobs;
begin
 -- Serialize the capacity check with claims, including manual legacy clients.
 perform pg_advisory_xact_lock(726310065);
 update public.book_processing_jobs set run_state='failed',error=coalesce(error,'Processing stopped after repeated interruptions. Retry to resume your saved progress.')
 where run_state='queued' and attempts>=5 and (lease_until is null or lease_until<now());
 if (select count(*) from public.book_processing_jobs where lease_until>now())>=4 then return null; end if;
 select j.* into result from public.book_processing_jobs j
 where (p_id is null and j.run_state='queued' or p_id=j.id and p_user=j.user_id and j.run_state in ('queued','manual'))
 and j.status not in ('ready','analyzed') and j.next_attempt_at<=now() and j.attempts<5
 and (j.lease_until is null or j.lease_until<now())
 and (select count(*) from public.book_processing_jobs active where active.user_id=j.user_id and active.lease_until>now())<2
 order by j.next_attempt_at,j.created_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.book_processing_jobs set lease_token=gen_random_uuid(),lease_until=now()+interval '140 seconds',attempts=attempts+1,updated_at=now()
 where id=result.id returning * into result;
 return result;
end; $$;
revoke all on function public.claim_book_processing_job(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_book_processing_job(uuid,uuid) to service_role;

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
-- Secrets are provisioned separately into Vault and the Edge Function environment.
-- No source text, user token or service-role key is embedded in the cron command.
create function public.wake_book_processing(p_count integer default 1) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare runner text; endpoint text; n integer;
begin
 if not exists(select 1 from public.book_processing_jobs where run_state='queued' and next_attempt_at<=now() and (lease_until is null or lease_until<now())) then return; end if;
 select decrypted_secret into runner from vault.decrypted_secrets where name='book_queue_runner';
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='book_queue_url';
 if runner is null or endpoint is null then return; end if;
 for n in 1..least(greatest(p_count,1),4) loop
  perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||runner),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=180000);
 end loop;
end; $$;
revoke all on function public.wake_book_processing(integer) from public,anon,authenticated;
grant execute on function public.wake_book_processing(integer) to service_role;
select cron.schedule('answerwithbooks-processing','* * * * *','select public.wake_book_processing(4)');
