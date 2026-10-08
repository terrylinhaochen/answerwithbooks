"""Deploy the reviewed hosted library/completion upgrade. Requires --apply.
Uses the existing project credential store; never prints secret values.
"""
import argparse,importlib.util,json,subprocess,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROJECT='yozeqanibszoxnowmvsm'
MIGRATIONS=[('20261008160000','book_library_retrieval'),('20261008180000','book_processing_completion')]
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 if not args.apply:
  print('Plan: apply retrieval/completion migrations, deploy book-library and book-process, select GPT-5.4 mini (none generation, low review), enable 3 concurrent sections and authenticated library indexing.');return
 spec=importlib.util.spec_from_file_location('auth_setup',ROOT/'scripts/sync-auth-email-templates.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);token=module.access_token()
 def api(path,body):
  request=urllib.request.Request('https://api.supabase.com/v1/projects/'+PROJECT+path,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps(body).encode())
  with urllib.request.urlopen(request,timeout=120) as response:
   raw=response.read();return json.loads(raw) if raw else None
 def query(sql,read_only=False):return api('/database/query',{'query':sql,'read_only':read_only})
 def quote(value):return "'"+value.replace("'","''")+"'"
 for version,name in MIGRATIONS:
  migration=(ROOT/f'supabase/migrations/{version}_{name}.sql').read_text()
  existing=query('select statements from supabase_migrations.schema_migrations where version='+quote(version),True)
  if existing:
   if existing[0]['statements']!=[migration]:raise RuntimeError('Recorded migration differs: '+version)
  else:query('begin;\n'+migration+'\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('+quote(version)+','+quote(name)+',array['+quote(migration)+']);\ncommit;')
  print(name+' migration verified.',flush=True)
 settings={'BOOK_PROCESSING_MODEL':'gpt-5.4-mini','BOOK_REVIEW_MODEL':'gpt-5.4-mini','BOOK_REASONING_EFFORT':'none','BOOK_REVIEW_REASONING_EFFORT':'low','BOOK_SECTION_CONCURRENCY':'3'}
 # Preserve the existing provider key and queue credential.
 api('/secrets',[{'name':name,'value':value} for name,value in settings.items()]);print('Mini model settings and concurrency configured.',flush=True)
 for name in ['book-library','book-process']:
  subprocess.run(['/opt/homebrew/bin/supabase','functions','deploy',name,'--project-ref',PROJECT,'--no-verify-jwt','--use-api'],cwd=ROOT,check=True)
 endpoint=f'https://{PROJECT}.supabase.co/functions/v1/book-library'
 existing=query("select id from vault.decrypted_secrets where name='book_library_url'",True)
 if existing:query('select vault.update_secret('+quote(existing[0]['id'])+'::uuid,'+quote(endpoint)+")")
 else:query('select vault.create_secret('+quote(endpoint)+",'book_library_url')")
 query('select wake_book_library();select wake_book_processing(1);')
 print('Hosted workers deployed and indexing enabled. Authenticated full-book acceptance still required.',flush=True)
if __name__=='__main__':main()
