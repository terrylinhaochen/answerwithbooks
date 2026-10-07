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
    sql((ROOT/'supabase/migrations/20261008001000_book_cli_access.sql').read_text())
    owner='00000000-0000-4000-8000-000000000001'
    outsider='00000000-0000-4000-8000-000000000002'
    sql(f"insert into auth.users values('{owner}'),('{outsider}');")
    fingerprint='a'*64
    sql(f"select start_book_cli_login('{fingerprint}','ABCDEF123456','requester');")
    assert json.loads(sql(f"select poll_book_cli_login('{fingerprint}');"))['status']=='pending'
    assert sql(f"select approve_book_cli_login('ABCDEF123456','{owner}');")=='t'
    assert sql(f"select approve_book_cli_login('ABCDEF123456','{outsider}');")=='f'
    result=json.loads(sql(f"select poll_book_cli_login('{fingerprint}');"))
    assert result['status']=='authorized' and result['user_id']==owner
    assert sql('select count(*) from book_cli_pairings;')=='0'
    assert sql('select count(*) from book_cli_sessions;')=='1'
    assert json.loads(sql(f"select poll_book_cli_login('{'b'*64}');"))['status']=='expired'
    for role in ['anon','authenticated']:
        for query in ['select * from book_cli_sessions','select * from book_cli_pairings',f"select poll_book_cli_login('{fingerprint}')",f"select approve_book_cli_login('ABCDEF123456','{outsider}')"]:
            try:sql(f'set role {role};'+query+';')
            except RuntimeError as error:assert 'permission denied' in str(error)
            else:raise AssertionError('Unauthorized role accessed CLI credentials')
    assert sql(f"select revoke_book_cli_login('{fingerprint}');")=='t'
    assert json.loads(sql(f"select poll_book_cli_login('{fingerprint}');"))['status']=='expired'
    sql(f"select start_book_cli_login('{fingerprint}','AABBCC112233','second');select approve_book_cli_login('AABBCC112233','{owner}');select poll_book_cli_login('{fingerprint}');")
    sql(f"update book_cli_sessions set expires_at=now()-interval '1 second' where token_hash='{fingerprint}';")
    assert json.loads(sql(f"select poll_book_cli_login('{fingerprint}');"))['status']=='expired'
    for n in range(5):sql(f"select start_book_cli_login('{n:064x}','{n:012X}','limited');")
    try:sql(f"select start_book_cli_login('{'f'*64}','FFFFFFFFFFFF','limited');")
    except RuntimeError as error:assert 'Too many' in str(error)
    else:raise AssertionError('Rate limit missing')
    sql(f"select start_book_cli_login('{'e'*64}','EEEEEEEEEEEE','expire');update book_cli_pairings set expires_at=now()-interval '1 second' where user_code='EEEEEEEEEEEE';")
    assert sql(f"select approve_book_cli_login('EEEEEEEEEEEE','{owner}');")=='f'
    sql(f"delete from auth.users where id='{owner}';")
    assert sql('select count(*) from book_cli_sessions;')=='0'
    print('PASS CLI pairing: explicit approval, code binding, expiry, rate limits, revocation, owner deletion, and database isolation')
finally:
    if started:subprocess.run([str(BIN/'pg_ctl'),'-D',str(area/'data'),'-m','immediate','-w','stop'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    shutil.rmtree(area)
