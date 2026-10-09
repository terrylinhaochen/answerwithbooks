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

ROOT=Path(__file__).resolve().parents[1]
BIN=Path(os.environ.get('PG_BIN','/opt/homebrew/opt/postgresql@14/bin'))
area=Path(tempfile.mkdtemp(prefix='answerwithbooks-queue-pg-'))
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
started=False

def sql(text):
    result=subprocess.run([str(BIN/'psql'),'-h',str(area),'-p',str(port),'-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=text,text=True,capture_output=True)
    if result.returncode:raise RuntimeError(result.stderr)
    return result.stdout.strip()
def scalar(text):return json.loads(sql('select to_json(result) from ('+text+') result;'))
def execute(*args):subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
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
    users=[f'00000000-0000-4000-8000-{n:012d}' for n in range(1,4)]
    for user in users:
        sql(f"insert into auth.users values('{user}');")
        for n in range(6):
            sql(f"select id from public.create_book_processing_job('{user}','source-{n}.md','{n:064x}',repeat('Source text ',20),'Source {n}','[{{\"start\":1,\"end\":1,\"text\":\"1: Test\"}}]');")
    sql("update book_processing_jobs set run_state='queued';")
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        claims=list(pool.map(lambda _:scalar('select (public.claim_book_processing_job()).id'),range(12)))
    claims=[c['id'] for c in claims if c['id']]
    assert len(claims)==4 and len(set(claims))==4,claims
    assert int(sql("select max(n) from (select count(*) n from book_processing_jobs where lease_until>now() group by user_id) counts;"))<=2
    print('PASS atomic concurrent claims: 4 globally, at most 2 per owner, no double claims')
    target=claims[0];old=sql(f"select lease_token from book_processing_jobs where id='{target}';")
    sql(f"update book_processing_jobs set lease_until=now()-interval '1 second' where id='{target}';")
    new=scalar(f"select (public.claim_book_processing_job('{target}',(select user_id from book_processing_jobs where id='{target}'))).lease_token")['lease_token']
    assert new and new!=old
    assert sql(f"update book_processing_jobs set cursor=99 where id='{target}' and lease_token='{old}' returning id;")=='UPDATE 0'
    print('PASS expired leases recover and stale workers cannot overwrite progress')
    sql("update book_processing_jobs set lease_until=null,lease_token=null,run_state='paused';")
    assert scalar('select (public.claim_book_processing_job()).id')['id'] is None
    sql(f"update book_processing_jobs set run_state='queued',next_attempt_at=now()+interval '1 hour' where id='{target}';")
    assert scalar('select (public.claim_book_processing_job()).id')['id'] is None
    sql(f"update book_processing_jobs set next_attempt_at=now(),attempts=5 where id='{target}';")
    assert scalar('select (public.claim_book_processing_job()).id')['id'] is None
    assert sql(f"select run_state from book_processing_jobs where id='{target}';")=='failed'
    print('PASS pause, backoff and five-attempt stop')
    owner=users[0]
    assert int(sql(f"set role authenticated;set request.jwt.claim.sub='{owner}';select count(*) from book_processing_jobs;reset role;").splitlines()[-2])==6
    try:sql('set role authenticated;select public.claim_book_processing_job();')
    except RuntimeError as e:assert 'permission denied' in str(e)
    else:raise AssertionError('Users could claim queue jobs directly')
    print('PASS account isolation and server-only queue mutations')
    for n in range(6,10):sql(f"select id from public.create_book_processing_job('{owner}','s.md','{n:064x}',repeat('source ',30),'Book','[]');")
    before=sql(f"select count(*) from book_processing_jobs where user_id='{owner}';")
    sql(f"select id from public.create_book_processing_job('{owner}','same.md','{1:064x}',repeat('source ',30),'Book','[]');")
    assert sql(f"select count(*) from book_processing_jobs where user_id='{owner}';")==before
    try:sql(f"select id from public.create_book_processing_job('{owner}','eleven.md','{11:064x}',repeat('source ',30),'Book','[]');")
    except RuntimeError as e:assert 'Daily limit' in str(e)
    else:raise AssertionError('Quota not enforced')
    sql("insert into vault.decrypted_secrets values('book_queue_runner','synthetic-test-secret'),('book_queue_url','https://example.invalid/queue');update book_processing_jobs set run_state='queued',attempts=0,next_attempt_at=now();select public.wake_book_processing(100);")
    assert sql('select count(*) from net.requests;')=='4'
    assert sql("select bool_and(body='{"+'"action":"drain"'+"}'::jsonb) from net.requests;")=='t'
    assert sql("select count(*) from cron.job where jobname='answerwithbooks-processing' and schedule='* * * * *';")=='1'
    print('PASS duplicate reuse, 10-source quota, bounded wake-ups and scheduled recovery command')
    large=scalar(f"select (public.create_book_processing_job('{users[2]}','long.md','{'d'*64}',repeat('Bounded source ',100000),'Long source','[]')).id")['id']
    assert int(sql(f"select length(source_text) from book_processing_jobs where id='{large}';"))==1500000
    assert sql(f"select overview_notes::text from book_processing_jobs where id='{large}';")=='[]'
    print('PASS large sources persist beyond the previous character limit')
    sql((ROOT/'supabase/migrations/20261007023000_book_library_revisions.sql').read_text())
    sql((ROOT/'supabase/migrations/20261007031000_book_revision_delete_guards.sql').read_text())
    assert sql('select bool_and(book_id=id and revision=1 and is_current) from book_processing_jobs;')=='t'
    # Use a fresh account to test revision quota, ownership and atomic activation.
    revision_owner='00000000-0000-4000-8000-000000000099'
    sql(f"insert into auth.users values('{revision_owner}');")
    root=scalar(f"select (public.create_book_processing_job('{revision_owner}','base.md','{'e'*64}',repeat('source ',30),'Evidence','[]')).id")['id']
    sql(f"update book_processing_jobs set status='ready',run_state='complete',artifacts='{{\"skill/SKILL.md\":\"Evidence\"}}' where id='{root}';")
    options='{"mode":"full","depth":"study","purpose":"apply","extractionMode":"text"}'
    create_revision=lambda user,parent,sha,kind:scalar(f"select (public.create_book_revision('{user}','{parent}','extra.md','{sha}','{kind}','{options}')).id")['id']
    try:create_revision(users[1],root,'f'*64,'append')
    except RuntimeError as e:assert 'own book' in str(e)
    else:raise AssertionError('Cross-account revision allowed')
    try:create_revision(revision_owner,root,'e'*64,'append')
    except RuntimeError as e:assert 'already part' in str(e)
    else:raise AssertionError('Duplicate append allowed')
    revision=create_revision(revision_owner,root,'f'*64,'append')
    assert create_revision(revision_owner,root,'f'*64,'append')==revision
    assert sql(f"select is_current from book_processing_jobs where id='{root}';")=='t'
    assert sql(f"select revision||':'||is_current::text from book_processing_jobs where id='{revision}';")=='2:false'
    try:sql(f"select public.activate_book_revision('{revision_owner}','{revision}');")
    except RuntimeError as e:assert 'Finish processing' in str(e)
    else:raise AssertionError('Unready revision activated')
    sql(f"update book_processing_jobs set status='ready',run_state='complete',artifacts='{{\"skill/SKILL.md\":\"Revised\"}}' where id='{revision}';")
    sql(f"select public.activate_book_revision('{revision_owner}','{revision}');")
    assert sql(f"select id from book_processing_jobs where user_id='{revision_owner}' and is_current;")==revision
    assert sql(f"select count(*) from book_processing_jobs where book_id='{root}';")=='2'
    sql(f"update book_processing_jobs set run_state='paused' where id='{revision}';")
    try:create_revision(revision_owner,revision,'b'*64,'append')
    except RuntimeError as e:assert 'current' in str(e)
    else:raise AssertionError('Revision raced a pending delete')
    try:sql(f"select public.activate_book_revision('{revision_owner}','{revision}');")
    except RuntimeError as e:assert 'Finish processing' in str(e)
    else:raise AssertionError('Activation raced a pending delete')
    sql(f"update book_processing_jobs set run_state='complete' where id='{revision}';")
    try:create_revision(revision_owner,root,'c'*64,'replace')
    except RuntimeError as e:assert 'current' in str(e)
    else:raise AssertionError('Stale-parent revision allowed')
    sql(f"set role authenticated;set request.jwt.claim.sub='{revision_owner}';")
    try:sql(f"set role authenticated;select public.activate_book_revision('{revision_owner}','{revision}');")
    except RuntimeError as e:assert 'permission denied' in str(e)
    else:raise AssertionError('Direct user activation allowed')
    assert int(sql(f"set role authenticated;set request.jwt.claim.sub='{revision_owner}';select count(*) from book_processing_jobs;reset role;").splitlines()[-2])==2
    print('PASS stable book identity, independent revisions, duplicate reuse, stale-parent guard, explicit activation and account isolation')
    import runpy
    runpy.run_path(str(ROOT/'scripts/test-book-completion-db.py'),init_globals={'ROOT':ROOT,'sql':sql,'scalar':scalar})
    runpy.run_path(str(ROOT/'scripts/test-book-library-metadata-db.py'),init_globals={'ROOT':ROOT,'sql':sql,'scalar':scalar})
    if os.environ.get('BOOK_LIBRARY_DB_TEST') == '1':
        import runpy
        runpy.run_path(str(ROOT/'scripts/test-book-library-db.py'),init_globals={'ROOT':ROOT,'sql':sql,'scalar':scalar})
finally:
    if started:subprocess.run([str(BIN/'pg_ctl'),'-D',str(area/'data'),'-m','immediate','-w','stop'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    shutil.rmtree(area)
