-- Private chapter-method retrieval. No queries or full sources are copied to this index.
create extension if not exists vector with schema extensions;
grant usage on schema extensions to service_role;
create table public.book_library_entries (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 job_id uuid not null references public.book_processing_jobs(id) on delete cascade,
 section_id text not null,
 body text not null check(length(body)<=6000),
 content_hash text not null,
 search tsvector generated always as (to_tsvector('english',body)) stored,
 embedding extensions.vector(512),
 embedding_model text check(embedding_model is null or embedding_model='text-embedding-3-small:512:v1'),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz,
 unique(job_id,section_id)
);
create index book_library_owner on public.book_library_entries(user_id,job_id);
create index book_library_words on public.book_library_entries using gin(search);
create index book_library_pending on public.book_library_entries(next_attempt_at) where embedding is null and attempts<5;
alter table public.book_library_entries enable row level security;
revoke all on public.book_library_entries from public,anon,authenticated;
grant all on public.book_library_entries to service_role;
-- Entries are service-only; clients receive bounded evidence through authenticated Edge code.
create function public.refresh_book_library() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status<>'ready' or new.run_state<>'complete' or not new.is_current or new.artifacts is null then
  delete from public.book_library_entries where job_id=new.id; return new;
 end if;
 insert into public.book_library_entries(user_id,job_id,section_id,body,content_hash)
 select new.user_id,new.id,note->>'id',body,md5(body) from jsonb_array_elements(new.notes) note
 cross join lateral (select left(new.title||E'\n'||new.author||E'\n'||coalesce(note->>'title','')||E'\n'||coalesce(note->>'summary','')||E'\n'||coalesce((note->'ideas')::text,''),6000) body) text
 where note->>'id' ~ '^ch[0-9]+$'
 on conflict(job_id,section_id) do update set body=excluded.body,content_hash=excluded.content_hash,
 embedding=null,embedding_model=null,attempts=0,next_attempt_at=now(),lease_token=null,lease_until=null
 where book_library_entries.content_hash<>excluded.content_hash;
 delete from public.book_library_entries e where e.job_id=new.id and not exists(select 1 from jsonb_array_elements(new.notes) n where n->>'id'=e.section_id);
 return new;
end; $$;
create trigger refresh_book_library after insert or update of notes,title,author,status,run_state,is_current,artifacts on public.book_processing_jobs
for each row execute function public.refresh_book_library();
-- Backfill lexical entries only. Embeddings wait for the separately enabled runner.
update public.book_processing_jobs set is_current=is_current where status='ready' and is_current;

create function public.claim_book_library_entries() returns setof public.book_library_entries
language plpgsql security invoker set search_path=public,pg_temp as $$
declare selected_user uuid; token uuid;
begin
 perform pg_advisory_xact_lock(726310066);
 if (select count(distinct lease_token) from public.book_library_entries where lease_until>now())>=2 then return; end if;
 select e.user_id into selected_user from public.book_library_entries e join public.book_processing_jobs j on j.id=e.job_id
 where e.embedding is null and e.attempts<5 and e.next_attempt_at<=now() and (e.lease_until is null or e.lease_until<now())
 and j.status='ready' and j.run_state='complete' and j.is_current
 and not exists(select 1 from public.book_library_entries active where active.user_id=e.user_id and active.lease_until>now())
 order by e.next_attempt_at,e.id limit 1;
 if selected_user is null then return; end if;
 token=gen_random_uuid();
 return query update public.book_library_entries e set lease_token=token,lease_until=now()+interval '90 seconds',attempts=e.attempts+1
 where e.id in(select pending.id from public.book_library_entries pending where pending.user_id=selected_user and pending.embedding is null
 and pending.attempts<5 and pending.next_attempt_at<=now() and (pending.lease_until is null or pending.lease_until<now())
 order by pending.next_attempt_at,pending.id for update skip locked limit 16) returning e.*;
end; $$;

-- Rate limiting stores a counter, never a user's question.
create table public.book_library_search_limits(user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null,requests integer not null);
alter table public.book_library_search_limits enable row level security;
revoke all on public.book_library_search_limits from public,anon,authenticated;
grant all on public.book_library_search_limits to service_role;
create function public.allow_book_library_search(p_user uuid) returns boolean language sql security invoker set search_path=public,pg_temp as $$
 insert into public.book_library_search_limits values(p_user,date_trunc('minute',now()),1)
 on conflict(user_id) do update set window_start=excluded.window_start,requests=case when book_library_search_limits.window_start=excluded.window_start then book_library_search_limits.requests+1 else 1 end
 returning requests<=30;
$$;

create function public.search_book_library(p_user uuid,p_query text,p_embedding extensions.vector(512) default null,p_book uuid default null)
returns table(entry_id uuid,book_id uuid,revision_id uuid,title text,author text,section_id text,score double precision,similarity double precision,lexical boolean)
language sql stable security invoker set search_path=public,extensions,pg_temp as $$
 with eligible as materialized (
  select e.*,j.book_id,j.title,j.author from public.book_library_entries e join public.book_processing_jobs j on j.id=e.job_id
  where e.user_id=p_user and j.user_id=p_user and j.is_current and j.status='ready' and j.run_state='complete'
   and (p_book is null or j.book_id=p_book or j.id=p_book)
 ), words as (
  select id,row_number() over(order by ts_rank_cd(search,websearch_to_tsquery('english',left(p_query,2000))) desc,id) rank
  from eligible where search@@websearch_to_tsquery('english',left(p_query,2000))
  order by ts_rank_cd(search,websearch_to_tsquery('english',left(p_query,2000))) desc,id limit 30
 ), meanings as (
  -- Exact owner-filtered vector ranking avoids cross-account ANN post-filter recall loss.
  select id,1-(embedding<=>p_embedding) similarity,row_number() over(order by embedding<=>p_embedding,id) rank
  from eligible where p_embedding is not null and embedding is not null and embedding_model='text-embedding-3-small:512:v1'
  order by embedding<=>p_embedding,id limit 30
 ), fused as (
  select coalesce(w.id,m.id) id,(coalesce(1.0/(60+w.rank),0)+coalesce(1.0/(60+m.rank),0))::double precision score,m.similarity,w.id is not null lexical
  from words w full join meanings m using(id)
 )
 select e.id,e.book_id,e.job_id,e.title,e.author,e.section_id,f.score,f.similarity,f.lexical
 from fused f join eligible e using(id) order by f.score desc,e.id limit 24;
