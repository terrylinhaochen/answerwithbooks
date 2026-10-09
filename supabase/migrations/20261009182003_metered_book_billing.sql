-- Supersedes the unlaunched fixed tariff. No enabled tariff is inserted.
alter table public.book_processing_prices add column pricing_model text not null default 'metered-4x' check(pricing_model='metered-4x');
alter table public.book_payment_reservations drop constraint book_payment_reservations_state_check;
alter table public.book_payment_reservations add constraint book_payment_reservations_state_check check(state in ('held','reconciliation','settled','released'));
alter table public.book_price_quotes add column provider_rates jsonb not null default '[]';
alter table public.book_payment_reservations add column provider_rates jsonb not null default '[]';
alter table public.book_payment_reservations add column charged_cents integer not null default 0 check(charged_cents>=0);
create table public.book_provider_rates(
 model text primary key,version text not null,input_rate numeric not null check(input_rate>=0),cached_rate numeric not null check(cached_rate>=0),output_rate numeric not null check(output_rate>=0)
);
-- USD per million tokens. These are a pinned list-price basis, not reconciled invoices.
insert into public.book_provider_rates values
 ('gpt-5.4-mini','2026-10-08',.75,.075,4.5),('gpt-5.4-mini-2026-03-17','2026-10-08',.75,.075,4.5),
 ('accounts/fireworks/models/glm-5p3-flash','2026-10-08',.15,.03,.5),
 ('accounts/fireworks/models/glm-5p3','2026-10-08',1.4,.26,4.4),
 ('gpt-image-1.5','2026-10-08',5,5,32);
create table public.book_provider_operations(
 id uuid primary key,job_id uuid not null,user_id uuid not null,kind text not null check(kind in ('generation','review','image')),
 lease_token uuid,model text not null,rate_version text not null,input_rate numeric not null,cached_rate numeric not null,output_rate numeric not null,
 input_bound bigint not null,output_bound bigint not null,upper_usd numeric not null check(upper_usd>=0),
 state text not null check(state in ('started','complete','unknown')),cost_usd numeric check(cost_usd>=0),metric jsonb,
 created_at timestamptz not null default now(),completed_at timestamptz
);
create index book_operations_job on public.book_provider_operations(job_id,state);
create table public.book_usage_reconciliations(id uuid primary key default gen_random_uuid(),operation_id uuid not null references public.book_provider_operations(id),previous_metric jsonb,evidence text not null,operator_id text not null,created_at timestamptz not null default now());
alter table public.book_usage_reconciliations enable row level security;
revoke all on public.book_usage_reconciliations from public,anon,authenticated;
grant select,insert on public.book_usage_reconciliations to service_role;

alter table public.book_provider_rates enable row level security;
alter table public.book_provider_operations enable row level security;
revoke all on public.book_provider_rates,public.book_provider_operations from public,anon,authenticated;
grant select on public.book_provider_rates to service_role;
grant select,insert,update on public.book_provider_operations to service_role;
create or replace function public.awb_shared_held(ns text,account_owner text) returns bigint
language sql stable security invoker set search_path='' as $$
 select (select coalesce(sum(cents),0) from awb_skills.call_reservations where namespace=ns and owner=account_owner and state='held')
 +(select coalesce(sum(ceiling_cents),0) from awb_skills.usage_reservations where namespace=ns and owner=account_owner and state in ('held','reconciliation'))
 +(select coalesce(sum(cents),0) from public.book_payment_reservations where namespace=ns and owner=account_owner and state in ('held','reconciliation'));
