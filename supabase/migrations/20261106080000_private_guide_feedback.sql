-- Guide feedback follows the existing owner's private guide permissions.
alter table public.reading_guides add column if not exists feedback jsonb;
