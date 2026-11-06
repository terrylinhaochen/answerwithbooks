-- New uploads are explicitly public. Existing rows remain private.
alter table public.book_processing_jobs add column visibility text not null default 'private' check(visibility in ('private','public'));
alter table public.book_processing_jobs add column duplicate_of uuid references public.book_processing_jobs(id) on delete restrict;
alter table public.reading_guides add column visibility text not null default 'private' check(visibility in ('private','public'));

create table public.shared_book_fingerprints (
 kind text not null check(kind in ('file','text')), sha text not null check(sha ~ '^[a-f0-9]{64}$'),
 book_id uuid not null references public.book_processing_jobs(id) on delete restrict,
 primary key(kind,sha)
);
create table public.reader_books (
 user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid not null references public.book_processing_jobs(id) on delete restrict,
 created_at timestamptz not null default now(), primary key(user_id,book_id)
);
create table public.reader_guide_state (
 user_id uuid not null references auth.users(id) on delete cascade,
 guide_id uuid not null references public.reading_guides(id) on delete cascade,
 position integer not null default 0 check(position>=0), completed boolean not null default false,
 feedback jsonb, hidden boolean not null default false, primary key(user_id,guide_id)
);
create table public.reader_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 customer_id text unique not null, subscription_id text unique,
 status text not null default 'none', period_start timestamptz, period_end timestamptz,
 cancel_at_period_end boolean not null default false,
 -- CAS version protects canonical provider readback from slower concurrent webhooks.
 revision bigint not null default 0, updated_at timestamptz not null default now()
);
create table public.reader_subscription_events (id text primary key, processed_at timestamptz not null default now());
create table public.reader_guide_allowances (
 user_id uuid not null references auth.users(id) on delete cascade,
 period_start timestamptz not null, period_end timestamptz not null,
 guide_id uuid primary key, -- intentionally no FK: deleting a finished guide must not refund it
 state text not null check(state in ('reserved','completed','released')),
 created_at timestamptz not null default now()
);
create index reader_guide_period on public.reader_guide_allowances(user_id,period_start,state);

-- All writes and public projections pass through authenticated Edge functions.
do $$ declare t text; begin
 foreach t in array array['shared_book_fingerprints','reader_books','reader_guide_state','reader_subscriptions','reader_subscription_events','reader_guide_allowances'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 end loop; end $$;

create function public.reader_plan(p_user uuid) returns jsonb language sql security invoker set search_path=public as $$
 select jsonb_build_object('priceCents',2400,'limit',20,'active',coalesce(s.status='active' and s.period_start<=now() and s.period_end>now(),false),
 'status',coalesce(s.status,'none'),'periodEnd',s.period_end,'cancelAtPeriodEnd',coalesce(s.cancel_at_period_end,false),
 'used',(select count(*) from reader_guide_allowances a where a.user_id=p_user and a.period_start=s.period_start and a.state in ('reserved','completed')))
 from (select 1) seed left join reader_subscriptions s on s.user_id=p_user;
$$;
create function public.confirm_reader_guide(p_user uuid,p_id uuid,p_length text) returns uuid language plpgsql security invoker set search_path=public as $$
declare g reading_guides; s reader_subscriptions; n integer;
begin
 if p_length not in ('short','standard','long') then raise exception 'INVALID_LENGTH'; end if;
 -- Serialize all confirmations and entitlement changes for this subscriber.
 select * into s from reader_subscriptions where user_id=p_user for update;
 select * into g from reading_guides where id=p_id and user_id=p_user for update;
 if not found then raise exception 'GUIDE_NOT_FOUND'; end if;
 if g.status in ('composing','ready') then return g.id; end if;
 if g.status<>'awaiting_confirmation' then raise exception 'NOT_READY'; end if;
 if s.status is distinct from 'active' or s.period_start is null or s.period_start>now() or s.period_end is null or s.period_end<=now() then raise exception 'SUBSCRIPTION_REQUIRED'; end if;
 select count(*) into n from reader_guide_allowances where user_id=p_user and period_start=s.period_start and state in ('reserved','completed');
 if n>=20 then raise exception 'GUIDE_LIMIT'; end if;
 insert into reader_guide_allowances(user_id,period_start,period_end,guide_id,state) values(p_user,s.period_start,s.period_end,g.id,'reserved');
 update reading_guides set status='composing',length=p_length,attempts=0,updated_at=now() where id=g.id;
 return g.id;
end $$;
create function public.settle_reader_guide() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if TG_OP='DELETE' then update reader_guide_allowances set state='released' where guide_id=old.id and state='reserved'; return old; end if;
 if new.status='ready' then update reader_guide_allowances set state='completed' where guide_id=new.id and state='reserved';
 elsif new.status in ('failed','gap') then update reader_guide_allowances set state='released' where guide_id=new.id and state='reserved'; end if;
 return new;
end $$;
create trigger settle_reader_guide after update of status or delete on public.reading_guides for each row execute function public.settle_reader_guide();

create function public.create_shared_book(p_user uuid,p_name text,p_sha text,p_bytes bigint,p_mode text) returns public.book_processing_jobs language plpgsql security invoker set search_path=public as $$
declare j book_processing_jobs;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,824));
 -- An unverified upload never claims a public fingerprint.
 select * into j from book_processing_jobs where user_id=p_user and source_sha=p_sha and visibility='public' and source_import->>'state'='awaiting_upload' limit 1;
 if found then return j; end if;
 if (select count(*) from book_processing_jobs where user_id=p_user and created_at>now()-interval '1 day')>=10 then raise exception 'UPLOAD_LIMIT'; end if;
 insert into book_processing_jobs(user_id,source_name,source_sha,source_text,title,status,run_state,chunks,visibility,billing_required,options,source_import)
 values(p_user,p_name,p_sha,repeat('Source upload pending. ',6),regexp_replace(p_name,'\.[^.]+$',''),'uploaded','staging','[]','public',false,'{"mode":"reading"}',jsonb_build_object('kind','native','state','awaiting_upload','originalBytes',p_bytes,'extractionMode',p_mode)) returning * into j;
 return j;
