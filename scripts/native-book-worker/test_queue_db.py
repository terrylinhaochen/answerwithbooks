#!/usr/bin/env python3
"""Exercise the actual migration/claim SQL against an isolated local Postgres.
pg_net, Vault and pg_cron are local recording stubs; no network or provider calls.
"""
from pathlib import Path
import concurrent.futures
import json
import os
import shutil
import socket
import subprocess
import tempfile

ROOT=Path(__file__).resolve().parents[2]
BIN=Path(os.environ.get('PG_BIN','/opt/homebrew/opt/postgresql@14/bin'))
area=Path(tempfile.mkdtemp(prefix='answerwithbooks-native-queue-pg-'))
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
started=False

def sql(text):
    result=subprocess.run([str(BIN/'psql'),'-h',str(area),'-p',str(port),'-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr)
    return result.stdout.strip()
def scalar(text):return json.loads(sql('select to_json(result) from ('+text+') result;'))
def execute(*args):
    result=subprocess.run(args,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
    if result.returncode:raise RuntimeError(result.stderr)
try:
    execute(str(BIN/'initdb'),'-D',str(area/'data'),'-A','trust','--no-locale','-E','UTF8')
    execute(str(BIN/'pg_ctl'),'-D',str(area/'data'),'-l',str(area/'server.log'),'-o',f'-k {area} -p {port} -h 127.0.0.1','-w','start');started=True
    sql('''create role anon; create role authenticated; create role service_role;
create schema auth; create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema public,auth to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated;
create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);
create schema net;create table net.requests(url text,headers jsonb,body jsonb,timeout_milliseconds int);
create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$ insert into net.requests values(url,headers,body,timeout_milliseconds); select 1::bigint $$;
create schema cron;create table cron.job(jobname text,schedule text,command text);
create function cron.schedule(name text,schedule text,command text) returns bigint language sql as $$ insert into cron.job values(name,schedule,command); select 1::bigint $$;''')
    original=(ROOT/'supabase/migrations/20261005172455_add_private_book_processing.sql').read_text()
    start=original.index('insert into storage.buckets');end=original.index('create function public.create_book_processing_job')
    sql(original[:start]+original[end:])
    migration=(ROOT/'supabase/migrations/20261007003000_book_processing_queue.sql').read_text()
    sql('\n'.join(line for line in migration.splitlines() if not line.startswith('create extension')))
    sql((ROOT/'supabase/migrations/20261007013000_long_book_processing.sql').read_text())
    sql((ROOT/'supabase/migrations/20261007030000_native_book_worker.sql').read_text())
    users=[f'00000000-0000-4000-8000-{n:012d}' for n in range(1,4)]
    for user in users:
        sql(f"insert into auth.users values('{user}');")
        for n in range(5):
            sql(f"select id from public.create_book_processing_job('{user}','source-{n}.pdf','{n:064x}',repeat('Source pending ',20),'Source {n}','[]');")
    sql("update book_processing_jobs set run_state='staging',source_import='{\"kind\":\"native\",\"state\":\"awaiting_upload\"}';")
    assert scalar('select (public.claim_native_book_job()).id')['id'] is None
    sql("update book_processing_jobs set source_import=source_import||'{\"state\":\"queued\"}';")
    assert scalar('select (public.claim_book_processing_job()).id')['id'] is None, 'Provider must not claim native placeholders'
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        claims=list(pool.map(lambda _:scalar('select (public.claim_native_book_job()).id'),range(12)))
    claims=[c['id'] for c in claims if c['id']]
    assert len(claims)==4 and len(set(claims))==4,claims
    assert int(sql("select max(n) from (select count(*) n from book_processing_jobs where lease_until>now() group by user_id) counts;"))<=2
    assert int(sql("select min(extract(epoch from lease_until-now()))::int from book_processing_jobs where lease_until>now();"))>850
    print('PASS native SQL: verified-upload gate, provider exclusion, concurrent global 4 / owner 2 capacity, 15-minute leases')
    target=claims[0];old=sql(f"select lease_token from book_processing_jobs where id='{target}';")
    sql(f"update book_processing_jobs set lease_until=now()-interval '1 second',next_attempt_at=now()-interval '1 day' where id='{target}';")
    renewed=scalar('select (public.claim_native_book_job()).lease_token')['lease_token']
    assert renewed and renewed!=old
    assert sql(f"update book_processing_jobs set cursor=99 where id='{target}' and lease_token='{old}' returning id;")=='UPDATE 0'
    sql("update book_processing_jobs set run_state='paused',lease_token=null,lease_until=null;")
    sql(f"update book_processing_jobs set run_state='staging',attempts=3,source_import=source_import||'{{\"state\":\"processing\"}}',lease_until=now()-interval '1 second' where id='{target}';")
    assert scalar('select (public.claim_native_book_job()).id')['id'] is None
    assert sql(f"select run_state||':'||(source_import->>'state') from book_processing_jobs where id='{target}';")=='failed:failed'
    print('PASS expired native lease recovery, stale-token rejection and exhausted-attempt failure')
    sql("update book_processing_jobs set run_state='queued',attempts=0,next_attempt_at=now(),lease_token=null,lease_until=null;")
    provider=scalar('select (public.claim_book_processing_job()).id')['id']
    assert provider
    sql(f"update book_processing_jobs set run_state='staging',source_import=source_import||'{{\"state\":\"queued\"}}' where id<>'{provider}';")
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        shared=list(pool.map(lambda _:scalar('select (public.claim_native_book_job()).id'),range(10)))
    assert len([v for v in shared if v['id']])==3
    assert int(sql("select count(*) from book_processing_jobs where lease_until>now();"))==4
    assert sql("select has_function_privilege('authenticated','public.claim_native_book_job()','EXECUTE');")=='f'
    assert sql("select has_function_privilege('anon','public.claim_native_book_job()','EXECUTE');")=='f'
    print('PASS native/provider shared capacity and RPC denied to anon/authenticated')
finally:
    if started:subprocess.run([str(BIN/'pg_ctl'),'-D',str(area/'data'),'-m','immediate','stop'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    shutil.rmtree(area,ignore_errors=True)
