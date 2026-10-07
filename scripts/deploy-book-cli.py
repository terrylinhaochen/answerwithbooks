"""Deploy reviewed book CLI access. --apply requires explicit production approval."""
import argparse, importlib.util, json, subprocess, urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PROJECT='yozeqanibszoxnowmvsm'
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 if not args.apply:print('Plan: add private CLI pairing/session tables and deploy book-cli-auth plus book-process.');return
 spec=importlib.util.spec_from_file_location('auth_setup',ROOT/'scripts/sync-auth-email-templates.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
 token=module.access_token()
 def query(sql):
  request=urllib.request.Request('https://api.supabase.com/v1/projects/'+PROJECT+'/database/query',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps({'query':sql,'read_only':False}).encode())
  with urllib.request.urlopen(request,timeout=60) as result:return json.load(result)
 version='20261008001000'
 if not query("select version from supabase_migrations.schema_migrations where version='"+version+"'"):
  migration=(ROOT/'supabase/migrations'/f'{version}_book_cli_access.sql').read_text()
  query('begin;\n'+migration+"\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('"+version+"','book_cli_access',ARRAY[]::text[]);\ncommit;")
 print('CLI access migration recorded.')
 for name in ['book-cli-auth','book-process']:
  subprocess.run(['/opt/homebrew/bin/supabase','functions','deploy',name,'--project-ref',PROJECT,'--no-verify-jwt','--use-api'],cwd=ROOT,check=True)
 print('Endpoints deployed. Complete authenticated acceptance before publishing npm and the website.')
if __name__=='__main__':main()
