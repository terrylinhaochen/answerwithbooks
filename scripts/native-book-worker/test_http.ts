// Execute the actual native Edge handler with intercepted Auth/DB/Storage HTTP.
import assert from 'node:assert/strict';
Deno.env.set('SUPABASE_URL','https://native-test.invalid');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','synthetic-service');
Deno.env.set('BOOK_NATIVE_WORKER_SECRET','synthetic-worker');
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
let handler:any;
Deno.serve=((h:any)=>{handler=h;return {} as any;}) as typeof Deno.serve;
const jobs:any[]=[],files=new Map<string,Uint8Array>();let wakes=0,lastSeen:string|null=null;
const json=(data:any,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
const hash=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
const active=(j:any)=>j.lease_until&&Date.parse(j.lease_until)>Date.now();
function match(j:any,p:URLSearchParams){
 for(const [key,val] of p){
  if(key==='select')continue;
  if(key==='or'){if(active(j))return false;continue;}
  if(val.startsWith('eq.')&&String(j[key])!==val.slice(3))return false;
  if(val.startsWith('gt.')&&!(Date.parse(j[key])>Date.parse(val.slice(3))))return false;
 }
 return true;
}
globalThis.fetch=async(input:any,init?:RequestInit)=>{
 const req=new Request(input,init),url=new URL(req.url),p=url.pathname;
 assert.equal(url.hostname,'native-test.invalid','No external request permitted');
 const body=req.method==='GET'?null:await req.clone().json().catch(()=>null);
 if(p==='/auth/v1/user')return req.headers.get('authorization')==='Bearer user-token'?json({id:owner}):req.headers.get('authorization')==='Bearer other-token'?json({id:other}):json({message:'Unauthorized'},401);
 if(p.startsWith('/rest/v1/rpc/')){
  const action=p.split('/').at(-1);
  if(action==='wake_book_processing'){wakes++;return json(null);}
  if(action==='create_book_processing_job'||action==='create_book_revision'){
   let job=jobs.find(j=>j.user_id===body.p_user&&j.source_sha===body.p_sha);
   if(!job){const parent=jobs.find(j=>j.id===body.p_parent);job={id:crypto.randomUUID(),user_id:body.p_user,source_name:body.p_name,source_sha:body.p_sha,source_text:body.p_text||'Pending source. '.repeat(10),title:body.p_title||parent?.title,author:'Fixture author',chunks:[],notes:[],cursor:0,overview_notes:[],status:'uploaded',run_state:'staging',attempts:0,lease_token:null,lease_until:null,updated_at:new Date().toISOString(),options:{},book_id:parent?.book_id||crypto.randomUUID(),revision_kind:body.p_kind||'base',parent_job_id:parent?.id,revision:parent?parent.revision+1:1};jobs.push(job);}
   return json(job);
  }
  if(action==='claim_native_book_job'){
   const j=jobs.find(j=>j.run_state==='staging'&&j.source_import?.kind==='native'&&['queued','processing'].includes(j.source_import.state)&&!active(j)&&j.attempts<3&&Date.parse(j.next_attempt_at)<=Date.now());
   if(!j)return json(null);j.attempts++;j.source_import.state='processing';j.lease_token=crypto.randomUUID();j.lease_until=new Date(Date.now()+900000).toISOString();return json(j);
  }
  throw Error('Unexpected RPC '+action);
 }
 if(p==='/rest/v1/book_native_worker_health'){if(req.method!=='GET')lastSeen=body.last_seen_at;return req.method==='GET'?json(lastSeen?{last_seen_at:lastSeen}:null):json(null);}
 if(p==='/rest/v1/book_processing_jobs'){
  const selected=jobs.filter(j=>match(j,url.searchParams));
  if(req.method==='PATCH')selected.forEach(j=>Object.assign(j,body));
  const single=req.headers.get('accept')?.includes('application/vnd.pgrst.object+json');
  return single?(selected.length===1?json(selected[0]):json({code:'PGRST116',details:'The result contains 0 rows'},406)):json(selected);
 }
 if(p.startsWith('/storage/v1/object/upload/sign/'))return json({url:p.replace('/storage/v1','')+'?token=synthetic',token:'synthetic'});
 if(p.startsWith('/storage/v1/object/sign/'))return json({signedURL:p.replace('/storage/v1','')+'?token=synthetic'});
 if(p==='/storage/v1/object/private-books'&&req.method==='DELETE'){for(const path of body.prefixes)files.delete(path);return json([]);}
 if(p.startsWith('/storage/v1/object/')){
  const key=decodeURIComponent(p.replace(/^\/storage\/v1\/object\/(?:authenticated\/)?private-books\//,''));
  const value=files.get(key);return value?new Response(value):json({message:'Missing'},404);
 }
 throw Error('Unexpected request '+p);
};
await import('../../supabase/functions/book-native/index.ts');
async function call(body:any,token='user-token',origin?:string){
 const res=await handler(new Request('https://native-test.invalid/functions/v1/book-native',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:typeof body==='string'?body:JSON.stringify(body)}));
 return {status:res.status,body:await res.json()};
}
const original=new TextEncoder().encode('Synthetic MOBI bytes are only an HTTP protocol fixture.'),fingerprint=await hash(original);
const text='# Chapter 1\n'+('Choose a bounded experiment and compare observations with a recorded prediction.\n').repeat(8);
const textBytes=new TextEncoder().encode(text),textSha=await hash(textBytes);
assert.equal((await call({action:'health'})).body.available,false,'A configured secret does not prove a live worker');
assert.equal((await call('{')).status,400);
assert.equal((await call({action:'claim'})).status,403);
assert.equal((await call({action:'prepare',name:'x.pdf'},'invalid')).status,401);
assert.equal((await call({action:'health'},'none','https://bad.invalid')).status,403);
assert.equal((await call({action:'prepare',url:'https://bad.invalid/secret'})).status,400);
assert.equal((await call({action:'prepare',name:'x.pdf',size:original.length,sha:fingerprint,extractionMode:'text'})).status,400);
const created=await call({action:'prepare',name:'fixture.mobi',size:original.length,sha:fingerprint,options:{depth:'reference'}});
assert.equal(created.status,200,JSON.stringify(created.body));assert.ok(created.body.upload);assert.equal(created.body.textUpload,undefined);
const id=created.body.job.id,j=jobs[0];assert.equal(j.run_state,'staging');assert.equal(j.source_import.state,'awaiting_upload');assert.equal(j.chunks.length,0);
assert.equal((await call({action:'finalize',id},'other-token')).status,404);
assert.equal((await call({action:'claim'},'synthetic-worker')).body.idle,true,'Unverified originals cannot be claimed');
assert.equal((await call({action:'health'})).body.available,true);
files.set(`${owner}/${id}/source`,new TextEncoder().encode('wrong'));
assert.equal((await call({action:'finalize',id})).status,400);assert.equal(j.source_import.state,'awaiting_upload');assert.equal(j.lease_token,null);
files.set(`${owner}/${id}/source`,original);
assert.equal((await call({action:'finalize',id})).body.job.source_import.state,'queued');assert.equal(j.run_state,'staging');assert.equal(wakes,0);
const pending=await call({action:'prepare',name:'fixture.mobi',size:original.length,sha:fingerprint});assert.equal(pending.body.upload,undefined,'Do not overwrite queued originals');
let claimed=await call({action:'claim'},'synthetic-worker');assert.equal(claimed.status,200);assert.ok(claimed.body.downloadUrl);assert.ok(claimed.body.upload.signedUrl);
let token=claimed.body.job.leaseToken;const fields={id,leaseToken:token};
assert.equal(claimed.body.job.source_text,undefined);assert.equal((await call({action:'heartbeat',...fields})).status,403);
assert.equal((await call({action:'heartbeat',...fields},'synthetic-worker')).status,200);
assert.equal((await call({action:'heartbeat',id,leaseToken:crypto.randomUUID()},'synthetic-worker')).status,409);
const path=`${owner}/${id}/native-${token}-extracted-source.txt`;
files.set(path,new TextEncoder().encode('corrupt'));
assert.equal((await call({action:'complete',...fields,textSha,textBytes:textBytes.length,headings:[]},'synthetic-worker')).status,400);assert.equal(j.run_state,'staging');
files.set(path,textBytes);
assert.equal((await call({action:'complete',...fields,textSha,textBytes:textBytes.length,headings:[{line:9999,title:'invalid'}]},'synthetic-worker')).status,400);
let completed=await call({action:'complete',...fields,textSha,textBytes:textBytes.length,headings:[{line:1,title:'Chapter 1'}],metadata:{extractor:'fixture',secret:'discard'}},'synthetic-worker');
assert.equal(completed.status,200,JSON.stringify(completed.body));assert.equal(completed.body.completed,true);assert.equal(j.run_state,'queued');assert.equal(j.status,'processing');assert.ok(j.chunks.length);assert.equal(j.source_text,text);assert.equal(j.source_import.metadata.secret,undefined);assert.equal(j.lease_token,null);assert.equal(j.attempts,0);assert.equal(wakes,1);assert.equal(files.has(path),false);
assert.equal((await call({action:'complete',...fields},'synthetic-worker')).body.completed,true,'Completion response loss must be idempotent');assert.equal(wakes,1);
console.log('PASS auth, owner isolation, staging gate, exact hashes and sizes, private attempt uploads, heartbeat, stale lease rejection, source finalization and idempotent complete');
// Retry exhausted native jobs without routing their placeholder into provider work.
j.status='uploaded';j.run_state='staging';j.attempts=2;j.source_import.state='queued';j.next_attempt_at=new Date(0).toISOString();
claimed=await call({action:'claim'},'synthetic-worker');token=claimed.body.job.leaseToken;
const failed=await call({action:'fail',id,leaseToken:token,code:'timeout',message:'Do not persist arbitrary worker output'},'synthetic-worker');
assert.equal(failed.body.retrying,false);assert.equal(j.run_state,'failed');assert.equal(j.source_import.state,'failed');assert.equal(j.error,'Native extraction exceeded its time limit.');
assert.equal((await call({action:'retry',id},'other-token')).status,404);assert.equal((await call({action:'retry',id})).body.job.run_state,'staging');assert.equal(j.attempts,0);assert.equal(j.source_import.state,'queued');
// Revisions preserve the existing owner and reuse finalized notes when appending.
j.status='ready';j.run_state='complete';j.notes=j.chunks.map(()=>({summary:'existing note'}));j.cursor=j.notes.length;j.source_import.state='complete';
const appendedOriginal=new TextEncoder().encode('Distinct synthetic source for the new append revision.'),appendedSha=await hash(appendedOriginal);
const revision=await call({action:'prepare',name:'append.mobi',size:appendedOriginal.length,sha:appendedSha,parentId:id,revisionKind:'append'});
assert.equal(revision.status,200,JSON.stringify(revision.body));assert.ok(revision.body.upload);
assert.equal((await call({action:'prepare',name:'append.mobi',size:original.length,sha:'b'.repeat(64),parentId:id,revisionKind:'replace'},'other-token')).status,404);
console.log('PASS bounded retries, safe failure messages, owner-only retry and revision parent checks');

const rid=revision.body.job.id;files.set(`${owner}/${rid}/source`,appendedOriginal);
assert.equal((await call({action:'finalize',id:rid})).status,200);
const appendClaim=await call({action:'claim'},'synthetic-worker'),appendLease=appendClaim.body.job.leaseToken;
files.set(`${owner}/${rid}/native-${appendLease}-extracted-source.txt`,textBytes);
const appendDone=await call({action:'complete',id:rid,leaseToken:appendLease,textSha,textBytes:textBytes.length,headings:[]},'synthetic-worker');
assert.equal(appendDone.status,200,JSON.stringify(appendDone.body));const revised=jobs.find(j=>j.id===rid);
assert.equal(revised.cursor,j.notes.length);assert.deepEqual(revised.notes,j.notes);assert.equal(revised.source_text,j.source_text+'\n\n'+text);
assert.equal(revised.source_manifest.length,2);assert.equal(revised.source_manifest[1].startLine,j.source_text.split('\n').length+2);
assert.equal(j.status,'ready');assert.equal(j.source_text,text);
console.log('PASS complete native append: unchanged parent, reused notes, combined source and stable line coordinates');
