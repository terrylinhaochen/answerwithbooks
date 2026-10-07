-- Stable account books, immutable prior revisions, and explicit activation.
alter table public.book_processing_jobs
 add column book_id uuid,
 add column parent_job_id uuid references public.book_processing_jobs(id) on delete restrict,
 add column revision integer not null default 1 check(revision > 0),
 add column revision_kind text not null default 'base' check(revision_kind in ('base','append','replace')),
 add column is_current boolean not null default true,
 add column source_manifest jsonb not null default '[]',
 add column skill_summary jsonb not null default '{}';
update public.book_processing_jobs set book_id=id;
alter table public.book_processing_jobs alter column book_id set not null;
alter table public.book_processing_jobs drop constraint book_processing_jobs_user_id_source_sha_key;
create unique index book_current_revision on public.book_processing_jobs(user_id,book_id) where is_current;
create unique index book_revision_number on public.book_processing_jobs(user_id,book_id,revision);
create index book_source_cache on public.book_processing_jobs(user_id,source_sha);

create function public.initialize_book_identity() returns trigger language plpgsql set search_path=public as $$
begin
 if new.book_id is null then new.book_id=new.id; end if;
 return new;
end; $$;
create trigger initialize_book_identity before insert on public.book_processing_jobs
for each row execute function public.initialize_book_identity();

-- Extract the existing compiler's JSON frontmatter values without regeneration.
create function public.book_metadata_value(document text, field text) returns jsonb
language plpgsql immutable set search_path=public as $$
declare value text;
begin
 value=substring(document from '(?m)^'||field||': ([^\n]+)$');
 return value::jsonb;
exception when others then return null;
end; $$;
update public.book_processing_jobs set skill_summary=jsonb_strip_nulls(jsonb_build_object(
 'one_liner',public.book_metadata_value(artifacts->>'book.md','oneLiner'),
 'read_if',public.book_metadata_value(artifacts->>'book.md','readIf'),
 'tags',public.book_metadata_value(artifacts->>'book.md','tags')))
where artifacts is not null;
drop function public.book_metadata_value(text,text);

create or replace function public.create_book_processing_job(p_user uuid,p_name text,p_sha text,p_text text,p_title text,p_chunks jsonb)
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare result public.book_processing_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into result from public.book_processing_jobs where user_id=p_user and source_sha=p_sha and revision_kind<>'append'
 order by is_current desc,created_at desc limit 1;
 if found then return result; end if;
 if (select count(*) from public.book_processing_jobs where user_id=p_user and created_at>now()-interval '1 day')>=10 then
  raise exception 'Daily limit reached. Try again tomorrow.';
 end if;
 insert into public.book_processing_jobs(user_id,source_name,source_sha,source_text,title,chunks)
 values(p_user,p_name,p_sha,p_text,p_title,p_chunks) returning * into result;
 return result;
end; $$;

create function public.create_book_revision(p_user uuid,p_parent uuid,p_name text,p_sha text,p_kind text,p_options jsonb)
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare parent public.book_processing_jobs; result public.book_processing_jobs; next_revision integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into parent from public.book_processing_jobs where id=p_parent and user_id=p_user for update;
 if not found or not parent.is_current or parent.status<>'ready' then
  raise exception 'Choose the current, ready revision of your own book.';
 end if;
 if p_kind not in ('append','replace') then raise exception 'Choose append or replace.'; end if;
 if p_kind='append' and (p_sha=parent.source_sha or exists(select 1 from jsonb_array_elements(parent.source_manifest) source where source->>'sha'=p_sha)) then
  raise exception 'This source is already part of this book.';
 end if;
 select * into result from public.book_processing_jobs where user_id=p_user and book_id=parent.book_id
 and parent_job_id=parent.id and revision>parent.revision order by revision desc limit 1;
 if found then
  if result.source_sha=p_sha and result.revision_kind=p_kind and result.options=p_options then return result; end if;
  raise exception 'Review or delete the pending revision before adding another source.';
 end if;
 if (select count(*) from public.book_processing_jobs where user_id=p_user and created_at>now()-interval '1 day')>=10 then
  raise exception 'Daily limit reached. Try again tomorrow.';
 end if;
 select coalesce(max(revision),0)+1 into next_revision from public.book_processing_jobs where user_id=p_user and book_id=parent.book_id;
 insert into public.book_processing_jobs(user_id,book_id,parent_job_id,revision,revision_kind,is_current,source_name,source_sha,source_text,title,author,options,run_state)
 values(p_user,parent.book_id,parent.id,next_revision,p_kind,false,p_name,p_sha,repeat('Source upload pending. ',6),parent.title,parent.author,p_options,'staging') returning * into result;
 return result;
end; $$;
revoke all on function public.create_book_revision(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_book_revision(uuid,uuid,text,text,text,jsonb) to service_role;

create function public.activate_book_revision(p_user uuid,p_id uuid)
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare candidate public.book_processing_jobs; active public.book_processing_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into candidate from public.book_processing_jobs where id=p_id and user_id=p_user for update;
 if not found or candidate.status<>'ready' or candidate.artifacts is null then raise exception 'Finish processing and review this revision first.'; end if;
 if candidate.is_current then return candidate; end if;
 select * into active from public.book_processing_jobs where user_id=p_user and book_id=candidate.book_id and is_current for update;
 if not found or active.id<>candidate.parent_job_id then raise exception 'The current revision changed. Start from the current book.'; end if;
 update public.book_processing_jobs set is_current=false,updated_at=now() where id=active.id;
 update public.book_processing_jobs set is_current=true,updated_at=now() where id=candidate.id returning * into candidate;
 return candidate;
end; $$;
revoke all on function public.activate_book_revision(uuid,uuid) from public,anon,authenticated;
grant execute on function public.activate_book_revision(uuid,uuid) to service_role;
