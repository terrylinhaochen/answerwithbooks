-- Reader-chosen privacy for guides. Separate from `visibility`, which records the
-- source scope (shared library vs. the owner's saved books) and drives billing and
-- source lookup. A private guide keeps its source scope but is readable only by its owner.
alter table public.reading_guides add column is_private boolean not null default false;
