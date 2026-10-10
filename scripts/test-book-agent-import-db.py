"""Run in the isolated queue + real pgvector harness after library tests."""
import json,concurrent.futures,tempfile
from pathlib import Path
sql('alter table public.book_processing_jobs add column billing_required boolean not null default true;alter table public.book_processing_jobs add column billing jsonb;')
sql((ROOT/'supabase/migrations/20261010081943_book_agent_import.sql').read_text())
owner='00000000-0000-4000-8000-000000000081';other='00000000-0000-4000-8000-000000000082'
sql(f"insert into auth.users values('{owner}'),('{other}');")
payload=json.loads((Path(tempfile.gettempdir())/'awb-agent-import-fixture.json').read_text())
quote=lambda s:"'"+str(s).replace("'","''")+"'"
job=json.dumps(payload['job']);sha=payload['packageSha']
def call(user=owner):return json.loads(sql(f"select import_agent_book('{user}','{sha}',{quote(job)}::jsonb);"))['id']
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:ids=list(pool.map(lambda _:call(),range(4)))
assert len(set(ids))==1;book=ids[0]
assert sql(f"select count(*) from book_processing_jobs where user_id='{owner}';")=='1'
assert sql(f"select count(*) from book_library_entries where user_id='{owner}' and job_id='{book}';")=='1'
assert sql(f"select count(*) from search_book_library('{owner}','commitments',null,'{book}');")=='1'
assert sql(f"select count(*) from search_book_library('{other}','commitments',null,'{book}');")=='0'
assert sql(f"select billing_required and billing->>'chargedCents'='0' and run_state='complete' and cover_status='none' from book_processing_jobs where id='{book}';")=='t'
assert sql(f"select count(*) from book_model_usage where job_id='{book}';")=='0'
assert sql(f"select count(*) from book_library_entries e cross join lateral book_library_citations((select notes->0 from book_processing_jobs where id='{book}'),(select source_text from book_processing_jobs where id='{book}')) c where e.job_id='{book}';")=='1'
try:sql(f"set role authenticated;select import_agent_book('{owner}','{sha}',{quote(job)}::jsonb);")
except RuntimeError as e:assert 'permission denied' in str(e)
else:raise AssertionError('Untrusted client can choose an import owner')
print('PASS concurrent idempotent import, existing lexical retrieval and citations, cross-owner isolation, service-only RPC, zero generation receipts and paid-operation guard retained')
collection=json.loads((Path(tempfile.gettempdir())/'awb-agent-collection-fixture.json').read_text())
collection_id=json.loads(sql(f"select import_agent_book('{owner}',{quote(collection['packageSha'])},{quote(json.dumps(collection['job']))}::jsonb);"))['id']
assert sql(f"select jsonb_array_length(source_manifest) from book_processing_jobs where id='{collection_id}';")=='2'
assert sql(f"select count(*) from book_library_entries where user_id='{owner}' and job_id='{collection_id}';")=='2'
for term in ['daily','weekly']:
    assert int(sql(f"select count(*) from search_book_library('{owner}','{term}',null,'{collection_id}');"))>=1
    assert sql(f"select count(*) from search_book_library('{other}','{term}',null,'{collection_id}');")=='0'
assert sql(f"select count(*) from book_model_usage where job_id='{collection_id}';")=='0'
print('PASS combined guide persists two source identities and two retrievable sections in the existing private index, without cross-account access or generation receipts')