$$;
drop function public.book_billing(uuid,uuid,text,text,uuid,integer);
create function public.book_billing(p_user uuid,p_id uuid,p_action text,p_namespace text default 'awb-production',p_quote uuid default null,p_cents integer default null,p_models text[] default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.book_processing_jobs%rowtype;q public.book_price_quotes%rowtype;r public.book_payment_reservations%rowtype;rate public.book_processing_prices%rowtype;fingerprint text;ceiling integer;available bigint;owner_id text='awb:'||p_user;approved_rates jsonb;
begin
 select * into j from public.book_processing_jobs where id=p_id and user_id=p_user for update;
 if not found then raise exception 'BOOK_NOT_FOUND';end if;
 if p_action='receipt' then return coalesce(j.billing,jsonb_build_object('state','free','chargedCents',0));end if;
 if p_action not in ('quote','accept') then raise exception 'INVALID_BOOK_BILLING_ACTION';end if;
 if not j.billing_required then return jsonb_build_object('state','free','chargedCents',0);end if;
 perform pg_advisory_xact_lock(hashtextextended(p_namespace||':call-billing',0));
 select * into r from public.book_payment_reservations where job_id=p_id;
 if found and r.namespace<>p_namespace then raise exception 'BILLING_ENVIRONMENT_MISMATCH';end if;
 if r.state in ('held','reconciliation') then
  if p_action='accept' and (p_quote is distinct from r.quote_id or p_cents is distinct from r.cents) then raise exception 'PRICE_ACCEPTANCE_REQUIRED';end if;
  return j.billing;
 end if;
 if j.status='ready' and (j.cover_status is distinct from 'failed' or to_jsonb(j)->>'cover_path' is not null) then return coalesce(j.billing,jsonb_build_object('state','free','chargedCents',0));end if;
 if jsonb_array_length(j.chunks)=0 or j.source_import is not null and j.status='uploaded' and j.source_import->>'state' is distinct from 'complete' then raise exception 'FINISH_SOURCE_UPLOAD';end if;
 select * into rate from public.book_processing_prices where namespace=p_namespace and enabled and pricing_model='metered-4x';
 if not found then raise exception 'BOOK_PRICING_NOT_ENABLED';end if;
 fingerprint=md5(j.source_sha||j.source_text||(j.options-'mode')::text);
 if p_action='quote' then
  ceiling=coalesce(p_cents,least(500,rate.max_price_cents));
  if ceiling<1 or ceiling>rate.max_price_cents then raise exception 'INVALID_SPENDING_LIMIT';end if;
  select coalesce(jsonb_agg(to_jsonb(pr) order by pr.model),'[]') into approved_rates from public.book_provider_rates pr where p_models is null or pr.model=any(p_models);
  if jsonb_array_length(approved_rates)=0 or p_models is not null and jsonb_array_length(approved_rates)<>cardinality(p_models) then raise exception 'BOOK_MODEL_UNPRICED';end if;
  insert into public.book_price_quotes(job_id,user_id,namespace,fingerprint,price_version,cents,provider_rates) values(p_id,p_user,p_namespace,fingerprint,rate.version,ceiling,approved_rates) returning * into q;
  return jsonb_build_object('state','quoted','quoteId',q.id,'priceCents',q.cents,'ceilingCents',q.cents,'pricingModel','metered-4x','multiplier',4,'providerMarginBps',7500,'currency','USD','expiresAt',q.expires_at,'priceVersion',q.price_version,'modelRates',q.provider_rates,'chargeWhen','usage-settlement','includes','Text and cover generation, review and repair tokens. Actual usage is charged even if work fails; unused funds are released. Retrieval and storage are not charged here.');
 end if;
 select * into q from public.book_price_quotes where id=p_quote and job_id=p_id and user_id=p_user and namespace=p_namespace;
 if not found or q.expires_at<=now() or q.fingerprint<>fingerprint or q.cents is distinct from p_cents or q.price_version<>rate.version then raise exception 'PRICE_ACCEPTANCE_REQUIRED';end if;
 if exists(select 1 from awb_skills.call_reviews where namespace=p_namespace and owner=owner_id) then raise exception 'PAYMENT_REVIEW';end if;
 select coalesce(sum(amount),0)-public.awb_shared_held(p_namespace,owner_id) into available from awb_skills.call_ledger where namespace=p_namespace and owner=owner_id;
 if available<q.cents then raise exception 'INSUFFICIENT_FUNDS';end if;
 insert into public.book_payment_reservations(job_id,user_id,namespace,quote_id,owner,cents,state,provider_rates) values(p_id,p_user,p_namespace,q.id,owner_id,q.cents,'held',q.provider_rates) on conflict(job_id) do update set quote_id=excluded.quote_id,cents=excluded.cents,state='held',provider_rates=excluded.provider_rates;
 update public.book_processing_jobs set billing=jsonb_build_object('state','held','quoteId',q.id,'priceCents',q.cents,'ceilingCents',q.cents,'pricingModel','metered-4x','multiplier',4,'chargedCents',coalesce(r.charged_cents,0),'currency','USD','priceVersion',q.price_version,'modelRates',q.provider_rates),run_state=case when j.status='ready' then 'complete' else 'queued' end,cover_status=case when j.status='ready' then 'pending' else j.cover_status end,cover_attempts=case when j.status='ready' then 0 else j.cover_attempts end,cover_next_attempt_at=case when j.status='ready' then now() else j.cover_next_attempt_at end,error=null,attempts=0,next_attempt_at=now(),updated_at=now() where id=p_id returning * into j;
 return j.billing;
end;$$;
-- Caller holds the book row lock; lock order is always book -> wallet.
create function public.settle_book_usage(p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.book_payment_reservations%rowtype;cost numeric;charge integer;missing bigint;balance bigint;
begin
 perform 1 from public.book_processing_jobs where id=p_id for update;
 select * into r from public.book_payment_reservations where job_id=p_id;
 if not found then return null;end if;
 perform pg_advisory_xact_lock(hashtextextended(r.namespace||':call-billing',0));
 select coalesce(sum(cost_usd),0),count(*) filter(where state<>'complete') into cost,missing from public.book_provider_operations where job_id=p_id;
 charge=ceil(cost*400)::integer-r.charged_cents;
 select coalesce(sum(amount),0) into balance from awb_skills.call_ledger where namespace=r.namespace and owner=r.owner;
 if r.state not in ('held','reconciliation') then return jsonb_build_object('state',r.state,'chargedCents',r.charged_cents,'providerCostUsd',cost,'pricingModel','metered-4x','multiplier',4);end if;
 if missing>0 or charge<0 or charge>r.cents or balance<public.awb_shared_held(r.namespace,r.owner) or exists(select 1 from awb_skills.call_reviews where namespace=r.namespace and owner=r.owner) then
  update public.book_payment_reservations set state='reconciliation' where job_id=p_id;
  return jsonb_build_object('state','reconciliation','chargedCents',r.charged_cents,'reservedCents',r.cents,'unresolvedOperations',missing,'pricingModel','metered-4x','multiplier',4);
 end if;
 if charge>0 then insert into awb_skills.call_ledger(namespace,owner,event_key,kind,amount,run_id) values(r.namespace,r.owner,'book-usage:'||r.quote_id,'charge',-charge,p_id) on conflict(namespace,event_key) do nothing;end if;
 update public.book_payment_reservations set state=case when r.charged_cents+charge>0 then 'settled' else 'released' end,charged_cents=r.charged_cents+charge where job_id=p_id;
 return jsonb_build_object('state',case when r.charged_cents+charge>0 then 'settled' else 'released' end,'chargedCents',r.charged_cents+charge,'releasedCents',r.cents-charge,'providerCostUsd',cost,'pricingModel','metered-4x','multiplier',4,'rateBasis','provider-list-rates');
end;$$;
create function public.book_usage_operation(p_user uuid,p_id uuid,p_operation uuid,p_action text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.book_processing_jobs%rowtype;r public.book_payment_reservations%rowtype;o public.book_provider_operations%rowtype;rate public.book_provider_rates%rowtype;ib bigint;ob bigint;it bigint;ot bigint;ct bigint;upper_cost numeric;used numeric;actual numeric;valid boolean;
begin
 select * into j from public.book_processing_jobs where id=p_id and user_id=p_user for update;
 if not found then raise exception 'BOOK_NOT_FOUND';end if;
 select * into r from public.book_payment_reservations where job_id=p_id;
 if not j.billing_required then return jsonb_build_object('state','free');end if;
 if r.job_id is null then raise exception 'BOOK_PRICE_ACCEPTANCE_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended(r.namespace||':call-billing',0));
 select * into o from public.book_provider_operations where id=p_operation;
 if found and (o.job_id<>p_id or o.user_id<>p_user) then raise exception 'BOOK_OPERATION_MISMATCH';end if;
 if p_action='begin' then
  if o.id is not null then raise exception 'BOOK_OPERATION_ALREADY_STARTED';end if;
  if exists(select 1 from awb_skills.call_reviews where namespace=r.namespace and owner=r.owner) or (select coalesce(sum(amount),0) from awb_skills.call_ledger where namespace=r.namespace and owner=r.owner)<public.awb_shared_held(r.namespace,r.owner) then raise exception 'BOOK_PAYMENT_REVIEW';end if;
  if r.state<>'held' or j.run_state in ('paused','failed') or (j.status='ready' and p_payload->>'kind'<>'image') then raise exception 'BOOK_BILLING_NOT_ACTIVE';end if;
  if exists(select 1 from public.book_provider_operations where job_id=p_id and (state='unknown' or state='started' and lease_token is distinct from case when p_payload->>'kind'='image' then j.cover_lease_token else j.lease_token end)) then raise exception 'BOOK_USAGE_RECONCILIATION';end if;
  select * into rate from jsonb_populate_recordset(null::public.book_provider_rates,r.provider_rates) where model=p_payload->>'model';if not found then raise exception 'BOOK_MODEL_UNPRICED';end if;
  ib=(p_payload->>'inputBound')::bigint;ob=(p_payload->>'outputBound')::bigint;
  if ib is null or ob is null or ib<1 or ob<1 or ib>10000000 or ob>100000 then raise exception 'INVALID_TOKEN_BOUND';end if;
  upper_cost=(ib*rate.input_rate+ob*rate.output_rate)/1000000;
  select coalesce(sum(case when state='complete' then cost_usd else upper_usd end),0) into used from public.book_provider_operations where job_id=p_id;
  if ceil((used+upper_cost)*400)>r.cents+r.charged_cents then raise exception 'BOOK_BUDGET_EXHAUSTED';end if;
  insert into public.book_provider_operations(id,job_id,user_id,kind,lease_token,model,rate_version,input_rate,cached_rate,output_rate,input_bound,output_bound,upper_usd,state) values(p_operation,p_id,p_user,p_payload->>'kind',case when p_payload->>'kind'='image' then j.cover_lease_token else j.lease_token end,rate.model,rate.version,rate.input_rate,rate.cached_rate,rate.output_rate,ib,ob,upper_cost,'started');
  return jsonb_build_object('state','started','operationId',p_operation);
 elsif p_action in ('finish','reconcile') then
  if o.id is null then raise exception 'BOOK_OPERATION_NOT_STARTED';end if;
  if p_action='reconcile' then
   if length(coalesce(p_payload->>'providerEvidence',''))<8 or length(coalesce(p_payload->>'operatorId',''))<8 then raise exception 'RECONCILIATION_EVIDENCE_REQUIRED';end if;
   if j.lease_until>now() or j.cover_lease_until>now() then raise exception 'BOOK_BUSY';end if;
   if o.state='complete' then raise exception 'BOOK_RECEIPT_ALREADY_COMPLETE';end if;
   insert into public.book_usage_reconciliations(operation_id,previous_metric,evidence,operator_id) values(o.id,o.metric,p_payload->>'providerEvidence',p_payload->>'operatorId');
  end if;
  if o.state<>'started' and p_action<>'reconcile' then
   if o.metric is distinct from p_payload then raise exception 'BOOK_RECEIPT_CONFLICT';end if;
   return jsonb_build_object('state',o.state);
  end if;
  valid=coalesce((p_payload->>'inputTokens') ~ '^[0-9]+$' and (p_payload->>'outputTokens') ~ '^[0-9]+$' and (p_payload->>'cachedInputTokens') ~ '^[0-9]+$',false);
  if valid then
   it=(p_payload->>'inputTokens')::bigint;ot=(p_payload->>'outputTokens')::bigint;ct=(p_payload->>'cachedInputTokens')::bigint;
   valid=ct<=it and it<=o.input_bound and ot<=o.output_bound;
   if o.kind='image' then valid=valid and coalesce((p_payload->>'inputImageTokens')::bigint,0)=0;end if;
   if valid then actual=((it-ct)*o.input_rate+ct*o.cached_rate+ot*o.output_rate)/1000000;end if;
  end if;
  update public.book_provider_operations set state=case when valid then 'complete' else 'unknown' end,cost_usd=actual,metric=p_payload,completed_at=now() where id=p_operation;
  if not valid then update public.book_processing_jobs set run_state=case when status='ready' then run_state else 'paused' end,error='Usage needs reconciliation before more paid work.',billing=billing||jsonb_build_object('state','reconciliation') where id=p_id;update public.book_payment_reservations set state='reconciliation' where job_id=p_id;end if;
  if valid and p_action='reconcile' and not exists(select 1 from public.book_provider_operations where job_id=p_id and state<>'complete') then
   update public.book_payment_reservations set state='held' where job_id=p_id and state='reconciliation';
   update public.book_processing_jobs set billing=billing||jsonb_build_object('state','held'),error='Usage reconciled. Resume or cancel from your saved progress.' where id=p_id;
  end if;
  return jsonb_build_object('state',case when valid then 'complete' else 'unknown' end,'providerCostUsd',actual);
 end if;
 raise exception 'INVALID_BOOK_OPERATION_ACTION';
end;$$;
create or replace function public.enforce_book_payment() returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.book_payment_reservations%rowtype;
begin
 if not new.billing_required then return new;end if;
 select * into r from public.book_payment_reservations where job_id=new.id;
 if tg_op='UPDATE' and r.job_id is not null and (new.source_sha is distinct from old.source_sha or new.source_text is distinct from old.source_text or (new.options-'mode') is distinct from (old.options-'mode')) then raise exception 'PAID_SOURCE_IMMUTABLE';end if;
 if (new.run_state='queued' or tg_op='UPDATE' and new.lease_token is not null and new.lease_token is distinct from old.lease_token and jsonb_array_length(new.chunks)>0) and (r.job_id is null or r.state<>'held') then raise exception 'BOOK_PRICE_ACCEPTANCE_REQUIRED';end if;
 if r.state in ('held','reconciliation') and (new.run_state='failed' or new.status='ready' and new.run_state='complete' and coalesce(to_jsonb(new)->>'cover_status','skipped') not in ('pending','processing')) then
  if new.status='ready' and (coalesce(length(new.artifacts->>'book.md'),0)=0 or coalesce(length(new.artifacts->>'skill/SKILL.md'),0)=0) then raise exception 'BOOK_DELIVERY_REQUIRED';end if;
  new.billing=coalesce(new.billing,'{}')||public.settle_book_usage(new.id);
 end if;
 return new;
end;$$;
create or replace function public.release_deleted_book_payment() returns trigger language plpgsql security invoker set search_path='' as $$
declare receipt jsonb;
begin
 if old.lease_until>now() or old.cover_lease_until>now() then raise exception 'BOOK_BUSY';end if;
 if old.billing_required then receipt=public.settle_book_usage(old.id);if receipt->>'state'='reconciliation' then raise exception 'BOOK_USAGE_RECONCILIATION';end if;end if;
 return old;
end;$$;
revoke all on function public.settle_book_usage(uuid),public.book_usage_operation(uuid,uuid,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.settle_book_usage(uuid),public.book_usage_operation(uuid,uuid,uuid,text,jsonb) to service_role;

-- Operator settlement checks and update share one row lock; a concurrent resume
-- cannot admit provider work between the terminal-state check and settlement.
create function public.settle_terminal_book_usage(p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.book_processing_jobs%rowtype;receipt jsonb;
begin
 select * into j from public.book_processing_jobs where id=p_id for update;
 if not found then raise exception 'BOOK_NOT_FOUND';end if;
 if j.lease_until>now() or j.cover_lease_until>now() or not (j.run_state='failed' or j.status='ready' and j.run_state='complete' and coalesce(j.cover_status,'skipped') not in ('pending','processing')) then raise exception 'BOOK_BUSY';end if;
 receipt=public.settle_book_usage(p_id);
 update public.book_processing_jobs set billing=coalesce(billing,'{}')||receipt where id=p_id;
 return receipt;
end;$$;
revoke all on function public.book_billing(uuid,uuid,text,text,uuid,integer,text[]),public.settle_terminal_book_usage(uuid) from public,anon,authenticated;
grant execute on function public.book_billing(uuid,uuid,text,text,uuid,integer,text[]),public.settle_terminal_book_usage(uuid) to service_role;

-- Check payment settlement before the HTTP layer removes source objects.
create function public.prepare_paid_book_deletion(p_user uuid,p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare j public.book_processing_jobs%rowtype;receipt jsonb;
begin
 select * into j from public.book_processing_jobs where id=p_id and user_id=p_user for update;
 if not found then raise exception 'BOOK_NOT_FOUND';end if;
 if j.lease_until>now() or j.cover_lease_until>now() then raise exception 'BOOK_BUSY';end if;
 receipt=public.settle_book_usage(p_id);
 if receipt->>'state'='reconciliation' then raise exception 'BOOK_USAGE_RECONCILIATION';end if;
 update public.book_processing_jobs set run_state='paused',cover_status=case when cover_status in ('pending','processing') then 'skipped' else cover_status end,billing=coalesce(billing,'{}')||coalesce(receipt,'{}'),updated_at=now() where id=p_id;
 return coalesce(receipt,jsonb_build_object('state','free'));
end;$$;
revoke all on function public.prepare_paid_book_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_paid_book_deletion(uuid,uuid) to service_role;
