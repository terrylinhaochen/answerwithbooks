-- Service-only passage discovery. Originals remain authoritative in their source edition.
create table public.guide_retrieval_entries(
 id uuid primary key default gen_random_uuid(), job_id uuid not null references public.book_processing_jobs(id) on delete cascade,
 record_key text not null, kind text not null check(kind in ('chapter','scene','original','section')),
 start_line integer not null check(start_line>0), end_line integer not null check(end_line>=start_line),
 body text not null check(length(body)<=6000), source_sha text not null,
 search tsvector generated always as(to_tsvector('english',body)) stored,
 embedding extensions.vector(512), attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),lease_token uuid,lease_until timestamptz,
 unique(job_id,record_key)
);
create index guide_retrieval_words on public.guide_retrieval_entries using gin(search);
create index guide_retrieval_pending on public.guide_retrieval_entries(next_attempt_at) where embedding is null and attempts<5;
alter table public.guide_retrieval_entries enable row level security;
revoke all on public.guide_retrieval_entries from public,anon,authenticated;
grant all on public.guide_retrieval_entries to service_role;
create function public.refresh_guide_retrieval() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare idx jsonb; mp jsonb; r jsonb; s jsonb; n integer; lines text[]; body_value text; key_value text; kind_value text; a integer; b integer;
begin
 if new.status<>'ready' or not new.is_current or new.deletion_pending or new.archived_at is not null or new.duplicate_of is not null then
  delete from guide_retrieval_entries where job_id=new.id;return new;
 end if;
 if tg_op='UPDATE' and old.status='ready' and old.is_current and old.archived_at is null and not old.deletion_pending and old.duplicate_of is null
 and old.source_sha=new.source_sha and old.source_text_sha is not distinct from new.source_text_sha and old.title=new.title and old.author=new.author
 and old.artifacts->'reading/retrieval-index.v1.json' is not distinct from new.artifacts->'reading/retrieval-index.v1.json'
 and old.artifacts->'reading/map.json' is not distinct from new.artifacts->'reading/map.json' and exists(select 1 from guide_retrieval_entries where job_id=new.id) then return new;end if;
 idx=coalesce((new.artifacts->>'reading/retrieval-index.v1.json')::jsonb,'{}');mp=coalesce((new.artifacts->>'reading/map.json')::jsonb,'{}');
 delete from guide_retrieval_entries where job_id=new.id;
 lines=string_to_array(new.source_text,E'\n');
 for kind_value in select unnest(array['chapter','scene','section']) loop
  for r in select value from jsonb_array_elements(case kind_value when 'chapter' then coalesce(idx->'chapters','[]') when 'scene' then coalesce(idx->'scenes',(select jsonb_agg(scene) from jsonb_array_elements(coalesce(mp->'sections','[]')) sec cross join lateral jsonb_array_elements(coalesce(sec->'scenes','[]')) scene),'[]') else coalesce(mp->'sections','[]') end) loop
   a=coalesce((r->>'startLine')::integer,(r->'sourceRefs'->0->>'startLine')::integer);b=coalesce((r->>'endLine')::integer,(r->'sourceRefs'->0->>'endLine')::integer);
   if a is null or b is null or a<1 or b<a or b>coalesce(array_length(lines,1),0) then continue;end if;
   body_value=left(new.title||E'\n'||new.author||E'\n'||coalesce(r->>'title','')||E'\n'||coalesce(r->>'account',r->>'summary',''),6000);
   key_value=kind_value||':'||a||':'||b;
   insert into guide_retrieval_entries(job_id,record_key,kind,start_line,end_line,body,source_sha) values(new.id,key_value,kind_value,a,b,body_value,new.source_sha) on conflict(job_id,record_key) do nothing;
  end loop;
 end loop;
 -- Independent original-text windows recover episodes omitted by summaries.
 for a in select generate_series(1,coalesce(array_length(lines,1),0),35) loop
  b=least(a+49,array_length(lines,1));body_value=left(new.title||E'\n'||array_to_string(lines[a:b],E'\n'),6000);
  insert into guide_retrieval_entries(job_id,record_key,kind,start_line,end_line,body,source_sha) values(new.id,'original:'||a,'original',a,b,body_value,new.source_sha);
 end loop;
 return new;
