-- Original text stays in book_processing_jobs/private-books. Guides store recipes only.
create table public.reading_guides (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 request_key uuid not null, question text not null check(length(question) between 3 and 2000),
 status text not null default 'scanning' check(status in ('scanning','proposing','awaiting_confirmation','composing','ready','gap','failed')),
 length text check(length in ('short','standard','long')), book_ids uuid[] not null default '{}',
 progress jsonb not null default '{}', proposal jsonb, guide jsonb, error text,
 position integer not null default 0 check(position>=0), completed boolean not null default false,
 attempts integer not null default 0, lease_token uuid, lease_until timestamptz,
 next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,request_key)
);
alter table public.reading_guides enable row level security;
create policy "Read own guides" on public.reading_guides for select to authenticated using((select auth.uid())=user_id);
revoke all on public.reading_guides from anon,authenticated;
grant select on public.reading_guides to authenticated;
grant all on public.reading_guides to service_role;
create index reading_guides_queue on public.reading_guides(next_attempt_at,created_at) where status in ('scanning','proposing','composing');
create function public.claim_reading_guide() returns public.reading_guides language plpgsql security invoker set search_path=public as $$
declare result public.reading_guides;
begin
 perform pg_advisory_xact_lock(726310066);
 update public.reading_guides set status='failed',error='Reading generation stopped. Please try a new reading.',lease_token=null,lease_until=null where status in ('scanning','proposing','composing') and attempts>=3 and (lease_until is null or lease_until<now());
 if (select count(*) from public.reading_guides where lease_until>now())>=2 then return null; end if;
 select * into result from public.reading_guides g where status in ('scanning','proposing','composing') and next_attempt_at<=now() and attempts<3 and (lease_until is null or lease_until<now()) and not exists(select 1 from public.reading_guides busy where busy.user_id=g.user_id and busy.lease_until>now()) order by next_attempt_at,created_at for update skip locked limit 1;
 if not found then return null; end if;
 update public.reading_guides set lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',attempts=attempts+1 where id=result.id returning * into result;
 return result;
end; $$;
revoke all on function public.claim_reading_guide() from public,anon,authenticated;
grant execute on function public.claim_reading_guide() to service_role;
create table public.reading_request_limits(user_id uuid primary key references auth.users(id) on delete cascade, day date not null default current_date, requests integer not null default 0);
alter table public.reading_request_limits enable row level security;
revoke all on public.reading_request_limits from anon,authenticated;
grant all on public.reading_request_limits to service_role;
create function public.consume_reading_request(p_user uuid) returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;
begin
 insert into public.reading_request_limits(user_id,day,requests) values(p_user,current_date,1) on conflict(user_id) do update set day=current_date, requests=case when reading_request_limits.day=current_date then reading_request_limits.requests+1 else 1 end returning requests into n;
 return n<=10;
end; $$;
revoke all on function public.consume_reading_request(uuid) from public,anon,authenticated;
grant execute on function public.consume_reading_request(uuid) to service_role;

-- Isolated guide queue: existing book processing and embedding work are unchanged.
create function public.wake_reading_guides(p_count integer default 1) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare runner text; endpoint text; n integer;
begin
 if not exists(select 1 from public.reading_guides where status in ('scanning','proposing','composing') and next_attempt_at<=now() and (lease_until is null or lease_until<now())) then return; end if;
 select decrypted_secret into runner from vault.decrypted_secrets where name='book_queue_runner';
 select regexp_replace(decrypted_secret,'/book-process$','/reading-guides') into endpoint from vault.decrypted_secrets where name='book_queue_url';
 if runner is null or endpoint is null then raise exception 'Guide queue configuration is missing'; end if;
 for n in 1..least(greatest(p_count,1),2) loop
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||runner),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=180000);
 end loop;
end; $$;
revoke all on function public.wake_reading_guides(integer) from public,anon,authenticated;
grant execute on function public.wake_reading_guides(integer) to service_role;
select cron.schedule('answerwithbooks-reading-guides','* * * * *','select public.wake_reading_guides()');
