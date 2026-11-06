-- Separate cover state: illustration must never block a finished reading.
alter table public.reading_guides
 add column cover_status text not null default 'none' check(cover_status in ('none','pending','ready','failed')),
 add column cover_path text,
 add column cover_design jsonb,
 add column cover_usage jsonb;
create index reading_guides_pending_covers on public.reading_guides(next_attempt_at) where status='ready' and cover_status='pending';
create or replace function public.claim_reading_guide() returns public.reading_guides language plpgsql security invoker set search_path=public as $$
declare result public.reading_guides;
begin
 perform pg_advisory_xact_lock(726310066);
 update public.reading_guides set status='failed',error='Reading generation stopped. Please try a new reading.',lease_token=null,lease_until=null where status in ('scanning','proposing','composing') and attempts>=3 and (lease_until is null or lease_until<now());
 update public.reading_guides set cover_status='failed',lease_token=null,lease_until=null where status='ready' and cover_status='pending' and attempts>=2 and (lease_until is null or lease_until<now());
 if (select count(*) from public.reading_guides where lease_until>now())>=2 then return null; end if;
 select * into result from public.reading_guides g where ((status in ('scanning','proposing','composing') and attempts<3) or (status='ready' and cover_status='pending' and attempts<2)) and next_attempt_at<=now() and (lease_until is null or lease_until<now()) and not exists(select 1 from public.reading_guides busy where busy.user_id=g.user_id and busy.lease_until>now()) order by next_attempt_at,created_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.reading_guides set lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1 where id=result.id returning * into result;
 return result;
end; $$;

create or replace function public.wake_reading_guides(p_count integer default 1) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare runner text; endpoint text; n integer;
begin
 if not exists(select 1 from public.reading_guides where (status in ('scanning','proposing','composing') or (status='ready' and cover_status='pending')) and next_attempt_at<=now() and (lease_until is null or lease_until<now())) then return; end if;
 select decrypted_secret into runner from vault.decrypted_secrets where name='book_queue_runner';
 select regexp_replace(decrypted_secret,'/book-process$','/reading-guides') into endpoint from vault.decrypted_secrets where name='book_queue_url';
 if runner is null or endpoint is null then raise exception 'Guide queue configuration is missing'; end if;
 for n in 1..least(greatest(p_count,1),2) loop
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||runner),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=180000);
 end loop;
end; $$;
