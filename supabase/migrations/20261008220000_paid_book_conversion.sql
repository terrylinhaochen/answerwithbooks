-- Existing books stay free. New hosted work requires an explicitly accepted
-- quote. Applying this migration does not activate a tariff or charge a card.
alter table public.book_processing_jobs add column billing_required boolean not null default false;
alter table public.book_processing_jobs alter column billing_required set default true;
alter table public.book_processing_jobs add column billing jsonb;
create table public.book_processing_prices (
 namespace text primary key references awb_skills.call_environments(namespace),
 version text not null, enabled boolean not null default false,
 minimum_cents integer not null check(minimum_cents between 1 and 100000),
 cents_per_100k_characters integer not null check(cents_per_100k_characters between 1 and 100000),
 max_price_cents integer not null check(max_price_cents between minimum_cents and 100000)
);
create table public.book_price_quotes (
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.book_processing_jobs(id) on delete cascade,
 user_id uuid not null, namespace text not null references public.book_processing_prices(namespace),
 fingerprint text not null, price_version text not null, cents integer not null check(cents between 1 and 100000),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours'
);
create table public.book_payment_reservations (
 job_id uuid primary key,
 user_id uuid not null, namespace text not null references awb_skills.call_environments(namespace),
 quote_id uuid not null, owner text not null, cents integer not null check(cents>0),
 state text not null check(state in ('held','settled','released')), created_at timestamptz not null default now()
);
alter table public.book_processing_prices enable row level security;
alter table public.book_price_quotes enable row level security;
alter table public.book_payment_reservations enable row level security;
revoke all on public.book_processing_prices,public.book_price_quotes,public.book_payment_reservations from public,anon,authenticated;
grant all on public.book_processing_prices,public.book_price_quotes,public.book_payment_reservations to service_role;
create index book_payment_owner on public.book_payment_reservations(namespace,owner,state);
create or replace function public.awb_shared_held(ns text,account_owner text) returns bigint
language sql stable security invoker set search_path='' as $$
 select (select coalesce(sum(cents),0) from awb_skills.call_reservations where namespace=ns and owner=account_owner and state='held')
 +(select coalesce(sum(ceiling_cents),0) from awb_skills.usage_reservations where namespace=ns and owner=account_owner and state in ('held','reconciliation'))
 +(select coalesce(sum(cents),0) from public.book_payment_reservations where namespace=ns and owner=account_owner and state='held');
