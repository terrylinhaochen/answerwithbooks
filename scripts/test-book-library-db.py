"""Loaded by test-book-queue-db.py with BOOK_LIBRARY_DB_TEST=1.
Uses a locally built pgvector .so without modifying the system installation.
"""
from pathlib import Path
import os,json,time,concurrent.futures
vector_root=Path(os.environ['PGVECTOR_TEST_ROOT'])
vector_sql=(vector_root/'sql/vector--0.8.2.sql').read_text()
vector_sql='\n'.join(line for line in vector_sql.splitlines() if not line.startswith('\\'))
vector_sql=vector_sql.replace('MODULE_PATHNAME',str(vector_root/'vector'))
sql('create schema extensions;set search_path=extensions,public;'+vector_sql+';set search_path=public;')
migration=(ROOT/'supabase/migrations/20261008160000_book_library_retrieval.sql').read_text()
sql('\n'.join(line for line in migration.splitlines() if not line.startswith('create extension')))
quote=lambda value:"'"+str(value).replace("'","''")+"'"
owner='00000000-0000-4000-8000-000000000070';other='00000000-0000-4000-8000-000000000071'
sql(f"insert into auth.users values('{owner}'),('{other}');")
notes=[{'id':'ch01','summary':'Specialization and division of labor depend on a market for surplus output.','sourceRefs':[{'startLine':1,'endLine':2}],'ideas':[{'name':'Market extent','explanation':'Exchange supports specialization.','steps':['Check demand.'],'limits':'Historical explanation, not a universal prescription.','sourceRefs':[{'startLine':1,'endLine':2}]}]}]
for who in [owner,other]:
 sql(f"insert into book_processing_jobs(user_id,source_name,source_sha,source_text,title,status,run_state,notes,artifacts) values('{who}','smith.md',repeat('a',64),repeat('Exchange supports specialization. ',5),'Smith market extent','ready','complete',{quote(json.dumps(notes))},'{{\"skill/SKILL.md\":\"Skill\"}}');")
book=sql(f"select id from book_processing_jobs where user_id='{owner}';")
search=lambda who,query,embedding='null':json.loads(sql(f"select coalesce(json_agg(row),'[]') from public.search_book_library('{who}',{quote(query)},{embedding}) row;"))
hits=search(owner,'specialization');assert len(hits)==1 and hits[0]['revision_id']==book
assert search(owner,'astrophysics quasar proton')==[]
try:sql(f"set role authenticated;select * from public.search_book_library('{other}','specialization');")
except RuntimeError as e:assert 'permission denied' in str(e)
else:raise AssertionError('Search RPC callable by untrusted client')
try:sql('set role authenticated;select * from book_library_entries;')
except RuntimeError as e:assert 'permission denied' in str(e)
else:raise AssertionError('Raw index accessible to user')
print('PASS lexical retrieval, unrelated empty result, verified owner scope and service-only index/RPC')
excerpt_note={'sourceRefs':[{'startLine':2,'endLine':4},{'startLine':0,'endLine':99}],'ideas':[]}
excerpt_source='first\nsecond evidence\n'+'x'*2000+'\nlast'
excerpts=json.loads(sql(f"select book_library_citations({quote(json.dumps(excerpt_note))},{quote(excerpt_source)});"))
assert len(excerpts)==1 and excerpts[0]['excerpt'].startswith('2: second evidence\n3: ')
assert excerpts[0]['endLine']==3 and excerpts[0]['truncated'] and excerpts[0]['requestedEndLine']==4
assert len(excerpts[0]['excerpt'])<=1000
print('PASS exact bounded SQL citation excerpts, invalid range exclusion and truthful truncation')
entry=hits[0]['entry_id']
rows=json.loads(sql(f"select coalesce(json_agg(row),'[]') from public.book_library_evidence('{other}',array['{entry}']::uuid[]) row;"));assert rows==[]
sql(f"update book_processing_jobs set is_current=false where id='{book}';")
assert search(owner,'specialization')==[]
assert sql(f"select count(*) from book_library_entries where job_id='{book}';")=='0'
sql(f"update book_processing_jobs set is_current=true where id='{book}';")
assert len(search(owner,'specialization'))==1
sql(f"update book_processing_jobs set run_state='paused' where id='{book}';")
assert search(owner,'specialization')==[]
sql(f"update book_processing_jobs set run_state='complete' where id='{book}';")
print('PASS current revision, paused/delete-in-progress exclusion and cross-owner hydration isolation')
for _ in range(30):assert sql(f"select allow_book_library_search('{owner}');")=='t'
assert sql(f"select allow_book_library_search('{owner}');")=='f'
assert sql(f"select allow_book_library_search('{other}');")=='t'
print('PASS atomic per-account query limit without storing questions')
# Optional actual provider vectors: public source + synthetic distractors, no user data.
if os.environ.get('BOOK_RETRIEVAL_FIXTURE'):
 fixture=json.loads(Path(os.environ['BOOK_RETRIEVAL_FIXTURE']).read_text())
 semantic_owner='00000000-0000-4000-8000-000000000072'
 sql(f"insert into auth.users values('{semantic_owner}');")
 labels={}
 for index,row in enumerate(fixture['corpus']):
  inserted=sql(f"insert into book_processing_jobs(user_id,source_name,source_sha,source_text,title,status,run_state,notes,artifacts) values('{semantic_owner}','fixture.md',lpad(to_hex({index+1}),64,'0'),repeat('Public or synthetic fixture. ',6),{quote(row['label'])},'ready','complete',{quote(json.dumps([row['note']]))},'{{\"skill/SKILL.md\":\"Skill\"}}') returning id;").splitlines()[0]
  labels[inserted]=row['label']
  sql(f"update book_library_entries set embedding={quote(json.dumps(row['vector']))}::extensions.vector,embedding_model='text-embedding-3-small:512:v1' where job_id='{inserted}';")
 evaluation=[]
 for query in fixture['queries']:
  hits=search(semantic_owner,query['question'],quote(json.dumps(query['vector']))+'::extensions.vector')
  top=labels[hits[0]['revision_id']] if hits else None
  evaluation.append({'question':query['question'],'expected':query['expected'],'top':top,'top1':top==query['expected'],'top3':[labels[h['revision_id']] for h in hits[:3]],'recallAt3':query['expected'] in [labels[h['revision_id']] for h in hits[:3]]})
 print('LIVE EMBEDDING FIXTURE',json.dumps(evaluation,ensure_ascii=False),flush=True)
 assert all(result['recallAt3'] for result in evaluation),evaluation
 print('PASS real model candidate recall at 3; top-1 accuracy reported separately, no perfect ranking claim',flush=True)

