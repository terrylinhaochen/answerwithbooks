create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  content_type text not null check (content_type in ('book', 'answer')),
  content_slug text not null check (char_length(content_slug) between 1 and 200),
  content_title text not null check (char_length(content_title) between 1 and 300),
  sentiment text not null check (sentiment in ('helpful', 'not_helpful')),
  comment text not null default '' check (char_length(comment) <= 2000),
  source_path text not null check (char_length(source_path) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists content_feedback_user_id_idx on public.content_feedback (user_id);
create index if not exists content_feedback_content_idx on public.content_feedback (content_type, content_slug, created_at desc);

alter table public.content_feedback enable row level security;

revoke all on table public.content_feedback from anon, authenticated;
grant insert on table public.content_feedback to anon, authenticated;
grant select, insert, update, delete on table public.content_feedback to service_role;

drop policy if exists "Anyone can submit content feedback" on public.content_feedback;
create policy "Anyone can submit content feedback"
  on public.content_feedback
  for insert
  to anon, authenticated
  with check (
    content_type in ('book', 'answer')
    and sentiment in ('helpful', 'not_helpful')
    and (
      ((select auth.uid()) is null and user_id is null)
      or user_id = (select auth.uid())
    )
  );