end $$;

-- Called only after the server verifies original bytes / the current worker's text.
-- Canonical claims and the queue transition share one transaction.
create function public.claim_shared_book(p_id uuid,p_lease uuid,p_kind text,p_sha text,p_patch jsonb) returns uuid language plpgsql security invoker set search_path=public as $$
declare j book_processing_jobs; canonical uuid;
begin
 select * into j from book_processing_jobs where id=p_id for update;
 if j.visibility is distinct from 'public' or j.lease_token is distinct from p_lease or j.lease_until<=now() or j.lease_until is null then raise exception 'INVALID_LEASE'; end if;
 if p_kind not in ('file','text') then raise exception 'INVALID_KIND'; end if;
 insert into shared_book_fingerprints(kind,sha,book_id) values(p_kind,p_sha,j.id) on conflict do nothing;
 select book_id into canonical from shared_book_fingerprints where kind=p_kind and sha=p_sha;
 if canonical<>j.id then
  update book_processing_jobs set duplicate_of=canonical,run_state='paused',lease_token=null,lease_until=null,source_import=source_import||'{"state":"complete"}',error=null where id=j.id;
  -- File fingerprints and readers must follow the text-level canonical edition too.
  update shared_book_fingerprints set book_id=canonical where book_id=j.id;
  insert into reader_books(user_id,book_id) select user_id,canonical from reader_books where book_id=j.id on conflict do nothing;
  delete from reader_books where book_id=j.id;
 else
  if p_kind='file' then
   update book_processing_jobs set source_import=source_import||'{"state":"queued"}',lease_token=null,lease_until=null,next_attempt_at=now() where id=j.id;
  else
   update book_processing_jobs set source_text=p_patch->>'source_text',chunks=p_patch->'chunks',source_manifest=p_patch->'source_manifest',
    source_import=source_import||(p_patch->'source_import'),status='processing',run_state='queued',attempts=0,lease_token=null,lease_until=null,error=null,next_attempt_at=now() where id=j.id;
  end if;
 end if;
 insert into reader_books(user_id,book_id) values(j.user_id,canonical) on conflict do nothing;
 return canonical;
