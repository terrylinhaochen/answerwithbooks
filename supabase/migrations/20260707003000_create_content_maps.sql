-- Shared content maps and collections.
-- Public maps are readable by everyone; private maps and collections are scoped to the owner.

create table if not exists public.content_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_email text,
  title text not null,
  problem text not null,
  source_note text not null default '',
  topics text[] not null default '{}',
  books text[] not null default '{}',
  answers text[] not null default '{}',
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.content_maps enable row level security;

drop policy if exists "Anyone can read public maps" on public.content_maps;
create policy "Anyone can read public maps"
  on public.content_maps
  for select
  using (visibility = 'public' or auth.uid() = user_id);

drop policy if exists "Users can insert their own maps" on public.content_maps;
create policy "Users can insert their own maps"
  on public.content_maps
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own maps" on public.content_maps;
create policy "Users can update their own maps"
  on public.content_maps
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own maps" on public.content_maps;
create policy "Users can delete their own maps"
  on public.content_maps
  for delete
  using (auth.uid() = user_id);

create table if not exists public.content_map_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_map_id uuid not null references public.content_maps(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, content_map_id)
);

alter table public.content_map_collections enable row level security;

drop policy if exists "Users can read their own map collections" on public.content_map_collections;
create policy "Users can read their own map collections"
  on public.content_map_collections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own map collections" on public.content_map_collections;
create policy "Users can insert their own map collections"
  on public.content_map_collections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own map collections" on public.content_map_collections;
create policy "Users can delete their own map collections"
  on public.content_map_collections
  for delete
  using (auth.uid() = user_id);
