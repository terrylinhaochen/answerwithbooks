"""Real PostgreSQL migration, RLS and queue tests; no hosted changes."""
import os, subprocess, tempfile, shutil, socket
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=Path(os.environ.get('PG_BIN','/opt/homebrew/opt/postgresql@14/bin'))
area=Path(tempfile.mkdtemp(prefix='awb-reading-pg-'));started=False
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
def run(*args):
 r=subprocess.run(args,capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout

def sql(text,fail=False):
 r=subprocess.run([str(BIN/'psql'),'-h',str(area),'-p',str(port),'-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=text,capture_output=True,text=True)
 if fail:assert r.returncode!=0;return r.stderr
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
try:
 run(str(BIN/'initdb'),'-D',str(area/'data'),'-A','trust','--no-locale','-E','UTF8')
 run(str(BIN/'pg_ctl'),'-D',str(area/'data'),'-l',str(area/'server.log'),'-o',f'-k {area} -p {port} -h 127.0.0.1','-w','start');started=True
 sql("""create role anon;create role authenticated;create role service_role;create schema auth;
 create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to authenticated,anon,service_role;grant execute on function auth.uid() to authenticated;
 create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);
 create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
 create schema net;create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$select 1::bigint$$;
 create table book_processing_jobs(run_state text,next_attempt_at timestamptz,lease_until timestamptz,status text,cover_status text,cover_next_attempt_at timestamptz,cover_lease_until timestamptz);""")
 sql((ROOT/'supabase/migrations/20261106054659_hosted_question_guides.sql').read_text())
 sql((ROOT/'supabase/migrations/20261106070000_reading_guide_covers.sql').read_text())
 sql((ROOT/'supabase/migrations/20261106080000_private_guide_feedback.sql').read_text())
 a='00000000-0000-4000-8000-000000000001';b='00000000-0000-4000-8000-000000000002'
 sql(f"insert into auth.users values('{a}'),('{b}');insert into reading_guides(user_id,request_key,question) values('{a}',gen_random_uuid(),'First question'),('{a}',gen_random_uuid(),'Second question'),('{b}',gen_random_uuid(),'Other question');")
 assert sql(f"set role authenticated;set request.jwt.claim.sub='{a}';select count(*) from reading_guides;").splitlines()[-1]=='2'
 assert 'permission denied' in sql(f"set role authenticated;update reading_guides set user_id='{b}';",fail=True)
 assert 'permission denied' in sql('set role anon;select * from reading_guides;',fail=True)
 first=sql('select (claim_reading_guide()).user_id;');second=sql('select (claim_reading_guide()).user_id;');assert first!=second
 assert sql('select (claim_reading_guide()).id;')==''
 sql("update reading_guides set attempts=3,lease_until=now()-interval '1 minute' where lease_token is not null;")
 sql('select (claim_reading_guide()).id;');assert sql("select count(*) from reading_guides where status='failed';")=='2'
 assert sql(f"select consume_reading_request('{a}') from generate_series(1,11);").splitlines()==['t']*10+['f']
 sql('delete from reading_guides;')
 sql(f"insert into reading_guides(user_id,request_key,question,status,cover_status,attempts) values('{a}',gen_random_uuid(),'Cover question','ready','pending',2);")
 assert sql('select (claim_reading_guide()).id;')==''
 assert sql("select status||':'||cover_status from reading_guides;")=='ready:failed'
 sql("update reading_guides set attempts=0,cover_status='pending';")
 assert sql('select (claim_reading_guide()).status;')=='ready'
 print('Reading migration: RLS ownership, denied direct writes, queue capacity, per-owner lease, exhausted retries and daily limit passed.')
finally:
 if started:run(str(BIN/'pg_ctl'),'-D',str(area/'data'),'-m','immediate','-w','stop')
 shutil.rmtree(area)