end $$;

-- Protect shared sources against old owner deletion/archive/revision endpoints.
create function public.protect_shared_book() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if old.visibility='public' and (TG_OP='DELETE' or new.archived_at is distinct from old.archived_at or new.visibility<>'public' or new.is_current is distinct from old.is_current or (old.status='ready' and new.source_text is distinct from old.source_text)) then raise exception 'SHARED_BOOK_IMMUTABLE'; end if;
 if TG_OP='DELETE' then return old; end if; return new;
end $$;
create trigger protect_shared_book before update or delete on public.book_processing_jobs for each row execute function public.protect_shared_book();

revoke all on function public.reader_plan(uuid),public.confirm_reader_guide(uuid,uuid,text),public.settle_reader_guide(),public.create_shared_book(uuid,text,text,bigint,text),public.claim_shared_book(uuid,uuid,text,text,jsonb),public.protect_shared_book() from public,anon,authenticated;
grant execute on function public.reader_plan(uuid),public.confirm_reader_guide(uuid,uuid,text),public.settle_reader_guide(),public.create_shared_book(uuid,text,text,bigint,text),public.claim_shared_book(uuid,uuid,text,text,jsonb),public.protect_shared_book() to service_role;
create function public.apply_reader_subscription(p_event text,p_user uuid,p_revision bigint,p_subscription text,p_status text,p_start timestamptz,p_end timestamptz,p_cancel boolean) returns boolean language plpgsql security invoker set search_path=public as $$
begin
 perform 1 from reader_subscriptions where user_id=p_user for update;
 if exists(select 1 from reader_subscription_events where id=p_event) then return true; end if;
 update reader_subscriptions set subscription_id=p_subscription,status=p_status,period_start=p_start,period_end=p_end,cancel_at_period_end=p_cancel,revision=revision+1,updated_at=now() where user_id=p_user and revision=p_revision;
 if not found then return false; end if;
 insert into reader_subscription_events(id) values(p_event) on conflict do nothing;
 return true;
end $$;
revoke all on function public.apply_reader_subscription(text,uuid,bigint,text,text,timestamptz,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.apply_reader_subscription(text,uuid,bigint,text,text,timestamptz,timestamptz,boolean) to service_role;

-- Shared originals are accessible through the subscriber reader, not table/storage reads.
alter policy "Read own book jobs" on public.book_processing_jobs using ((select auth.uid())=user_id and visibility='private');
alter policy "Read own private book files" on storage.objects using (bucket_id='private-books' and (storage.foldername(name))[1]=(select auth.uid())::text and exists(select 1 from public.book_processing_jobs b where b.id::text=(storage.foldername(name))[2] and b.user_id=(select auth.uid()) and b.visibility='private'));
alter table public.reader_subscriptions add column checkout_key uuid, add column checkout_expires_at timestamptz;
create function public.reader_checkout_key(p_user uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare s reader_subscriptions;
begin
 select * into s from reader_subscriptions where user_id=p_user for update;
 if not found then raise exception 'ACCOUNT_REQUIRED'; end if;
 if s.checkout_expires_at is null or s.checkout_expires_at<=now() then
  update reader_subscriptions set checkout_key=gen_random_uuid(),checkout_expires_at=date_trunc('second',now())+interval '31 minutes' where user_id=p_user returning * into s;
 end if;
 return jsonb_build_object('key',s.checkout_key,'expires',extract(epoch from s.checkout_expires_at)::bigint);
end $$;
revoke all on function public.reader_checkout_key(uuid) from public,anon,authenticated;
grant execute on function public.reader_checkout_key(uuid) to service_role;
-- Stop generating retrieval embeddings for shared books. The old private index remains intact.
do $$ begin
 if exists(select 1 from pg_trigger where tgname='refresh_book_library') then
  execute 'drop trigger refresh_book_library on public.book_processing_jobs';
  execute 'create trigger refresh_book_library after insert or update of notes,title,author,status,run_state,is_current,artifacts on public.book_processing_jobs for each row when (new.visibility=''private'') execute function public.refresh_book_library()';
 end if;
end $$;
