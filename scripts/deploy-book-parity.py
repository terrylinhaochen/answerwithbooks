"""Apply the reviewed book library/native migrations and deploy both endpoints.

Requires explicit production authorization and --apply. Credentials remain in
memory; an optional worker config is written with owner-only filesystem access.
"""
import argparse
import importlib.util
import json
import os
import secrets
import subprocess
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
PROJECT='yozeqanibszoxnowmvsm'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply',action='store_true')
    parser.add_argument('--worker-config',type=Path)
    args=parser.parse_args()
    if not args.apply:
        print('Plan: apply stable book revisions and native extraction queue; deploy book-process and book-native; provision a worker-only credential. No changes applied.')
        return
    spec=importlib.util.spec_from_file_location('auth_setup',ROOT/'scripts/sync-auth-email-templates.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    token=module.access_token()
    def api(path,body):
        request=Request('https://api.supabase.com/v1/projects/'+PROJECT+path,method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},data=json.dumps(body).encode())
        with urlopen(request,timeout=120) as response:
            raw=response.read()
            return json.loads(raw) if raw else None
    def query(sql,read_only=False):return api('/database/query',{'query':sql,'read_only':read_only})
    def quote(value):return "'"+value.replace("'","''")+"'"
    for version,name in [('20261007023000','book_library_revisions'),('20261007030000','native_book_worker'),('20261007031000','book_revision_delete_guards')]:
        migration=(ROOT/f'supabase/migrations/{version}_{name}.sql').read_text()
        existing=query('select statements from supabase_migrations.schema_migrations where version='+quote(version),True)
        if existing:
            if existing[0]['statements']!=[migration]:raise RuntimeError('Recorded migration differs from the reviewed file: '+version)
        else:
            query('begin;\n'+migration+'\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('+quote(version)+','+quote(name)+',array['+quote(migration)+']);\ncommit;')
        print(name+' migration verified.')
    rows=query("select decrypted_secret from vault.decrypted_secrets where name='book_native_worker'")
    secret=rows[0]['decrypted_secret'] if rows else secrets.token_urlsafe(48)
    if not rows:query('select vault.create_secret('+quote(secret)+",'book_native_worker')")
    api('/secrets',[{'name':'BOOK_NATIVE_WORKER_SECRET','value':secret}])
    print('Worker-only secret configured.')
    for name in ['book-process','book-native']:
        subprocess.run(['/opt/homebrew/bin/supabase','functions','deploy',name,'--project-ref',PROJECT,'--no-verify-jwt','--use-api'],cwd=ROOT,check=True)
    if args.worker_config:
        target=args.worker_config.resolve()
        # Never write this config into source control or a world-readable file.
        if target.is_relative_to(ROOT):raise RuntimeError('Worker credentials must be outside the checkout.')
        descriptor=os.open(target,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
        os.fchmod(descriptor,0o600)
        with os.fdopen(descriptor,'w') as output:
            json.dump({'endpoint':f'https://{PROJECT}.supabase.co/functions/v1/book-native','workerSecret':secret},output)
        print('Private worker bootstrap config written.')
    print('Endpoints deployed; native availability requires a live, validated worker.')

if __name__=='__main__':main()
