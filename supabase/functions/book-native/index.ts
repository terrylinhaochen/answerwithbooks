import {createClient} from 'npm:@supabase/supabase-js@2.49.8';
import {bookUser} from '../_shared/book-cli-auth.mjs';
import {processingOptions} from '../_shared/book-options.mjs';
import {reusableBook,cachedBookSummary} from '../_shared/book-cache.mjs';
import {finalizeBookSource} from '../_shared/book-revisions.mjs';
import limits from '../_shared/book-upload-limits.json' with {type:'json'};

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','https://chenterry.com','http://localhost:4321','http://127.0.0.1:4321']);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const sha=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const hash=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
const check=(r:any)=>{if(r.error)throw new Error('Could not save native extraction progress. Please retry.');return r.data;};
const now=()=>new Date().toISOString();
async function workerSeen(){check(await db.from('book_native_worker_health').upsert({id:'native',last_seen_at:now()},{onConflict:'id'}));}
const publicJob=(j:any)=>({id:j.id,title:j.title,author:j.author,status:j.status,run_state:j.run_state,error:j.error,total_sections:j.chunks?.length||0,source_import:j.source_import?{kind:j.source_import.kind,state:j.source_import.state,extractionMode:j.source_import.extractionMode}:null});
const attemptPath=(j:any,token:string)=>`${j.user_id}/${j.id}/native-${token}-extracted-source.txt`;
function headingsValid(headings:any){return Array.isArray(headings)&&headings.length<=limits.maxSourceHeadings&&headings.every(h=>h&&Number.isSafeInteger(h.line)&&h.line>=1&&typeof h.title==='string'&&h.title.length<=1000);}
function metadataSafe(value:any){
 if(value==null)return {};
 if(typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>64000)throw new Error('Invalid extraction report.');
 // Preserve useful extraction provenance, never arbitrary worker keys/URLs.
 return Object.fromEntries(['extractor','upstreamCommit','structure','estimatedTokens','removedInvisible','upstreamMetadata'].filter(k=>value[k]!==undefined).map(k=>[k,value[k]]));
}
async function originalValid(j:any){
 const blob=check(await db.storage.from('private-books').download(`${j.user_id}/${j.id}/source`));
 if(blob.size!==j.source_import.originalBytes||blob.size>limits.maxFileBytes||await hash(await blob.arrayBuffer())!==j.source_sha)throw new Error('The original upload is incomplete or changed. Upload the same file to retry.');
}

Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://answerwithbooks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 try{
  if(Number(req.headers.get('content-length')||0)>8500000)return reply({error:'Request too large'},413);
  const raw=await req.text();if(raw.length>2100000)return reply({error:'Request too large'},413);
  let input:any;try{input=JSON.parse(raw);}catch{return reply({error:'Send a JSON object.'},400);}
  if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'Send a JSON object.'},400);
  if(['url','sourceUrl','downloadUrl','uploadUrl'].some(k=>k in input))return reply({error:'Only private signed storage transfers are accepted.'},400);
  if(input.action==='health'){
   const configured=!!Deno.env.get('BOOK_NATIVE_WORKER_SECRET');
   const {data}=configured?await db.from('book_native_worker_health').select('last_seen_at').eq('id','native').maybeSingle():{data:null};
   const online=!!data?.last_seen_at&&Date.parse(data.last_seen_at)>Date.now()-180000;
   return reply({available:configured&&online,worker_configured:configured,worker_online:online,formats:['pdf','mobi','azw','azw3'],technical_pdf:true,max_file_bytes:limits.maxFileBytes,max_text_characters:limits.maxTextCharacters});
  }
  const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!bearer)return reply({error:'Authentication required'},401);
  const workerActions=['claim','heartbeat','complete','fail'];
  if(workerActions.includes(input.action)){
   const secret=Deno.env.get('BOOK_NATIVE_WORKER_SECRET');
   if(!secret||await hash(new TextEncoder().encode(secret))!==await hash(new TextEncoder().encode(bearer)))return reply({error:'Not authorized'},403);
   if(['claim','heartbeat'].includes(input.action))await workerSeen();
   if(input.action==='claim'){
    const job=check(await db.rpc('claim_native_book_job'));if(!job?.id)return reply({idle:true});
    // Tokens belong to this attempt. Expired workers cannot overwrite later text.
    const download=check(await db.storage.from('private-books').createSignedUrl(`${job.user_id}/${job.id}/source`,1800));
    const upload=check(await db.storage.from('private-books').createSignedUploadUrl(attemptPath(job,job.lease_token),{upsert:true}));
    return reply({job:{id:job.id,userId:job.user_id,leaseToken:job.lease_token,sourceSha:job.source_sha,sourceBytes:job.source_import.originalBytes,name:job.source_name,extractionMode:job.source_import.extractionMode},downloadUrl:download.signedUrl,upload,leaseSeconds:900});
   }
   if(!uuid(input.id)||!uuid(input.leaseToken))return reply({error:'Invalid extraction lease'},400);
   const job=check(await db.from('book_processing_jobs').select('*').eq('id',input.id).maybeSingle());
   if(!job||job.source_import?.kind!=='native')return reply({error:'Extraction not found'},404);
   if(input.action==='complete'&&job.source_import.state==='complete'&&job.source_import.completedLease===input.leaseToken)return reply({completed:true,id:job.id});
   if(job.lease_token!==input.leaseToken||job.run_state!=='staging'||Date.parse(job.lease_until||'')<=Date.now()||job.source_import.state!=='processing')return reply({error:'Extraction lease expired'},409);
   const update=(patch:any)=>db.from('book_processing_jobs').update(patch).eq('id',job.id).eq('lease_token',input.leaseToken).eq('run_state','staging').gt('lease_until',now()).select('id');
   if(input.action==='heartbeat'){
    const saved=check(await update({lease_until:new Date(Date.now()+900000).toISOString(),updated_at:now()}));
    return saved.length?reply({leaseSeconds:900}):reply({error:'Extraction lease expired'},409);
   }
   if(input.action==='fail'){
    const messages:any={timeout:'Native extraction exceeded its time limit.',integrity:'The downloaded source failed integrity verification.',limit:'The extracted text exceeds processing limits.',unsupported:'This file cannot be extracted with the selected native converter.',extraction:'Native extraction could not read this file.',transfer:'Native extraction could not transfer the source.'};
    const error=messages[input.code]||'Native extraction failed.',exhausted=job.attempts>=3;
    const saved=check(await update({run_state:exhausted?'failed':'staging',source_import:{...job.source_import,state:exhausted?'failed':'queued'},lease_token:null,lease_until:null,error,next_attempt_at:new Date(Date.now()+Math.min(300000,30000*2**Math.max(0,job.attempts-1))).toISOString(),updated_at:now()}));
    if(saved.length)await db.storage.from('private-books').remove([attemptPath(job,input.leaseToken)]);
    return saved.length?reply({retrying:!exhausted}):reply({error:'Extraction lease expired'},409);
   }
   if(!sha(input.textSha)||!Number.isSafeInteger(input.textBytes)||input.textBytes<100||input.textBytes>limits.maxTextBytes||!headingsValid(input.headings))return reply({error:'Invalid extracted source report'},400);
   const metadata=metadataSafe(input.metadata);
   const extracted=check(await db.storage.from('private-books').download(attemptPath(job,input.leaseToken)));
   if(extracted.size!==input.textBytes||extracted.size>limits.maxTextBytes||await hash(await extracted.arrayBuffer())!==input.textSha)return reply({error:'Extracted text failed integrity verification'},400);
   const text=new TextDecoder('utf-8',{fatal:true}).decode(await extracted.arrayBuffer());
   const lineCount=text.split('\n').length;
   if(text.length<100||text.length>limits.maxTextCharacters||input.headings.some((h:any)=>h.line>lineCount))return reply({error:'Extracted text exceeds processing limits'},400);
   const parentId=job.parent_job_id||job.source_import.parentId;
   const parent=parentId?check(await db.from('book_processing_jobs').select('*').eq('id',parentId).eq('user_id',job.user_id).maybeSingle()):undefined;
   if(parentId&&!parent)return reply({error:'Revision parent is unavailable'},409);
   const patch=await finalizeBookSource(job,text,input.headings,parent);
   const saved=check(await update({...patch,status:'processing',run_state:job.billing_required?'staging':'queued',source_import:{...job.source_import,state:'complete',textSha:input.textSha,textBytes:input.textBytes,metadata,completedLease:input.leaseToken},attempts:0,error:null,next_attempt_at:now(),lease_token:null,lease_until:null,updated_at:now()}));
   if(!saved.length)return reply({error:'Extraction lease expired'},409);
   await db.rpc('wake_book_processing',{p_count:1});
   // Retain the original; extraction text is now stored on the private job.
   await db.storage.from('private-books').remove([attemptPath(job,input.leaseToken)]);
   return reply({completed:true,id:job.id});
  }
  if(!['prepare','finalize','retry'].includes(input.action))return reply({error:'Unknown action'},400);
  const user=await bookUser(db,bearer);if(!user)return reply({error:'Sign in to access your private books.'},401);
  if(input.action==='prepare'){
   if(typeof input.name!=='string'||input.name.length<1||input.name.length>255||!Number.isSafeInteger(input.size)||input.size<1||input.size>limits.maxFileBytes||!sha(input.sha))return reply({error:'Choose a supported source up to 50 MB.'},400);
   const ext=input.name.split('.').at(-1)?.toLowerCase();
   const mode=input.extractionMode??input.options?.extractionMode??(ext==='pdf'?'technical':'text');
   if(!(ext==='pdf'&&mode==='technical'||['mobi','azw','azw3'].includes(ext)&&mode==='text'))return reply({error:'Native extraction accepts technical PDFs or MOBI/AZW/AZW3 books.'},400);
   const options={...processingOptions(input.options),extractionMode:mode};
   let parent:any;
   if(input.parentId!==undefined){
    if(!uuid(input.parentId)||!['append','replace'].includes(input.revisionKind))return reply({error:'Invalid book revision'},400);
    parent=check(await db.from('book_processing_jobs').select('*').eq('id',input.parentId).eq('user_id',user.id).maybeSingle());
    if(!parent)return reply({error:'Book not found'},404);
   }else if(input.revisionKind!==undefined)return reply({error:'Choose a parent for the revision'},400);
   const result=parent?await db.rpc('create_book_revision',{p_user:user.id,p_parent:parent.id,p_name:input.name,p_sha:input.sha,p_kind:input.revisionKind,p_options:options}):await db.rpc('create_book_processing_job',{p_user:user.id,p_name:input.name,p_sha:input.sha,p_text:'Native source upload pending. '.repeat(5),p_title:input.name.replace(/\.[^.]+$/,''),p_chunks:[]});
   if(result.error)return reply({error:result.error.message?.includes('Daily limit')?'Daily limit reached. Try again tomorrow.':'Could not prepare this source. Please retry.'},400);
   let job=result.data;
   if(reusableBook(job))return reply({job:cachedBookSummary(job),reused:true});
   if(job.cursor>0||job.status!=='uploaded')return reply({job:publicJob(job)});
   if(job.lease_until&&Date.parse(job.lease_until)>Date.now())return reply({job:publicJob(job)});
   if(job.source_import?.kind==='native'&&['queued','processing'].includes(job.source_import.state)&&job.run_state==='staging')return reply({job:publicJob(job)});
   job=check(await db.from('book_processing_jobs').update({options,run_state:'staging',source_import:{kind:'native',state:'awaiting_upload',originalBytes:input.size,extractionMode:mode,...(parent?{parentId:parent.id,revisionKind:input.revisionKind}:{})},attempts:0,error:null,lease_token:null,lease_until:null,updated_at:now()}).eq('id',job.id).eq('updated_at',job.updated_at).select().single());
   const upload=check(await db.storage.from('private-books').createSignedUploadUrl(`${user.id}/${job.id}/source`,{upsert:true}));
   return reply({job:publicJob(job),upload});
  }
  if(!uuid(input.id))return reply({error:'Invalid book ID'},400);
  const job=check(await db.from('book_processing_jobs').select('*').eq('id',input.id).eq('user_id',user.id).maybeSingle());
  if(!job)return reply({error:'Book not found'},404);
  if(job.source_import?.kind!=='native')return reply({error:'This source is not staged for native extraction'},409);
  if(input.action==='retry'){
   if(job.source_import.state!=='failed'||job.run_state!=='failed')return reply({job:publicJob(job)});
   const saved=check(await db.from('book_processing_jobs').update({run_state:'staging',source_import:{...job.source_import,state:'queued'},attempts:0,error:null,lease_token:null,lease_until:null,next_attempt_at:now(),updated_at:now()}).eq('id',job.id).eq('updated_at',job.updated_at).eq('run_state','failed').or(`lease_until.is.null,lease_until.lt.${now()}`).select().single());
   return reply({job:publicJob(saved)});
  }
  if(job.source_import.state!=='awaiting_upload')return reply({job:publicJob(job)});
  const token=crypto.randomUUID();
  const claim=check(await db.from('book_processing_jobs').update({lease_token:token,lease_until:new Date(Date.now()+140000).toISOString(),updated_at:now()}).eq('id',job.id).eq('updated_at',job.updated_at).or(`lease_until.is.null,lease_until.lt.${now()}`).select('id'));
  if(!claim.length)return reply({error:'This source is already being saved'},409);
  try{
   await originalValid(job);
   const saved=check(await db.from('book_processing_jobs').update({source_import:{...job.source_import,state:'queued'},run_state:'staging',attempts:0,error:null,next_attempt_at:now(),lease_token:null,lease_until:null,updated_at:now()}).eq('id',job.id).eq('lease_token',token).select().single());
   return reply({job:publicJob(saved)});
  }catch(e){await db.from('book_processing_jobs').update({lease_token:null,lease_until:null,updated_at:now()}).eq('id',job.id).eq('lease_token',token);throw e;}
 }catch(e){return reply({error:e instanceof Error?e.message:'Native extraction could not complete this request.'},400);}
});
