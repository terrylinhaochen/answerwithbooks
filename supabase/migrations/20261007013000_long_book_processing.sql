-- Large extracted sources use private Storage, not a large Edge Function JSON body.
alter table public.book_processing_jobs drop constraint book_processing_jobs_source_text_check;
alter table public.book_processing_jobs add constraint book_processing_jobs_source_text_check check(length(source_text) between 100 and 6000000);
alter table public.book_processing_jobs add column source_import jsonb;
alter table public.book_processing_jobs add column overview_notes jsonb not null default '[]';