# 1,000 books, ten source sections each: exact owner-filtered ranking must stay bounded.
scale_notes=[dict(notes[0],id=f'ch{i:02d}') for i in range(1,11)]
sql(f"insert into book_processing_jobs(user_id,source_name,source_sha,source_text,title,status,run_state,notes,artifacts) select '{owner}','scale.md',lpad(to_hex(n),64,'0'),repeat('A supplied test source. ',6),'Fixture '||n,'ready','complete',{quote(json.dumps(scale_notes))},'{{\"skill/SKILL.md\":\"Skill\"}}' from generate_series(1,1000) n;")
vector=quote(json.dumps([1]+[0]*511))+'::extensions.vector'
sql(f"update book_library_entries set embedding={vector},embedding_model='text-embedding-3-small:512:v1' where user_id='{owner}';")
times=[]
for _ in range(3):
 start=time.perf_counter();result=search(owner,'specialization',vector);times.append(round((time.perf_counter()-start)*1000,1));assert len(result)==24
assert all(hit['similarity']==1 for hit in result)
print('PASS actual pgvector + FTS search over 10,001 owner entries; 24 candidates; milliseconds including psql startup:',times)
# Reset embeddings to exercise durable claims and stale hash/lease rejection.
sql(f"update book_library_entries set embedding=null,embedding_model=null where user_id='{owner}';")
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 claims=list(pool.map(lambda _:json.loads(sql("select coalesce(json_agg(row),'[]') from claim_book_library_entries() row;")),range(6)))
nonempty=[batch for batch in claims if batch];assert len(nonempty)<=2
claimed=[row for batch in nonempty for row in batch];assert len({r['id'] for r in claimed})==len(claimed)
assert all(len(batch)<=16 for batch in nonempty)
assert all(len({r['user_id'] for r in batch})==1 for batch in nonempty)
first=next(r for r in claimed if r['user_id']==owner)
sql(f"update book_processing_jobs set title='Changed source metadata' where id='{first['job_id']}';")
assert sql(f"update book_library_entries set embedding={vector} where id='{first['id']}' and lease_token='{first['lease_token']}' returning id;")=='UPDATE 0'
print('PASS bounded parallel embedding claims, one owner per batch and stale embedding rejection')
sql(f"delete from book_processing_jobs where user_id='{other}';")
assert sql(f"select count(*) from book_library_entries where user_id='{other}';")=='0'
assert sql("select count(*) from cron.job where jobname='answerwithbooks-library';")=='1'
sql("insert into vault.decrypted_secrets values('book_library_url','https://example.invalid/book-library');select wake_book_library();")
assert int(sql("select count(*) from net.requests where url='https://example.invalid/book-library';"))==1
print('PASS deletion cascades, scheduled recovery and separately configured indexing endpoint')
