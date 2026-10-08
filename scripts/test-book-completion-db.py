"""Executed inside the isolated queue database, without providers or network."""
import concurrent.futures,json
sql((ROOT/'supabase/migrations/20261008180000_book_processing_completion.sql').read_text())
who='00000000-0000-4000-8000-000000000098'
sql(f"insert into auth.users values('{who}');")
for n in range(3):sql(f"insert into book_processing_jobs(user_id,source_name,source_sha,source_text,title,status,run_state,artifacts,cover_status) values('{who}','test.md',lpad(to_hex({n}),64,'0'),repeat('Public test ',12),'Test','ready','complete','{{\"skill/SKILL.md\":\"ready\"}}','pending');")
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 claims=list(pool.map(lambda _:scalar('select (claim_book_cover()).id'),range(5)))
ids=[r['id'] for r in claims if r['id']];assert len(ids)==1,ids
job=ids[0];old=sql(f"select cover_lease_token from book_processing_jobs where id='{job}';")
sql(f"update book_processing_jobs set cover_lease_until=now()-interval '1 second' where id='{job}';")
new=scalar('select (claim_book_cover()).id')['id'];assert new
assert sql(f"update book_processing_jobs set cover_error='stale' where id='{job}' and cover_lease_token='{old}' returning id;")=='UPDATE 0'
sql(f"update book_processing_jobs set cover_attempts=5,cover_lease_until=null,cover_lease_token=null where user_id='{who}';select claim_book_cover();")
assert sql(f"select bool_and(cover_status='failed' and status='ready' and run_state='complete' and artifacts is not null) from book_processing_jobs where user_id='{who}';")=='t'
try:sql('set role authenticated;select claim_book_cover();')
except RuntimeError as error:assert 'permission denied' in str(error)
else:raise AssertionError('Client can claim covers')
try:sql('set role authenticated;select * from book_model_usage;')
except RuntimeError as error:assert 'permission denied' in str(error)
else:raise AssertionError('Client can enumerate usage')
sql(f"insert into book_model_usage(job_id,user_id,phase,usage) values('{job}','{who}','processing','{{\"inputTokens\":123}}');delete from book_processing_jobs where id='{job}';")
assert sql(f"select count(*) from book_model_usage where job_id='{job}';")=='0'
print('PASS independent cover leases, account concurrency, stale rejection, bounded retries, ready packages on cover failure, private usage and deletion cascade')
