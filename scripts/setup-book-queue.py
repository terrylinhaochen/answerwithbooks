#!/usr/bin/env python3
"""Provision the private book queue after infrastructure deployment approval.
Credentials stay in memory. Re-running preserves the existing runner secret.
"""
import argparse
import importlib.util
import json
import secrets
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'yozeqanibszoxnowmvsm'
VERSION = '20261007003000'

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Apply the reviewed migration and provision production queue infrastructure.')
    args=parser.parse_args()
    if not args.apply:
        print('Plan: add queue/options/analysis columns and six-million-character source capacity; server-only claims; max 4 concurrent jobs, max 2 per user; 10 new sources per day; private Vault runner credential; one-minute cron recovery. No changes applied.')
        return
    spec=importlib.util.spec_from_file_location('auth_setup', ROOT/'scripts/sync-auth-email-templates.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    token=module.access_token()
    def api(path, body):
        req=Request('https://api.supabase.com/v1/projects/'+PROJECT+path,data=json.dumps(body).encode(),method='POST',headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'})
        with urlopen(req,timeout=120) as response:
            raw=response.read()
            return json.loads(raw) if raw else None
    def query(sql, read_only=False):
        return api('/database/query',{'query':sql,'read_only':read_only})
    def quote(value):
        return "'"+value.replace("'","''")+"'"
    for version,name in [('20261007003000','book_processing_queue'),('20261007013000','long_book_processing')]:
        if not query("select version from supabase_migrations.schema_migrations where version="+quote(version),True):
            sql=(ROOT/f'supabase/migrations/{version}_{name}.sql').read_text()
            query('begin;\n'+sql+'\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('+quote(version)+','+quote(name)+',array['+quote(sql)+']);\ncommit;')
            print(name+' migration applied and recorded.')
    rows=query("select decrypted_secret from vault.decrypted_secrets where name='book_queue_runner'",True)
    runner=rows[0]['decrypted_secret'] if rows else secrets.token_urlsafe(48)
    api('/secrets',[{'name':'BOOK_QUEUE_RUNNER_SECRET','value':runner}])
    if not rows:query('select vault.create_secret('+quote(runner)+",'book_queue_runner')")
    endpoint='https://'+PROJECT+'.supabase.co/functions/v1/book-process'
    if not query("select id from vault.secrets where name='book_queue_url'",True):query('select vault.create_secret('+quote(endpoint)+",'book_queue_url')")
    checks=query("select jobname,schedule,active from cron.job where jobname='answerwithbooks-processing'",True)
    print(json.dumps({'scheduler':checks,'runner_secret':'configured','source_privacy':'unchanged'}))

if __name__=='__main__':main()
