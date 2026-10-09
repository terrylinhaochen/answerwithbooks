-- Compact, owner-scoped library metadata. Never infer that an upload is a whole book.
alter table public.book_processing_jobs
 add column source_text_sha text,
 add column source_line_count integer not null default 0,
 add column total_sections integer not null default 0,
 add column last_error text,
 add column last_error_at timestamptz;

create function public.refresh_book_library_metadata() returns trigger
language plpgsql security invoker set search_path=public,pg_catalog as $$
begin
 if tg_op='INSERT' or new.source_text is distinct from old.source_text or new.chunks is distinct from old.chunks then
  new.total_sections=jsonb_array_length(new.chunks);
  -- Empty chunks denote a placeholder, not a verified source identity.
  new.source_text_sha=case when new.total_sections>0 then encode(sha256(convert_to(new.source_text,'UTF8')),'hex') end;
  new.source_line_count=case when new.total_sections>0 then length(new.source_text)-length(replace(new.source_text,E'\n',''))+1 else 0 end;
 end if;
 if new.error is not null and new.run_state in ('failed','paused') then
  if tg_op='INSERT' or new.error is distinct from old.error or new.run_state is distinct from old.run_state then
   new.last_error=new.error;new.last_error_at=now();
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.refresh_book_library_metadata() from public,anon,authenticated;
create trigger refresh_book_library_metadata before insert or update on public.book_processing_jobs
for each row execute function public.refresh_book_library_metadata();
update public.book_processing_jobs set
 total_sections=jsonb_array_length(chunks),
 source_text_sha=case when jsonb_array_length(chunks)>0 then encode(sha256(convert_to(source_text,'UTF8')),'hex') end,
 source_line_count=case when jsonb_array_length(chunks)>0 then length(source_text)-length(replace(source_text,E'\n',''))+1 else 0 end,
 last_error=case when run_state in ('failed','paused') then error end,
 last_error_at=case when run_state in ('failed','paused') and error is not null then updated_at end;
create index book_extracted_source_cache on public.book_processing_jobs(user_id,source_text_sha) where source_text_sha is not null;
