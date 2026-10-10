"""Apply private library lifecycle guards and ship reader generation; no model/config changes."""
import argparse,importlib.util,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def query_client():
 spec=importlib.util.spec_from_file_location('deployment',ROOT/'scripts/deploy-book-agent-import.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m.management()
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 if not args.apply:print('Plan: add archive/deletion lifecycle guards and deploy book-process/book-import with a separate metered editorial stage.');raise SystemExit()
 q=query_client();version='20261010221500';name='book_management';sql=(ROOT/f'supabase/migrations/{version}_{name}.sql').read_text();quote=lambda s:"'"+s.replace("'","''")+"'"
 old=q(f"select statements from supabase_migrations.schema_migrations where version='{version}'",True)
 if old:
  if old[0]['statements']!=[sql]:raise RuntimeError('Migration history mismatch')
 else:q('begin;'+sql+f"\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('{version}','{name}',array[{quote(sql)}]);commit;")
 permissions=q("select p.prosecdef,has_function_privilege('anon',p.oid,'execute') anon_execute,has_function_privilege('authenticated',p.oid,'execute') user_execute,has_function_privilege('service_role',p.oid,'execute') service_execute from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname='manage_private_book'",True)
 assert permissions==[{'prosecdef':False,'anon_execute':False,'user_execute':False,'service_execute':True}]
 print('Migration and service-only lifecycle permissions verified.',flush=True)
 for fn in ['book-process','book-import']:
  subprocess.run(['/opt/homebrew/bin/supabase','functions','deploy',fn,'--project-ref','yozeqanibszoxnowmvsm','--no-verify-jwt','--use-api'],cwd=ROOT,check=True)
 print('Reader and management endpoints deployed; authenticated acceptance required.')