$$;
create function public.book_billing(p_user uuid,p_id uuid,p_action text,p_namespace text default 'awb-production',p_quote uuid default null,p_cents integer default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.book_processing_jobs%rowtype; q public.book_price_quotes%rowtype; r public.book_payment_reservations%rowtype; rate public.book_processing_prices%rowtype; v_fingerprint text; price integer; available bigint; owner_id text='awb:'||p_user;
begin
 -- Book-row then financial lock. Shared wallet operations never lock book rows.
 select * into j from public.book_processing_jobs where id=p_id and user_id=p_user for update;
 if not found then raise exception 'BOOK_NOT_FOUND'; end if;
 if p_action='receipt' then return coalesce(j.billing,jsonb_build_object('state','free','chargedCents',0,'reason','existing-book')); end if;
 if p_action not in ('quote','accept') then raise exception 'INVALID_BOOK_BILLING_ACTION'; end if;
 if not j.billing_required then return jsonb_build_object('state','free','chargedCents',0,'reason','existing-book'); end if;
 perform pg_advisory_xact_lock(hashtextextended(p_namespace||':call-billing',0));
 select * into r from public.book_payment_reservations where job_id=p_id;
 if found and r.namespace<>p_namespace then raise exception 'BILLING_ENVIRONMENT_MISMATCH'; end if;
 if r.state in ('held','settled') then return j.billing; end if;
 if j.status='ready' then return jsonb_build_object('state','free','chargedCents',0,'reason','existing-result'); end if;
 if jsonb_array_length(j.chunks)=0 or j.source_import is not null and j.status='uploaded' and j.source_import->>'state' is distinct from 'complete' then raise exception 'FINISH_SOURCE_UPLOAD'; end if;
 select * into rate from public.book_processing_prices where namespace=p_namespace and enabled;
 if not found then raise exception 'BOOK_PRICING_NOT_ENABLED'; end if;
 v_fingerprint=md5(j.source_sha||j.source_text||(j.options-'mode')::text);
 if p_action='quote' then
  price=greatest(rate.minimum_cents,ceil(length(j.source_text)::numeric/100000*rate.cents_per_100k_characters)::integer);
  if price>rate.max_price_cents then raise exception 'BOOK_EXCEEDS_PRICE_LIMIT'; end if;
  select * into q from public.book_price_quotes where job_id=p_id and user_id=p_user and namespace=p_namespace and fingerprint=v_fingerprint and price_version=rate.version and cents=price and expires_at>now() order by created_at desc limit 1;
  if not found then insert into public.book_price_quotes(job_id,user_id,namespace,fingerprint,price_version,cents) values(p_id,p_user,p_namespace,v_fingerprint,rate.version,price) returning * into q; end if;
  return jsonb_build_object('state','quoted','quoteId',q.id,'priceCents',q.cents,'currency','USD','expiresAt',q.expires_at,'priceVersion',q.price_version,'characters',length(j.source_text),'chargeWhen','ready','includes','One source conversion, summary, skill, and reuse. Cover is optional and does not delay delivery.');
 end if;
 select * into q from public.book_price_quotes where id=p_quote and job_id=p_id and user_id=p_user and namespace=p_namespace;
 if not found or q.expires_at<=now() or q.fingerprint<>v_fingerprint or q.cents is distinct from p_cents or q.price_version<>rate.version then raise exception 'PRICE_ACCEPTANCE_REQUIRED'; end if;
 if exists(select 1 from awb_skills.call_reviews where namespace=p_namespace and owner=owner_id) then raise exception 'PAYMENT_REVIEW'; end if;
 select coalesce(sum(amount),0)-public.awb_shared_held(p_namespace,owner_id) into available from awb_skills.call_ledger where namespace=p_namespace and owner=owner_id;
 if available<q.cents then raise exception 'INSUFFICIENT_FUNDS'; end if;
 insert into public.book_payment_reservations(job_id,user_id,namespace,quote_id,owner,cents,state) values(p_id,p_user,p_namespace,q.id,owner_id,q.cents,'held') on conflict(job_id) do update set quote_id=excluded.quote_id,cents=excluded.cents,state='held';
 update public.book_processing_jobs set billing=jsonb_build_object('state','held','quoteId',q.id,'priceCents',q.cents,'chargedCents',0,'currency','USD','priceVersion',q.price_version),run_state='queued',error=null,attempts=0,next_attempt_at=now(),updated_at=now() where id=p_id returning * into j;
 return j.billing;
end;
$$;
revoke all on function public.book_billing(uuid,uuid,text,text,uuid,integer) from public,anon,authenticated;
grant execute on function public.book_billing(uuid,uuid,text,text,uuid,integer) to service_role;
create function public.enforce_book_payment() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.book_payment_reservations%rowtype;
begin
 if not new.billing_required then return new; end if;
 select * into r from public.book_payment_reservations where job_id=new.id;
 if tg_op='UPDATE' and r.state in ('held','settled') and (new.source_sha is distinct from old.source_sha or new.source_text is distinct from old.source_text or (new.options-'mode') is distinct from (old.options-'mode')) then raise exception 'PAID_SOURCE_IMMUTABLE'; end if;
 if (new.run_state='queued' or tg_op='UPDATE' and new.lease_token is not null and new.lease_token is distinct from old.lease_token and jsonb_array_length(new.chunks)>0) and (r.job_id is null or r.state='released') then raise exception 'BOOK_PRICE_ACCEPTANCE_REQUIRED'; end if;
 if r.state='held' and ((new.status='ready' and new.run_state='complete') or new.run_state='failed') then
  perform pg_advisory_xact_lock(hashtextextended(r.namespace||':call-billing',0));
  if new.status='ready' and new.run_state='complete' then
   if coalesce(length(new.artifacts->>'book.md'),0)=0 or coalesce(length(new.artifacts->>'skill/SKILL.md'),0)=0 then raise exception 'BOOK_DELIVERY_REQUIRED'; end if;
   insert into awb_skills.call_ledger(namespace,owner,event_key,kind,amount,run_id) values(r.namespace,r.owner,'book:'||new.id,'charge',-r.cents,new.id) on conflict(namespace,event_key) do nothing;
   update public.book_payment_reservations set state='settled' where job_id=new.id;
   new.billing=new.billing||jsonb_build_object('state','settled','chargedCents',r.cents);
  else
   update public.book_payment_reservations set state='released' where job_id=new.id;
   new.billing=new.billing||jsonb_build_object('state','released','chargedCents',0);
  end if;
 end if;
 return new;
end;
$$;
create trigger book_payment_guard before insert or update on public.book_processing_jobs for each row execute function public.enforce_book_payment();
create function public.release_deleted_book_payment() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.book_payment_reservations%rowtype;
begin
 if old.lease_until>now() or old.cover_lease_until>now() then raise exception 'BOOK_BUSY'; end if;
 select * into r from public.book_payment_reservations where job_id=old.id;
 if r.state='held' then perform pg_advisory_xact_lock(hashtextextended(r.namespace||':call-billing',0));update public.book_payment_reservations set state='released' where job_id=old.id;end if;
 return old;
end; $$;
create trigger release_deleted_book_payment before delete on public.book_processing_jobs for each row execute function public.release_deleted_book_payment();

create function public.guard_book_price_version() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.version=old.version and (new.minimum_cents<>old.minimum_cents or new.cents_per_100k_characters<>old.cents_per_100k_characters or new.max_price_cents<>old.max_price_cents) then raise exception 'PRICE_VERSION_REQUIRED'; end if;
 return new;
end; $$;
create trigger book_price_version before update on public.book_processing_prices for each row execute function public.guard_book_price_version();