end; $$;
create trigger refresh_guide_retrieval after insert or update of status,is_current,source_sha,source_text_sha,artifacts,title,author,archived_at,deletion_pending,duplicate_of on public.book_processing_jobs for each row execute function public.refresh_guide_retrieval();
create function public.claim_guide_index() returns setof public.guide_retrieval_entries language sql security invoker set search_path=public as $$
 update guide_retrieval_entries set lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1 where id in(
 select id from guide_retrieval_entries where embedding is null and attempts<5 and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by next_attempt_at,id for update skip locked limit 64) returning *;
$$;
create function public.search_guide_index(p_user uuid,p_query text,p_embedding extensions.vector(512),p_books uuid[] default null,p_public boolean default true)
returns table(id uuid,book_id uuid,kind text,start_line integer,end_line integer,body text,score double precision)
language sql stable security invoker set search_path=public,extensions,pg_temp as $$
 with eligible as materialized(
 select e.* from guide_retrieval_entries e join book_processing_jobs j on j.id=e.job_id
 where j.status='ready' and j.is_current and not j.deletion_pending and j.archived_at is null and j.duplicate_of is null and e.source_sha=j.source_sha
 and (j.visibility='public' or (not p_public and j.user_id=p_user)) and (p_books is null or j.id=any(p_books))
 ), meaning as(select id,row_number() over(order by embedding<=>p_embedding,id) r from eligible where embedding is not null order by embedding<=>p_embedding,id limit 80),
 words as(select id,row_number() over(order by ts_rank_cd(search,websearch_to_tsquery('english',left(p_query,2000))) desc,id) r from eligible where search@@websearch_to_tsquery('english',left(p_query,2000)) order by ts_rank_cd(search,websearch_to_tsquery('english',left(p_query,2000))) desc,id limit 40),
 fused as(select coalesce(m.id,w.id) id,(coalesce(1.0/(60+m.r),0)+coalesce(1.0/(60+w.r),0))::double precision score from meaning m full join words w using(id))
 select e.id,e.job_id,e.kind,e.start_line,e.end_line,e.body,f.score from fused f join eligible e using(id) order by f.score desc,e.id limit 80;
$$;
-- Meter every guide call before dispatch. Unknown outcomes keep their reservation.
alter table public.reading_guides add column provider_budget_usd numeric not null default 1 check(provider_budget_usd>0 and provider_budget_usd<=1);
create table public.guide_provider_usage(
 id uuid primary key,guide_id uuid not null references public.reading_guides(id) on delete cascade,
 model text not null,stage text not null,upper_usd numeric not null check(upper_usd>=0),cost_usd numeric,
 state text not null default 'reserved' check(state in ('reserved','settled','unknown')),metric jsonb,
 created_at timestamptz not null default now()
);
alter table public.guide_provider_usage enable row level security;
revoke all on public.guide_provider_usage from public,anon,authenticated;
grant all on public.guide_provider_usage to service_role;
create function public.reserve_guide_usage(p_id uuid,p_operation uuid,p_model text,p_stage text,p_upper numeric,p_keep numeric default 0)
returns uuid language plpgsql security invoker set search_path=public as $$
declare ceiling numeric;used numeric;
begin
 select provider_budget_usd into ceiling from reading_guides where id=p_id for update;
 if not found then raise exception 'GUIDE_NOT_FOUND';end if;
 if p_upper<=0 or p_keep<0 then raise exception 'INVALID_GUIDE_RESERVATION';end if;
 select coalesce(sum(case when state='settled' then cost_usd else upper_usd end),0) into used from guide_provider_usage where guide_id=p_id;
 if used+p_upper+p_keep>ceiling then raise exception 'GUIDE_BUDGET_LIMIT';end if;
 insert into guide_provider_usage(id,guide_id,model,stage,upper_usd) values(p_operation,p_id,p_model,p_stage,p_upper);
 return p_operation;
