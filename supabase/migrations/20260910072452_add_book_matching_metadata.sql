-- Confirmed book identity from a title, cover image, or PDF. Source files stay on-device.
alter table public.book_requests
  add column if not exists input_kind text not null default 'name' check (input_kind in ('name', 'image', 'pdf')),
  add column if not exists external_id text check (external_id is null or char_length(external_id) <= 100),
  add column if not exists matched_book_slug text check (matched_book_slug is null or char_length(matched_book_slug) <= 200);

grant select on public.book_requests to authenticated;
drop policy if exists "Readers can view their own book additions" on public.book_requests;
create policy "Readers can view their own book additions"
  on public.book_requests for select to authenticated
  using ((select auth.uid()) = user_id);
