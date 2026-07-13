create table if not exists public.book_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  author text not null check (char_length(author) between 1 and 200),
  note text not null default '' check (char_length(note) <= 1000),
  requester_email text check (requester_email is null or char_length(requester_email) <= 320),
  source_path text not null default '/books/' check (char_length(source_path) <= 200),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

alter table public.book_requests enable row level security;

revoke all on table public.book_requests from anon, authenticated;
grant insert on table public.book_requests to anon, authenticated;
grant select, insert, update, delete on table public.book_requests to service_role;

drop policy if exists "Anyone can submit a pending book request" on public.book_requests;
create policy "Anyone can submit a pending book request"
  on public.book_requests
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and (
      ((select auth.uid()) is null and user_id is null)
      or user_id = (select auth.uid())
    )
  );
