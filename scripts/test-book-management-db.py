"""Owner-scoped lifecycle tests in the isolated Postgres/pgvector harness."""
import json,uuid
from pathlib import Path
import tempfile
sql((ROOT/'supabase/migrations/20261010221500_book_management.sql').read_text())
payload=json.loads((Path(tempfile.gettempdir())/'awb-agent-import-fixture.json').read_text())
payload['job']['id']=str(uuid.uuid4())
owner='00000000-0000-4000-8000-000000000083';other='00000000-0000-4000-8000-000000000084'
sql(f"insert into auth.users values('{owner}'),('{other}');")
quote=lambda s:"'"+str(s).replace("'","''")+"'"
id=json.loads(sql(f"select import_agent_book('{owner}',{quote(payload['packageSha'])},{quote(json.dumps(payload['job']))}::jsonb);"))['id']
def manage(action,user=owner):return json.loads(sql(f"select manage_private_book('{user}','{id}','{action}');"))
def reject(action,pattern,user=owner):
 try:manage(action,user)
 except RuntimeError as e:assert pattern in str(e),str(e)
 else:raise AssertionError('Action unexpectedly allowed: '+action)
reject('archive','Book not found',other)
assert sql(f"select count(*) from search_book_library('{owner}','commitments',null,'{id}');")=='1'
assert manage('archive')['archived']
try:sql(f"update book_processing_jobs set run_state='queued' where id='{id}';")
except RuntimeError as e:assert 'book_archived_paused' in str(e)
else:raise AssertionError('A stale processing request revived an archived book')
assert sql(f"select count(*) from book_library_entries where job_id='{id}';")=='0'
assert sql(f"select count(*) from search_book_library('{owner}','commitments',null,'{id}');")=='0'
assert not manage('restore')['archived']
assert sql(f"select count(*) from search_book_library('{owner}','commitments',null,'{id}');")=='1'
for assignment,pattern in [("lease_until=now()+interval '1 minute'",'Pause active'),("cover_lease_until=now()+interval '1 minute'",'Pause active'),("billing='{\"state\":\"held\"}'",'settle usage'),("source_import='{\"state\":\"processing\"}'",'Pause active')]:
 sql(f"update book_processing_jobs set {assignment} where id='{id}';");reject('archive',pattern)
 sql(f"update book_processing_jobs set lease_until=null,cover_lease_until=null,billing=null,source_import=null where id='{id}';")
# Add a revision to verify a single lifecycle action covers the entire history.
revision=json.loads(sql(f"select to_json(create_book_revision('{owner}','{id}','additional.txt','{'a'*64}','append','{{}}'));"))['id']
sql(f"update book_processing_jobs set status='ready',run_state='complete',artifacts=(select artifacts from book_processing_jobs where id='{id}') where id='{revision}';select activate_book_revision('{owner}','{revision}');")
manage('archive');assert sql(f"select count(*) from book_processing_jobs where book_id='{id}' and archived_at is not null;")=='2'
manage('restore');assert sql(f"select count(*) from book_processing_jobs where book_id='{id}' and archived_at is null;")=='2'
reject('finish-delete','Prepare deletion')
prepared=manage('prepare-delete');assert len(prepared['revisions'])==2
reject('restore','Deletion is in progress');reject('archive','Deletion is in progress')
assert len(manage('prepare-delete')['revisions'])==2,'Storage cleanup can safely retry'
assert manage('finish-delete')['deleted'];assert sql(f"select count(*) from book_processing_jobs where book_id='{id}';")=='0'
try:sql(f"set role authenticated;select manage_private_book('{owner}','{id}','archive');")
except RuntimeError as e:assert 'permission denied' in str(e)
else:raise AssertionError('Client can bypass owner verification')
print('PASS archive/restore retrieval exclusion, owner isolation, active lease/billing guards, all revisions, retryable deletion, restore/delete race guard and service-only permissions')
