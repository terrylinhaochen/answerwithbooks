"""Invoked inside the isolated queue database; no network or provider work."""
migration=next((ROOT/'supabase/migrations').glob('*_book_library_identity_and_status.sql'))
sql(migration.read_text())
assert sql("select bool_and(total_sections=jsonb_array_length(chunks)) from book_processing_jobs;")=='t'
row=scalar("select id,user_id from book_processing_jobs order by created_at limit 1")
id=row['id']
sql(f"update book_processing_jobs set source_text=E'Chapter 1\\nEvidence source '||repeat('evidence ',20),chunks='[{{}}]',run_state='failed',error='Synthetic source review failure' where id='{id}';")
meta=scalar(f"select source_text_sha,source_line_count,total_sections,last_error,last_error_at from book_processing_jobs where id='{id}'")
import hashlib
assert meta['source_text_sha']==hashlib.sha256(b'Chapter 1\nEvidence source '+b'evidence '*20).hexdigest()
assert meta['source_line_count']==2 and meta['total_sections']==1
assert meta['last_error']=='Synthetic source review failure' and meta['last_error_at']
sql(f"update book_processing_jobs set error=null,run_state='queued' where id='{id}';")
assert scalar(f"select last_error,last_error_at from book_processing_jobs where id='{id}'")=={k:meta[k] for k in ['last_error','last_error_at']}
assert sql("select has_function_privilege('authenticated','refresh_book_library_metadata()','execute');")=='f'
assert sql("select has_function_privilege('anon','refresh_book_library_metadata()','execute');")=='f'
print('PASS extracted fingerprints, compact source metadata, durable retry evidence and restricted trigger privileges')