end; $$;
create function public.settle_guide_usage(p_operation uuid,p_cost numeric,p_metric jsonb) returns void language plpgsql security invoker set search_path=public as $$
begin
 if p_cost<0 then raise exception 'INVALID_GUIDE_COST';end if;
 update guide_provider_usage set cost_usd=p_cost,metric=p_metric,state=case when p_cost is null then 'unknown' else 'settled' end where id=p_operation and state='reserved';
 if not found then raise exception 'GUIDE_OPERATION_NOT_RESERVED';end if;
end; $$;
create table public.guide_index_usage(id uuid primary key default gen_random_uuid(),model text not null,tokens integer,cost_usd numeric,state text not null,created_at timestamptz not null default now());
alter table public.guide_index_usage enable row level security;
revoke all on public.guide_index_usage from public,anon,authenticated;grant all on public.guide_index_usage to service_role;
create function public.wake_guide_index() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare runner text;endpoint text;
begin
 if not exists(select 1 from guide_retrieval_entries where embedding is null and attempts<5 and next_attempt_at<=now() and (lease_until is null or lease_until<now())) then return;end if;
 select decrypted_secret into runner from vault.decrypted_secrets where name='book_queue_runner';
 select regexp_replace(decrypted_secret,'/book-process$','/reading-index') into endpoint from vault.decrypted_secrets where name='book_queue_url';
 if runner is null or endpoint is null then return;end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Authorization','Bearer '||runner,'Content-Type','application/json'),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=110000);
end; $$;
revoke all on function public.refresh_guide_retrieval(),public.claim_guide_index(),public.search_guide_index(uuid,text,extensions.vector,uuid[],boolean),public.reserve_guide_usage(uuid,uuid,text,text,numeric,numeric),public.settle_guide_usage(uuid,numeric,jsonb),public.wake_guide_index() from public,anon,authenticated;
grant execute on function public.claim_guide_index(),public.search_guide_index(uuid,text,extensions.vector,uuid[],boolean),public.reserve_guide_usage(uuid,uuid,text,text,numeric,numeric),public.settle_guide_usage(uuid,numeric,jsonb),public.wake_guide_index() to service_role;
select cron.schedule('answerwithbooks-guide-index','* * * * *','select public.wake_guide_index()');
-- Existing verified artifacts are indexed without modifying their content.
update public.book_processing_jobs set artifacts=artifacts where status='ready' and visibility='public' and is_current and archived_at is null and not deletion_pending;

create function public.guide_index_coverage(p_user uuid,p_books uuid[] default null,p_public boolean default true) returns jsonb language sql stable security invoker set search_path=public as $$
 select jsonb_build_object('pending',count(*) filter(where e.embedding is null and e.attempts<5),'failed',count(*) filter(where e.embedding is null and e.attempts>=5),'entries',count(*))
 from guide_retrieval_entries e join book_processing_jobs j on j.id=e.job_id where j.status='ready' and j.is_current and not j.deletion_pending and j.archived_at is null and j.duplicate_of is null and e.source_sha=j.source_sha and (j.visibility='public' or (not p_public and j.user_id=p_user)) and (p_books is null or j.id=any(p_books));
$$;
revoke all on function public.guide_index_coverage(uuid,uuid[],boolean) from public,anon,authenticated;
grant execute on function public.guide_index_coverage(uuid,uuid[],boolean) to service_role;

-- New uploads use the stronger source-review model; retain explicit provider pricing.
insert into public.book_provider_rates(model,version,input_rate,cached_rate,output_rate) values
('gpt-5.4','2026-11-08',2.5,.25,15),('gpt-5.4-2026-03-05','2026-11-08',2.5,.25,15) on conflict(model) do nothing;
