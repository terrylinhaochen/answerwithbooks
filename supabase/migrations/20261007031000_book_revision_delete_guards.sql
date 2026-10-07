-- Delete first pauses a revision under a row compare-and-swap. Revisions and
-- activation must not race that pause before private Storage cleanup.
update public.book_processing_jobs set run_state='complete' where status='ready' and run_state='manual';

create or replace function public.create_book_revision(p_user uuid,p_parent uuid,p_name text,p_sha text,p_kind text,p_options jsonb)
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare parent public.book_processing_jobs; result public.book_processing_jobs; next_revision integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into parent from public.book_processing_jobs where id=p_parent and user_id=p_user for update;
 if not found or not parent.is_current or parent.status<>'ready' or parent.run_state<>'complete' then
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

create or replace function public.activate_book_revision(p_user uuid,p_id uuid)
returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare candidate public.book_processing_jobs; active public.book_processing_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into candidate from public.book_processing_jobs where id=p_id and user_id=p_user for update;
 if not found or candidate.status<>'ready' or candidate.run_state<>'complete' or candidate.artifacts is null then raise exception 'Finish processing and review this revision first.'; end if;
 if candidate.is_current then return candidate; end if;
 select * into active from public.book_processing_jobs where user_id=p_user and book_id=candidate.book_id and is_current for update;
 if not found or active.id<>candidate.parent_job_id then raise exception 'The current revision changed. Start from the current book.'; end if;
 update public.book_processing_jobs set is_current=false,updated_at=now() where id=active.id;
 update public.book_processing_jobs set is_current=true,updated_at=now() where id=candidate.id returning * into candidate;
 return candidate;
end; $$;
revoke all on function public.activate_book_revision(uuid,uuid) from public,anon,authenticated;
grant execute on function public.activate_book_revision(uuid,uuid) to service_role;