$$;

create function public.book_library_coverage(p_user uuid,p_book uuid default null) returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_build_object('sections',count(*),'embedded',count(embedding),'failed',count(*) filter(where e.embedding is null and e.attempts>=5))
 from public.book_library_entries e join public.book_processing_jobs j on j.id=e.job_id
 where e.user_id=p_user and j.user_id=p_user and j.is_current and j.status='ready' and j.run_state='complete' and (p_book is null or j.id=p_book or j.book_id=p_book);
$$;

-- Build bounded exact source excerpts in Postgres, so even the Edge worker need not download whole books.
create function public.book_library_citations(p_note jsonb,p_source text) returns jsonb
language plpgsql immutable set search_path=public,pg_temp as $$
declare lines text[]=string_to_array(p_source,E'\n'); refs jsonb; ref jsonb; seen text[]='{}'; result jsonb='[]';
 first_line integer; last_line integer; actual_end integer; line_no integer; budget integer=3000; remaining integer; used integer;
 snippet text; numbered text; partial_line boolean; identity text;
begin
 refs=coalesce(p_note->'sourceRefs','[]'::jsonb)||coalesce((select jsonb_agg(r) from jsonb_array_elements(coalesce(p_note->'ideas','[]')) with ordinality idea(value,n)
 cross join lateral jsonb_array_elements(coalesce(idea.value->'sourceRefs','[]')) r where idea.n<=3),'[]');
 for ref in select value from jsonb_array_elements(refs) loop
  exit when budget<=0 or jsonb_array_length(result)>=6;
  if coalesce(ref->>'startLine','') !~ '^[0-9]{1,9}$' or coalesce(ref->>'endLine','') !~ '^[0-9]{1,9}$' then continue; end if;
  first_line=(ref->>'startLine')::integer;last_line=(ref->>'endLine')::integer;
  if first_line<1 or last_line<first_line or last_line>coalesce(array_length(lines,1),0) then continue; end if;
  identity=first_line||':'||last_line;if identity=any(seen) then continue; end if;seen=array_append(seen,identity);
  snippet='';used=0;actual_end=first_line-1;partial_line=false;
  for line_no in first_line..least(last_line,first_line+59) loop
   remaining=least(1000,budget)-used;exit when remaining<=0;
   numbered=line_no||': '||lines[line_no];
   snippet=snippet||case when snippet='' then '' else E'\n' end||left(numbered,remaining);
   used=used+least(length(numbered),remaining)+1;actual_end=line_no;
   if length(numbered)>remaining then partial_line=true;exit;end if;
  end loop;
  budget=budget-used;
  result=result||jsonb_build_array(jsonb_build_object('source','S1','startLine',first_line,'endLine',actual_end,'requestedEndLine',last_line,'truncated',partial_line or actual_end<last_line,'excerpt',snippet));
 end loop;
 return result;
end; $$;
create function public.book_library_evidence(p_user uuid,p_entries uuid[]) returns table(entry_id uuid,book_id uuid,revision_id uuid,title text,author text,section_id text,note jsonb,citations jsonb,review jsonb)
language sql stable security invoker set search_path=public,pg_temp as $$
 select e.id,j.book_id,j.id,j.title,j.author,e.section_id,note,public.book_library_citations(note,j.source_text),
 jsonb_build_object('sourceReview',note->'sourceReview','coverage','Extracted sections; original chapter completeness is not independently verified.')
 from public.book_library_entries e join public.book_processing_jobs j on j.id=e.job_id
 cross join lateral jsonb_array_elements(j.notes) note
 where e.id=any(p_entries[1:6]) and e.user_id=p_user and j.user_id=p_user and j.is_current and j.status='ready' and j.run_state='complete' and note->>'id'=e.section_id;
$$;

create function public.wake_book_library() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare runner text; endpoint text;
begin
 if not exists(select 1 from public.book_library_entries where embedding is null and attempts<5 and next_attempt_at<=now() and (lease_until is null or lease_until<now())) then return; end if;
 select decrypted_secret into runner from vault.decrypted_secrets where name='book_queue_runner';
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='book_library_url';
 if runner is null or endpoint is null then return; end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||runner),body:='{"action":"drain"}'::jsonb,timeout_milliseconds:=60000);
end; $$;
select cron.schedule('answerwithbooks-library','* * * * *','select public.wake_book_library()');
revoke all on function public.book_library_citations(jsonb,text),public.refresh_book_library(),public.claim_book_library_entries(),public.allow_book_library_search(uuid),public.search_book_library(uuid,text,extensions.vector,uuid),public.book_library_coverage(uuid,uuid),public.book_library_evidence(uuid,uuid[]),public.wake_book_library() from public,anon,authenticated;
grant execute on function public.book_library_citations(jsonb,text),public.claim_book_library_entries(),public.allow_book_library_search(uuid),public.search_book_library(uuid,text,extensions.vector,uuid),public.book_library_coverage(uuid,uuid),public.book_library_evidence(uuid,uuid[]),public.wake_book_library() to service_role;
