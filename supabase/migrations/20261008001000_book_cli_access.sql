-- Browser-authorized, book-only CLI sessions. Raw credentials never enter the database.
create table public.book_cli_pairings (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 user_code text unique not null,
 requester_hash text not null,
 user_id uuid references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '10 minutes'
);
create table public.book_cli_sessions (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '30 days'
);
alter table public.book_cli_pairings enable row level security;
alter table public.book_cli_sessions enable row level security;
revoke all on public.book_cli_pairings,public.book_cli_sessions from anon,authenticated;
grant all on public.book_cli_pairings,public.book_cli_sessions to service_role;
create index book_cli_pairings_requester on public.book_cli_pairings(requester_hash,created_at);
create index book_cli_sessions_owner on public.book_cli_sessions(user_id);

create function public.start_book_cli_login(p_hash text,p_code text,p_requester text)
returns timestamptz language plpgsql security definer set search_path=public as $$
declare expiry timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('book-cli:'||p_requester,0));
 delete from book_cli_pairings where expires_at < now();
 delete from book_cli_sessions where expires_at < now();
 if (select count(*) from book_cli_pairings where requester_hash=p_requester and created_at>now()-interval '10 minutes')>=5 then
  raise exception 'Too many sign-in attempts. Try again in ten minutes.';
 end if;
 insert into book_cli_pairings(token_hash,user_code,requester_hash) values(p_hash,p_code,p_requester) returning expires_at into expiry;
 return expiry;
end $$;

create function public.approve_book_cli_login(p_code text,p_user uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare changed integer;
begin
 update book_cli_pairings set user_id=p_user where user_code=p_code and expires_at>now() and user_id is null;
 get diagnostics changed=row_count;
 return changed=1;
end $$;

create function public.poll_book_cli_login(p_hash text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare pairing book_cli_pairings; session book_cli_sessions;
begin
 perform pg_advisory_xact_lock(hashtextextended('book-cli-token:'||p_hash,0));
 select * into session from book_cli_sessions where token_hash=p_hash and expires_at>now();
 if found then return jsonb_build_object('status','authorized','user_id',session.user_id,'expires_at',session.expires_at); end if;
 select * into pairing from book_cli_pairings where token_hash=p_hash for update;
 if not found or pairing.expires_at<=now() then return jsonb_build_object('status','expired'); end if;
 if pairing.user_id is null then return jsonb_build_object('status','pending'); end if;
 insert into book_cli_sessions(token_hash,user_id) values(p_hash,pairing.user_id) returning * into session;
 delete from book_cli_pairings where token_hash=p_hash;
 return jsonb_build_object('status','authorized','user_id',session.user_id,'expires_at',session.expires_at);
end $$;
revoke all on function public.start_book_cli_login(text,text,text),public.approve_book_cli_login(text,uuid),public.poll_book_cli_login(text) from public,anon,authenticated;
grant execute on function public.start_book_cli_login(text,text,text),public.approve_book_cli_login(text,uuid),public.poll_book_cli_login(text) to service_role;

-- Serialize revocation against an in-flight approval poll.
create function public.revoke_book_cli_login(p_hash text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('book-cli-token:'||p_hash,0));
 delete from book_cli_sessions where token_hash=p_hash;
 delete from book_cli_pairings where token_hash=p_hash;
 return true;
end $$;
revoke all on function public.revoke_book_cli_login(text) from public,anon,authenticated;
grant execute on function public.revoke_book_cli_login(text) to service_role;
