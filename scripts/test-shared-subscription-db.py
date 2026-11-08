"""Real PostgreSQL: concurrent quotas, shared claims, private isolation, webhook CAS."""
from pathlib import Path
import concurrent.futures,json,os,shutil,socket,subprocess,tempfile,shlex
ROOT=Path(__file__).resolve().parents[1];BIN=Path(os.environ.get('PG_BIN','/opt/homebrew/opt/postgresql@14/bin'));area=Path(tempfile.mkdtemp(prefix='awb-shared-pg-'));started=False
with socket.socket() as sock:sock.bind(('127.0.0.1',0));port=sock.getsockname()[1]
def run(*args):
 r=subprocess.run(args,capture_output=True,text=True)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout

def sql(text,fail=False):
 r=subprocess.run([str(BIN/'psql'),'-h',str(area),'-p',str(port),'-d','postgres','-At','-v','ON_ERROR_STOP=1'],input=text,capture_output=True,text=True)
 if fail:assert r.returncode!=0,(text,r.stdout);return r.stderr
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout.strip()
def migration(name):sql((ROOT/'supabase/migrations'/name).read_text())
try:
 run(str(BIN/'initdb'),'-D',str(area/'data'),'-A','trust','--no-locale','-E','UTF8','--wal-segsize=1',*shlex.split(os.environ.get('PG_INITDB_OPTIONS','')));run(str(BIN/'pg_ctl'),'-D',str(area/'data'),'-l',str(area/'server.log'),'-o',f'-k {area} -p {port} -h 127.0.0.1 -c min_wal_size=2MB -c max_wal_size=16MB','-w','start');started=True
 sql('''create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to authenticated;
 create schema vault;create table vault.decrypted_secrets(name text,decrypted_secret text);
 create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
 create schema net;create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) returns bigint language sql as $$select 1::bigint$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql as $$select string_to_array($1,'/')$$;''')
 migration('20261005172455_add_private_book_processing.sql')
 source=(ROOT/'supabase/migrations/20261007003000_book_processing_queue.sql').read_text();sql('\n'.join(l for l in source.splitlines() if not l.startswith('create extension')))
 migration('20261007013000_long_book_processing.sql');migration('20261007023000_book_library_revisions.sql');migration('20261008180000_book_processing_completion.sql')
 sql('alter table book_processing_jobs add column billing_required boolean default true,add column archived_at timestamptz,add column source_text_sha text;')
 migration('20261106054659_hosted_question_guides.sql');migration('20261106070000_reading_guide_covers.sql');migration('20261106072605_shared_library_subscription.sql');migration('20261106184909_reader_plan_thirty_guides.sql');migration('20261106194006_reader_free_monthly_guides.sql');migration('20261108191844_complimentary_reader_access.sql')
 a,b=['00000000-0000-4000-8000-'+str(i).zfill(12) for i in (1,2)]
 sql(f"insert into auth.users values('{a}'),('{b}');insert into reader_subscriptions(user_id,customer_id,status,period_start,period_end) values('{a}','cus_a','active',now()-interval '1 day',now()+interval '29 days');")
 sql(f"insert into reading_guides(user_id,request_key,question,status) select '{a}',gen_random_uuid(),'Question '||n,'awaiting_confirmation' from generate_series(1,34)n;")
 ids=sql('select id from reading_guides order by id').splitlines()
 def confirm(id):
  try:return sql(f"select confirm_reader_guide('{a}','{id}','short');")
  except RuntimeError as e:assert 'GUIDE_LIMIT' in str(e);return None
 with concurrent.futures.ThreadPoolExecutor(max_workers=34) as pool:results=list(pool.map(confirm,ids))
 assert len([r for r in results if r])==30
 counted=[r for r in results if r];assert sql(f"select confirm_reader_guide('{a}','{counted[0]}','short');")==counted[0]
 sql(f"update reading_guides set status='ready' where id='{counted[0]}';delete from reading_guides where id='{counted[0]}';")
 assert sql("select count(*) from reader_guide_allowances where state in ('completed','reserved');")=='30'
 sql(f"update reading_guides set status='failed' where id='{counted[1]}';")
 assert sql("select count(*) from reader_guide_allowances where state in ('completed','reserved');")=='29'
 uncounted=next(id for id in ids if id not in counted);assert confirm(uncounted)==uncounted
 assert 'GUIDE_NOT_FOUND' in sql(f"select confirm_reader_guide('{b}','{uncounted}','short');",True)
 sql(f"update reader_subscriptions set period_start=now(),period_end=now()+interval '30 days' where user_id='{a}';")
 assert json.loads(sql(f"select reader_plan('{a}')"))['used']==0
 sql(f"update reader_subscriptions set status='canceled' where user_id='{a}';")
 assert not json.loads(sql(f"select reader_plan('{a}')"))['active']
 print('PASS concurrent 30-guide cap, idempotency, failures, deletion accounting, renewal, cancellation, cross-owner denial')
 # An account without any Stripe/customer row still has an atomic monthly allowance.
 free=json.loads(sql(f"select reader_plan('{b}')"));assert free['limit']==3 and free['used']==0 and not free['active'] and free['tier']=='free'
 sql(f"insert into reading_guides(user_id,request_key,question,status) select '{b}',gen_random_uuid(),'Free question '||n,'awaiting_confirmation' from generate_series(1,10)n;")
 free_ids=sql(f"select id from reading_guides where user_id='{b}' order by id").splitlines()
 def freeconfirm(id):
  try:return sql(f"select confirm_reader_guide('{b}','{id}','standard');")
  except RuntimeError as e:assert 'FREE_GUIDE_LIMIT' in str(e);return None
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:free_results=list(pool.map(freeconfirm,free_ids))
 taken=[x for x in free_results if x];assert len(taken)==3
 assert freeconfirm(taken[0])==taken[0]
 sql(f"update reading_guides set status='ready' where id='{taken[0]}';delete from reading_guides where id='{taken[0]}';")
 assert json.loads(sql(f"select reader_plan('{b}')"))['used']==3
 sql(f"update reading_guides set status='failed' where id='{taken[1]}';")
 assert json.loads(sql(f"select reader_plan('{b}')"))['used']==2
 spare=[x for x in free_ids if x not in taken];assert freeconfirm(spare[0])==spare[0]
 sql(f"delete from reading_guides where id='{taken[2]}';")
 assert json.loads(sql(f"select reader_plan('{b}')"))['used']==2
 assert freeconfirm(spare[1])==spare[1]
 # Move only test ledger rows into the past to exercise period isolation.
 sql(f"update reader_guide_allowances set period_start=period_start-interval '1 month',period_end=period_end-interval '1 month' where user_id='{b}';")
 assert json.loads(sql(f"select reader_plan('{b}')"))['used']==0
 assert freeconfirm(spare[2])==spare[2]
 assert sql(f"set time zone 'Asia/Tokyo';select (reader_plan('{b}')->>'periodEnd')::timestamptz = ((date_trunc('month',now() at time zone 'UTC')+interval '1 month') at time zone 'UTC');").splitlines()[-1]=='t'
 sql(f"insert into reader_subscriptions(user_id,customer_id,status,period_start,period_end) values('{b}','cus_b','active',now(),now()+interval '1 month');")
 upgraded=json.loads(sql(f"select reader_plan('{b}')"));assert upgraded['active'] and upgraded['limit']==30 and upgraded['used']==0
 assert freeconfirm(spare[3])==spare[3]
 assert json.loads(sql(f"select reader_plan('{b}')"))['used']==1
 sql(f"update reader_subscriptions set status='canceled' where user_id='{b}';")
 downgraded=json.loads(sql(f"select reader_plan('{b}')"));assert not downgraded['active'] and downgraded['limit']==3 and downgraded['used']==1
 print('PASS free monthly cap under ten simultaneous requests, idempotency, failure/cancel refunds, completed deletion accounting, UTC reset, upgrade and downgrade isolation')
 # Shared matching never considers a private source.
 private=sql(f"select id from create_book_processing_job('{a}','private.pdf',repeat('a',64),repeat('private source ',20),'Private','[]');")
 j1=sql(f"select id from create_shared_book('{a}','same.pdf',repeat('a',64),100,'technical');")
 j2=sql(f"select id from create_shared_book('{b}','same.pdf',repeat('a',64),100,'technical');")
 assert j1!=private
 for j in (j1,j2):sql(f"update book_processing_jobs set lease_token=gen_random_uuid(),lease_until=now()+interval '1 minute' where id='{j}';")
 def fileclaim(j):return sql(f"select claim_shared_book(id,lease_token,'file',source_sha,'{{}}') from book_processing_jobs where id='{j}';")
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:claimed=list(pool.map(fileclaim,[j1,j2]))
 assert claimed[0]==claimed[1];canonical=claimed[0]
 assert sql("select count(*) from reader_books;")=='2'
 j3=sql(f"select id from create_shared_book('{b}','different.epub',repeat('b',64),100,'text');")
 for j in (canonical,j3):sql(f"update book_processing_jobs set lease_token=gen_random_uuid(),lease_until=now()+interval '1 minute' where id='{j}';")
 patch=json.dumps({'source_text':'Canonical original text. '*10,'chunks':[],'source_manifest':[],'source_import':{'state':'complete'}})
 def textclaim(j):return sql(f"select claim_shared_book(id,lease_token,'text',repeat('c',64),'{patch}'::jsonb) from book_processing_jobs where id='{j}';")
 # canonical is deterministic by first committed claim, not title.
 assert textclaim(canonical)==canonical;assert textclaim(j3)==canonical
 assert sql("select count(*) from reader_books;")=='2'
 assert sql(f"set role authenticated;set request.jwt.claim.sub='{a}';select count(*) from book_processing_jobs;").splitlines()[-1]=='1'
 assert 'permission denied' in sql('set role anon;select * from reader_subscriptions;',True)
 assert 'permission denied' in sql(f"set role authenticated;select reader_plan('{a}');",True)
 assert 'SHARED_BOOK_IMMUTABLE' in sql(f"delete from book_processing_jobs where id='{canonical}';",True)
 print('PASS public file/text duplicate joins, private collisions, shelf associations, raw-text RLS and shared deletion protection')
 assert sql(f"select apply_reader_subscription('evt_1','{a}',0,'sub_a','active',now(),now()+interval '1 month',false);")=='t'
 assert sql(f"select apply_reader_subscription('evt_1','{a}',0,'sub_a','canceled',null,null,false);")=='t'
 assert sql(f"select apply_reader_subscription('evt_stale','{a}',0,'sub_a','canceled',null,null,false);")=='f'
 assert sql(f"select status from reader_subscriptions where user_id='{a}';")=='active'
 print('PASS webhook idempotency and stale canonical-read CAS rejection')
 # Complimentary access is server-managed, calendar-month based and independent of Stripe.
 c='00000000-0000-4000-8000-000000000003'
 sql(f"insert into auth.users values('{c}');insert into reader_complimentary_access(user_id,reason) values('{c}','Owner account');")
 comp=json.loads(sql(f"set role service_role;select reader_plan('{c}')").splitlines()[-1]);assert comp['active'] and comp['tier']=='complimentary' and comp['limit']==30 and comp['priceCents']==0
 assert sql(f"select count(*) from reader_subscriptions where user_id='{c}';")=='0'
 for role in ['anon','authenticated']:
  assert 'permission denied' in sql(f"set role {role};select * from reader_complimentary_access;",True)
  assert 'permission denied' in sql(f"set role {role};insert into reader_complimentary_access(user_id,reason) values('{b}','Self grant');",True)
 sql(f"insert into reading_guides(user_id,request_key,question,status) select '{c}',gen_random_uuid(),'Complimentary question '||n,'awaiting_confirmation' from generate_series(1,34)n;")
 comp_ids=sql(f"select id from reading_guides where user_id='{c}' order by id").splitlines()
 def compconfirm(id):
  try:return sql(f"select confirm_reader_guide('{c}','{id}','short');")
  except RuntimeError as e:assert 'GUIDE_LIMIT' in str(e);return None
 with concurrent.futures.ThreadPoolExecutor(max_workers=34) as pool:comp_results=list(pool.map(compconfirm,comp_ids))
 comp_taken=[r for r in comp_results if r];assert len(comp_taken)==30
 assert compconfirm(comp_taken[0])==comp_taken[0]
 assert json.loads(sql(f"select reader_plan('{c}')"))['used']==30
 sql(f"update reading_guides set status='failed' where id='{comp_taken[0]}';")
 assert json.loads(sql(f"select reader_plan('{c}')"))['used']==29
 sql(f"update reader_complimentary_access set revoked_at=now() where user_id='{c}';")
 assert json.loads(sql(f"select reader_plan('{c}')"))['tier']=='free'
 assert json.loads(sql(f"select reader_plan('{b}')"))['tier']=='free'
 sql(f"update reader_complimentary_access set revoked_at=null where user_id='{c}';")
 assert json.loads(sql(f"select reader_plan('{c}')"))['used']==29
 sql(f"update reader_complimentary_access set granted_at=now()-interval '2 days',expires_at=now()-interval '1 day' where user_id='{c}';")
 assert json.loads(sql(f"select reader_plan('{c}')"))['tier']=='free'
 sql(f"update reader_complimentary_access set expires_at=null where user_id='{c}';update reader_guide_allowances set period_start=period_start-interval '1 month' where user_id='{c}';")
 assert json.loads(sql(f"select reader_plan('{c}')"))['used']==0
 sql(f"insert into reader_subscriptions(user_id,customer_id,status,period_start,period_end) values('{c}','cus_c','active',now(),now()+interval '30 days');")
 assert json.loads(sql(f"select reader_plan('{c}')"))['tier']=='paid'
 print('PASS complimentary owner-only administration, 30 concurrent reservations, idempotency, failure release, revocation/expiry, monthly reset and paid precedence')
finally:
 if started:run(str(BIN/'pg_ctl'),'-D',str(area/'data'),'-m','immediate','-w','stop')
 shutil.rmtree(area)
