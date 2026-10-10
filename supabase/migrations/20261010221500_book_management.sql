-- Archiving removes a book from the active shelf and retrieval without deleting it.
alter table public.book_processing_jobs add column archived_at timestamptz, add column deletion_pending boolean not null default false;
alter table public.book_processing_jobs add constraint book_archived_paused check (archived_at is null or run_state='paused'), add constraint book_deletion_archived check (not deletion_pending or archived_at is not null);
create index book_active_shelf on public.book_processing_jobs(user_id,created_at desc) where is_current and archived_at is null;
create function public.manage_private_book(p_user uuid,p_id uuid,p_action text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare target public.book_processing_jobs; item public.book_processing_jobs; ids jsonb;
begin
 if p_action not in ('archive','restore','prepare-delete','finish-delete') then raise exception 'Invalid management action.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into target from book_processing_jobs where id=p_id and user_id=p_user for update;
 if not found then raise exception 'Book not found.'; end if;
 for item in select * from book_processing_jobs where user_id=p_user and book_id=target.book_id order by revision desc for update loop
  if item.lease_until>now() or item.cover_lease_until>now() or item.run_state='queued' or item.source_import->>'state' in ('queued','processing') then
   raise exception 'Pause active processing and wait for its current step before managing this book.';
  end if;
  if item.billing->>'state' in ('held','reconciliation') then raise exception 'Finish or cancel the conversion and settle usage before managing this book.'; end if;
 end loop;
 if exists(select 1 from book_processing_jobs where user_id=p_user and book_id=target.book_id and deletion_pending) and p_action in ('archive','restore') then raise exception 'Deletion is in progress. Retry Delete to finish cleanup.'; end if;
 if p_action='finish-delete' then
  if exists(select 1 from book_processing_jobs where user_id=p_user and book_id=target.book_id and (not deletion_pending or archived_at is null or run_state<>'paused')) then raise exception 'Prepare deletion first.'; end if;
  for item in select * from book_processing_jobs where user_id=p_user and book_id=target.book_id order by revision desc loop
   delete from book_processing_jobs where id=item.id;
  end loop;
  return jsonb_build_object('deleted',true);
 elsif p_action='restore' then
  update book_processing_jobs set archived_at=null,run_state=case when status in ('ready','analyzed') then 'complete' else 'paused' end,updated_at=now()
   where user_id=p_user and book_id=target.book_id and archived_at is not null;
 else
  update book_processing_jobs set archived_at=coalesce(archived_at,now()),deletion_pending=(p_action='prepare-delete'),run_state='paused',updated_at=now()
   where user_id=p_user and book_id=target.book_id;
 end if;
 select jsonb_agg(jsonb_build_object('id',id,'revision',revision) order by revision desc) into ids from book_processing_jobs where user_id=p_user and book_id=target.book_id;
 return jsonb_build_object('book_id',target.book_id,'revisions',ids,'archived',p_action<>'restore');
end; $$;
revoke all on function public.manage_private_book(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.manage_private_book(uuid,uuid,text) to service_role;
