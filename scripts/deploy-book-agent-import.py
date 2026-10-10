"""Add only the private agent-import RPC and endpoint; preserve all model/billing settings."""
import argparse,importlib.util,json,subprocess,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];PROJECT='yozeqanibszoxnowmvsm'
def management():
 spec=importlib.util.spec_from_file_location('awb_auth',ROOT/'scripts/sync-auth-email-templates.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);token=module.access_token()
 def query(sql,read_only=False):
  req=urllib.request.Request('https://api.supabase.com/v1/projects/'+PROJECT+'/database/query',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps({'query':sql,'read_only':read_only}).encode())
  with urllib.request.urlopen(req,timeout=120) as r:return json.load(r)
 return query
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 if not args.apply:print('Plan: add service-only import_agent_book RPC and deploy authenticated book-import; no changes to existing generation or billing configuration.');raise SystemExit()
 query=management();version='20261010081943';name='book_agent_import';migration=(ROOT/f'supabase/migrations/{version}_{name}.sql').read_text();quote=lambda s:"'"+s.replace("'","''")+"'"
 old=query(f"select statements from supabase_migrations.schema_migrations where version='{version}'",True)
 if old:
  if old[0]['statements']!=[migration]:raise RuntimeError('Migration history mismatch')
 else:query('begin;'+migration+f"\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('{version}','{name}',array[{quote(migration)}]);commit;")
 audit=query("select p.prosecdef,has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') user_execute,has_function_privilege('service_role',p.oid,'execute') service_execute from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname='import_agent_book'",True)
 assert len(audit)==1 and audit[0]=={'prosecdef':False,'anon_execute':False,'user_execute':False,'service_execute':True},'Import RPC permissions differ'
 print('Migration and service-only invoker permissions verified.',flush=True)
 subprocess.run(['/opt/homebrew/bin/supabase','functions','deploy','book-import','--project-ref',PROJECT,'--no-verify-jwt','--use-api'],cwd=ROOT,check=True)
 print('Private import endpoint deployed. Live client acceptance still required.')
