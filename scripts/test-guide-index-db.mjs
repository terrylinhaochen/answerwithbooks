// Isolated PostgreSQL (PGlite). Cosine operator is a local substitute for pgvector;
// all indexing, access filtering, invalidation, and budget SQL is the release migration.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
test('index migration: source grounding, shared/private scopes, invalidation and stable retries',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema extensions;create schema cron;create schema net;create schema vault;
 create table vault.decrypted_secrets(name text,decrypted_secret text);
 create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
 create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language sql as $$select 1::bigint$$;
 create function extensions.distance(a double precision[],b double precision[]) returns double precision language sql immutable as $$select 1-sum(x*y)/nullif(sqrt(sum(x*x)*sum(y*y)),0) from unnest(a,b) t(x,y)$$;
 create operator extensions.<=> (function=extensions.distance,leftarg=double precision[],rightarg=double precision[]);
 create table book_processing_jobs(id uuid primary key,user_id uuid,title text,author text,source_sha text,source_text_sha text,source_text text,status text default 'ready',is_current boolean default true,deletion_pending boolean default false,archived_at timestamptz,duplicate_of uuid,visibility text default 'public',artifacts jsonb);
 create table reading_guides(id uuid primary key);
 create table book_provider_rates(model text primary key,version text,input_rate numeric,cached_rate numeric,output_rate numeric);
 `);
 const migration=(await readFile(new URL('../supabase/migrations/20261109080000_guide_retrieval_and_usage.sql',import.meta.url),'utf8')).replaceAll('extensions.vector(512)','double precision[]').replaceAll('extensions.vector,uuid[]','double precision[],uuid[]');await db.exec(migration);
 const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
 const pub='10000000-0000-4000-8000-000000000001',priv='10000000-0000-4000-8000-000000000002';
 const map={sections:[{id:'ch01',summary:'Learning through collaboration.',sourceRefs:[{startLine:1,endLine:80}],scenes:[{title:'Help',account:'A friend offers help.',startLine:5,endLine:15}]}]};
 const index={chapters:[{title:'Chapter One',summary:'A collaborative beginning.',startLine:1,endLine:80}],scenes:map.sections[0].scenes};
 const artifacts=JSON.stringify({'reading/map.json':JSON.stringify(map),'reading/retrieval-index.v1.json':JSON.stringify(index)});
 for(const [id,visibility] of [[pub,'public'],[priv,'private']])await db.query('insert into book_processing_jobs(id,user_id,title,author,source_sha,source_text_sha,source_text,visibility,artifacts) values($1,$2,\'Life\',\'Writer\',\'edition\',\'text\',$3,$4,$5)',[id,a,Array.from({length:90},(_,i)=>'Original line '+i+' about helping.').join('\n'),visibility,artifacts]);
 assert.equal((await db.query('select distinct kind from guide_retrieval_entries')).rows.length,4);
 assert.equal((await db.query("select has_table_privilege('anon','guide_retrieval_entries','select') v")).rows[0].v,false);
 await db.exec("update guide_retrieval_entries set embedding=array[1.0,0.0]");
 const search=async(user,publicOnly,ids=null)=>(await db.query("select * from search_guide_index($1,'help',array[1.0,0.0],$2,$3)",[user,ids,publicOnly])).rows;
 assert.deepEqual([...new Set((await search(b,true)).map(r=>r.book_id))],[pub]);
 assert.deepEqual([...new Set((await search(b,false)).map(r=>r.book_id))],[pub]);
 assert.equal(new Set((await search(a,false)).map(r=>r.book_id)).size,2);
 assert.equal((await search(a,true,[priv])).length,0);
 const ids=(await db.query('select id from guide_retrieval_entries where job_id=$1 order by id',[pub])).rows;
 await db.query('update book_processing_jobs set artifacts=artifacts where id=$1',[pub]);assert.deepEqual((await db.query('select id from guide_retrieval_entries where job_id=$1 order by id',[pub])).rows,ids);
 await db.query("update book_processing_jobs set source_sha='revised' where id=$1",[pub]);assert.equal((await db.query('select count(embedding)::int n from guide_retrieval_entries where job_id=$1',[pub])).rows[0].n,0);
 await db.query('update book_processing_jobs set deletion_pending=true where id=$1',[pub]);assert.equal((await search(b,true)).length,0);
});
