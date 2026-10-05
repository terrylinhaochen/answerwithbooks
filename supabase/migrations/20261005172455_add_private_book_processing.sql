-- Full sources and generated artifacts are private to the uploading account.
create table public.book_processing_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source_name text not null check(length(source_name) between 1 and 255),
 source_sha text not null check(source_sha ~ '^[a-f0-9]{64}$'),
 source_text text not null check(length(source_text) between 100 and 1200000),
 title text not null, author text not null default 'Unknown author',
 status text not null default 'uploaded' check(status in ('uploaded','processing','cover','ready','failed')),
 chunks jsonb not null default '[]', cursor integer not null default 0,
 notes jsonb not null default '[]', artifacts jsonb, cover_path text,
 error text, attempts integer not null default 0,
 lease_until timestamptz, lease_token uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,source_sha)
);
alter table public.book_processing_jobs enable row level security;
revoke all on public.book_processing_jobs from anon, authenticated;
grant select on public.book_processing_jobs to authenticated;
grant all on public.book_processing_jobs to service_role;
create policy "Read own book jobs" on public.book_processing_jobs for select to authenticated using ((select auth.uid()) = user_id);
create index book_processing_jobs_user_created on public.book_processing_jobs(user_id,created_at desc);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('private-books','private-books',false,10485760,array['application/pdf','text/plain','text/markdown','application/octet-stream','image/png'])
on conflict(id) do nothing;
create policy "Read own private book files" on storage.objects for select to authenticated using (bucket_id='private-books' and (storage.foldername(name))[1]=(select auth.uid())::text);

create function public.create_book_processing_job(p_user uuid,p_name text,p_sha text,p_text text,p_title text,p_chunks jsonb)
returns public.book_processing_jobs language plpgsql security invoker set search_path = public as $$
declare result public.book_processing_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into result from public.book_processing_jobs where user_id=p_user and source_sha=p_sha;
 if found then return result; end if;
 if (select count(*) from public.book_processing_jobs where user_id=p_user and created_at>now()-interval '1 day')>=3 then
  raise exception 'Daily limit reached. Try again tomorrow.';
 end if;
 insert into public.book_processing_jobs(user_id,source_name,source_sha,source_text,title,chunks)
 values(p_user,p_name,p_sha,p_text,p_title,p_chunks) returning * into result;
 return result;
end; $$;
revoke all on function public.create_book_processing_job(uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_book_processing_job(uuid,text,text,text,text,jsonb) to service_role;
