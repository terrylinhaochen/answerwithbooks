import {bookUser} from '../_shared/book-cli-auth.mjs';
import {reusableBook,cachedBookSummary} from '../_shared/book-cache.mjs';
import {summarizeBookGroup,overviewGroupCount,overviewGroupSize} from '../_shared/book-overview.mjs';
import {scanSkill} from '../_shared/book-skill-review.mjs';
import {processingOptions,retryPatch} from '../_shared/book-options.mjs';
import {distillSection,compileDistillation} from '../_shared/book-distillation.mjs';
import {repairBook} from '../_shared/book-repair.mjs';
import {verifyOperator} from '../_shared/operator-auth.mjs';
import {exportBookFiles} from '../_shared/book-export.mjs';
import {sanitizeSource} from '../_shared/upstream-sanitize.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { splitSource } from '../_shared/book-sections.mjs';
import uploadLimits from '../_shared/book-upload-limits.json' with {type:'json'};
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,serviceKey,{auth:{persistSession:false}});
const providerKey=()=>Deno.env.get('OPENAI_API_KEY');
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','https://chenterry.com','http://localhost:4321','http://127.0.0.1:4321']);
const hash=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
function publicJob(job:any) { const {source_text,chunks,notes,overview_notes=[],lease_token,...rest}=job;return {...rest,total_sections:chunks.length,overview_completed:overview_notes.length,overview_total:overviewGroupCount(notes)}; }
function requireOk(result:any) { if(result.error) throw new Error('Could not save processing progress. Please retry.');return result.data; }
async function modelJson(system:string,input:string) {
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${providerKey()}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('BOOK_PROCESSING_MODEL')||'gpt-4.1-mini',messages:[{role:'system',content:system},{role:'user',content:input}],response_format:{type:'json_object'},max_tokens:6000}),signal:AbortSignal.timeout(60000)});
 if(!response.ok) throw new Error(response.status===429?'The generation provider is busy or out of quota. Please retry later.':'The generation provider could not complete this section. Please retry.');
 const body=await response.json();if(body.choices?.[0]?.finish_reason!=='stop') throw new Error('The generated section was incomplete. Please retry.');
 return JSON.parse(body.choices[0].message.content);
}
async function step(job:any,token:string) {
 const patch:any={error:null,attempts:0,lease_until:null,lease_token:null,updated_at:new Date().toISOString()};
 if(job.status==='uploaded') {
  const source=requireOk(await db.storage.from('private-books').download(`${job.user_id}/${job.id}/source`));
  if(source.size>uploadLimits.maxFileBytes||await hash(await source.arrayBuffer())!==job.source_sha) throw new Error('The source upload is incomplete or changed. Upload the same file again.');
  patch.status='processing';
 } else if(job.cursor<job.chunks.length) {
  const chunk=job.chunks[job.cursor];
  const {note,title,author}=await distillSection(chunk,job.cursor,modelJson,job.options);
  patch.notes=[...job.notes,note];patch.cursor=job.cursor+1;patch.status='processing';patch.attempts=0;
  if(job.cursor===0) { if(typeof title==='string'&&title.trim()) patch.title=title.slice(0,200);if(typeof author==='string'&&author.trim()) patch.author=author.slice(0,200); }
 } else if(job.options?.mode==='analysis') {
  patch.analysis={title:job.title,author:job.author,sections:job.notes,sourceSha256:job.source_sha,createdAt:new Date().toISOString()};patch.status='analyzed';patch.run_state='complete';
 } else if((job.overview_notes||[]).length<overviewGroupCount(job.notes)) {
  const start=(job.overview_notes||[]).length*overviewGroupSize;
  patch.overview_notes=[...(job.overview_notes||[]),await summarizeBookGroup(job.notes.slice(start,start+overviewGroupSize),modelJson)];
 } else if(!job.artifacts) {
  patch.artifacts=await compileDistillation(job,job.notes,modelJson,hash);patch.status='cover';patch.attempts=0;
 } else {
  const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${providerKey()}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('BOOK_COVER_MODEL')||'gpt-image-1.5',prompt:`Create an original editorial book cover illustration for ${job.title} by ${job.author}. Warm ivory background, quiet ink linework and one muted color, symbolic visual metaphor, generous negative space. No text, letters, logos, or imitation of the publisher cover. Subject context: ${job.notes[0]?.summary?.slice(0,1000)||job.title}`,size:'1024x1536',quality:'low',n:1}),signal:AbortSignal.timeout(110000)});
  if(!response.ok) throw new Error('The book and skill are ready, but cover generation failed. Retry to finish the cover.');
  const result=await response.json();const b64=result.data?.[0]?.b64_json;if(!b64)throw new Error('No cover image was returned. Retry the cover.');
  const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const coverPath=`${job.user_id}/${job.id}/cover.png`;
  requireOk(await db.storage.from('private-books').upload(coverPath,bytes,{contentType:'image/png',upsert:true}));patch.cover_path=coverPath;patch.status='ready';patch.run_state='complete';
 }
 const saved=requireOk(await db.from('book_processing_jobs').update(patch).eq('id',job.id).eq('lease_token',token).select().single());return publicJob(saved);
}
async function wake() { await db.rpc('wake_book_processing',{p_count:1}); }
async function processClaim(claim:any) {
 try {return {job:await step(claim,claim.lease_token)};}
 catch(e) {
  const message=e instanceof Error?e.message:'Processing failed. Please retry.';
  const patch=retryPatch(claim.attempts,message);
  // Preserve a pause requested while a provider call was in flight.
  requireOk(await db.from('book_processing_jobs').update(patch).eq('id',claim.id).eq('lease_token',claim.lease_token).neq('run_state','paused'));
  requireOk(await db.from('book_processing_jobs').update({...patch,run_state:'paused'}).eq('id',claim.id).eq('lease_token',claim.lease_token).eq('run_state','paused'));
  return {error:message};
 }finally{await wake();}
}
Deno.serve(async req=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://answerwithbooks.com','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 if(origin&&!origins.has(origin))return reply({error:'Origin not allowed'},403);
 try {
  if(Number(req.headers.get('content-length')||0)>7000000)return reply({error:'Source too large'},413);
  const raw=await req.text();if(raw.length>2500000)return reply({error:'Source too large'},413);
  const input=JSON.parse(raw);if(!input||typeof input!=='object'||Array.isArray(input))return reply({error:'Send a JSON object.'},400);
  if(input.action==='health')return reply({available:!!providerKey(),formats:['pdf','epub','docx','html','rtf','txt','md','rst','adoc'],max_file_bytes:uploadLimits.maxFileBytes,max_text_characters:uploadLimits.maxTextCharacters,max_batch_files:10,daily_source_limit:10,background_processing:true,staged_uploads:true});
  const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!bearer)return reply({error:'Sign in to upload a private book.'},401);
  if(input.action==='drain') {
   const runner=Deno.env.get('BOOK_QUEUE_RUNNER_SECRET');
   if(!runner || await hash(new TextEncoder().encode(bearer))!==await hash(new TextEncoder().encode(runner)))return reply({error:'Not authorized'},403);
   if(!providerKey())return reply({error:'Generation is unavailable.'},503);
   const claim=requireOk(await db.rpc('claim_book_processing_job'));
   if(!claim?.id)return reply({idle:true});
   const result=await processClaim(claim);return reply(result.error?{error:result.error}:{processed:claim.id,status:result.job?.status},result.error?502:200);
  }
  if(input.action==='repair') {
   if(!await verifyOperator(bearer,{url,serviceKey}))return reply({error:'Repair requires server operator authorization.'},403);
   if(!/^[a-f0-9-]{36}$/i.test(input.id||''))return reply({error:'Invalid book ID'},400);
   const {data:target,error:lookupError}=await db.from('book_processing_jobs').select('*').eq('id',input.id).maybeSingle();
   if(lookupError)throw new Error('Could not load this book.');if(!target)return reply({error:'Book not found'},404);
   if(target.status!=='ready')return reply({error:'Finish processing before repairing this book.'},409);
   if(!providerKey())return reply({error:'Generation is unavailable.'},503);
   try {return reply(await repairBook({db,job:target,modelJson,hash}));}catch(e){return reply({error:e instanceof Error?e.message:'Repair failed; original preserved.'},502);}
  }
  if(bearer.startsWith('awb_cli_')&&!['list','lookup','prepare','create','finalize','enqueue','status','export','analysis-export'].includes(input.action))return reply({error:'This action is not available to agent sessions.'},403);
  const user=await bookUser(db,bearer);if(!user)return reply({error:'Sign in to access your private books.'},401);
  if(input.action==='list') {
   const offset=Number(input.offset||0);if(!Number.isSafeInteger(offset)||offset<0)return reply({error:'Invalid offset'},400);
   const jobs=requireOk(await db.from('book_processing_jobs').select('id,title,author,source_name,status,run_state,cursor,created_at,error').eq('user_id',user.id).order('created_at',{ascending:false}).order('id').range(offset,offset+99));
   return reply({books:jobs,next_offset:jobs.length===100?offset+100:null});
  }
  if(['lookup','prepare','create'].includes(input.action)) {
   if(typeof input.sha!=='string'||! /^[a-f0-9]{64}$/.test(input.sha))return reply({error:'Invalid source fingerprint.'},400);
   // Read before provider availability, extraction, quotas, or signed uploads.
   const existing=requireOk(await db.from('book_processing_jobs').select('id,title,status,run_state').eq('user_id',user.id).eq('source_sha',input.sha).maybeSingle());
   if(reusableBook(existing))return reply({job:cachedBookSummary(existing),reused:true});
   if(input.action==='lookup')return reply({job:null,reused:false});
  }
  if(input.action==='prepare') {
   if(!providerKey())return reply({error:'Generation is unavailable.'},503);
   if(typeof input.name!=='string'||input.name.length>255||! /\.(pdf|epub|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(input.name)||!Number.isSafeInteger(input.size)||input.size<1||input.size>uploadLimits.maxFileBytes||!Number.isSafeInteger(input.textBytes)||input.textBytes<100||input.textBytes>uploadLimits.maxTextBytes||! /^[a-f0-9]{64}$/.test(input.sha||'')||! /^[a-f0-9]{64}$/.test(input.textSha||''))return reply({error:'Choose a supported source within the upload limits.'},400);
   const options=processingOptions(input.options),headings=input.extraction?.headings||[];
   if(!Array.isArray(headings)||headings.length>uploadLimits.maxSourceHeadings||headings.some((h:any)=>!h||!Number.isSafeInteger(h.line)||h.line<1||typeof h.title!=='string'||h.title.length>1000))return reply({error:'Invalid extracted source structure.'},400);
   const result=await db.rpc('create_book_processing_job',{p_user:user.id,p_name:input.name,p_sha:input.sha,p_text:'Source upload pending. '.repeat(6),p_title:input.name.replace(/\.[^.]+$/,''),p_chunks:[]});
   if(result.error)return reply({error:result.error.message.includes('Daily limit')?'Daily limit reached. Try again tomorrow.':'Could not save this source. Please retry.'},400);
   let job=result.data;
   if(reusableBook(job))return reply({job:cachedBookSummary(job),reused:true});
   if(job.cursor>0)return reply({job:publicJob(job)});
   if(job.lease_until&&Date.parse(job.lease_until)>Date.now())return reply({error:'This source is already being saved. Please retry shortly.'},409);
   job=requireOk(await db.from('book_processing_jobs').update({options,run_state:'staging',source_import:{textSha:input.textSha,textBytes:input.textBytes,headings},lease_token:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id',job.id).eq('updated_at',job.updated_at).select().single());
   const upload=requireOk(await db.storage.from('private-books').createSignedUploadUrl(`${user.id}/${job.id}/source`,{upsert:true}));
   const textUpload=requireOk(await db.storage.from('private-books').createSignedUploadUrl(`${user.id}/${job.id}/extracted-source.txt`,{upsert:true}));
   return reply({job:publicJob(job),upload,textUpload});
  }
  if(input.action==='create') {
   if(!providerKey())return reply({error:'Book processing is being connected. Please try again later.'},503);
   if(input.size!==undefined&&(!Number.isSafeInteger(input.size)||input.size<1||input.size>uploadLimits.maxFileBytes))return reply({error:'Choose a non-empty source file up to 50 MB.'},400);
   if(typeof input.name!=='string'||input.name.length>255||! /\.(pdf|epub|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(input.name)||typeof input.text!=='string'||input.text.length<100||input.text.length>uploadLimits.maxTextCharacters||! /^[a-f0-9]{64}$/.test(input.sha||''))return reply({error:'Choose a supported source with 100 to six million readable characters.'},400);
   const options=processingOptions(input.options);
   const source=splitSource(sanitizeSource(input.text), input.extraction?.headings||[]);
   const result=await db.rpc('create_book_processing_job',{p_user:user.id,p_name:input.name,p_sha:input.sha,p_text:source.text,p_title:input.name.replace(/\.[^.]+$/,''),p_chunks:source.chunks});
   if(result.error)return reply({error:result.error.message.includes('Daily limit')?'Daily limit reached. Try again tomorrow.':'Could not create this book. Please retry.'},400);
   let job=result.data;let upload=null;
   if(reusableBook(job))return reply({job:cachedBookSummary(job),reused:true});
   if(job.source_import&&job.status==='uploaded')return reply({error:'This book has an unfinished large-source upload. Choose the same file again in the current upload dialog.'},409);
   if(job.status==='uploaded'&&job.cursor===0&&!job.lease_until) {
    // Options can change only before processing starts. Enqueue follows completed upload.
    job=requireOk(await db.from('book_processing_jobs').update({options,run_state:input.options?'staging':'manual'}).eq('id',job.id).eq('updated_at',job.updated_at).is('lease_token',null).select().single());
   }
   if(job.status==='uploaded')upload=requireOk(await db.storage.from('private-books').createSignedUploadUrl(`${user.id}/${job.id}/source`,{upsert:true}));
   return reply({job:publicJob(job),upload});
  }
  if(!/^[a-f0-9-]{36}$/i.test(input.id||''))return reply({error:'Invalid book ID'},400);
  const {data:job}=await db.from('book_processing_jobs').select('*').eq('id',input.id).eq('user_id',user.id).maybeSingle();if(!job)return reply({error:'Book not found'},404);
  if(input.action==='finalize') {
   if(job.status!=='uploaded')return reply({job:publicJob(job)});
   if(!job.source_import)return reply({error:'This source does not have a staged extraction.'},409);
   const token=crypto.randomUUID(),now=new Date().toISOString();
   const claim=requireOk(await db.from('book_processing_jobs').update({lease_token:token,lease_until:new Date(Date.now()+140000).toISOString()}).eq('id',job.id).eq('updated_at',job.updated_at).or(`lease_until.is.null,lease_until.lt.${now}`).select('id'));
   if(!claim?.length)return reply({error:'This source is already being saved. Please retry shortly.'},409);
   try{
    const original=requireOk(await db.storage.from('private-books').download(`${user.id}/${job.id}/source`));
    if(original.size>uploadLimits.maxFileBytes||await hash(await original.arrayBuffer())!==job.source_sha)throw new Error('The original upload is incomplete. Choose the same file to retry.');
    const extracted=requireOk(await db.storage.from('private-books').download(`${user.id}/${job.id}/extracted-source.txt`));
    if(extracted.size!==job.source_import.textBytes||extracted.size>uploadLimits.maxTextBytes||await hash(await extracted.arrayBuffer())!==job.source_import.textSha)throw new Error('The extracted text upload is incomplete. Choose the same file to retry.');
    const text=sanitizeSource(await extracted.text());if(text.length<100||text.length>uploadLimits.maxTextCharacters)throw new Error('The extracted text exceeds the current processing capacity.');
    const source=splitSource(text,job.source_import.headings);
    const saved=requireOk(await db.from('book_processing_jobs').update({source_text:source.text,chunks:source.chunks,status:'processing',run_state:'queued',error:null,attempts:0,next_attempt_at:now,lease_token:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id',job.id).eq('lease_token',token).select().single());
    await wake();return reply({job:publicJob(saved)});
   }finally{await db.from('book_processing_jobs').update({lease_token:null,lease_until:null}).eq('id',job.id).eq('lease_token',token);}
  }
  if(input.action==='delete') {
   // Stop claims before touching storage. An active provider call must finish first.
   const now=new Date().toISOString();
   const stopped=requireOk(await db.from('book_processing_jobs').update({run_state:'paused',updated_at:now}).eq('id',job.id).eq('user_id',user.id).or(`lease_until.is.null,lease_until.lt.${now}`).select('id').maybeSingle());
   if(!stopped)return reply({error:'Pause this book and wait for its current section to finish before deleting it.'},409);
   const prefix=`${user.id}/${job.id}`;const files=requireOk(await db.storage.from('private-books').list(prefix,{limit:1000}));
   if(files.length)requireOk(await db.storage.from('private-books').remove(files.map((file:any)=>`${prefix}/${file.name}`)));
   requireOk(await db.from('book_processing_jobs').delete().eq('id',job.id).eq('user_id',user.id));return reply({deleted:true});
  }
  if(input.action==='export') {
   if(input.revision==='previous') {
    let review;try{review=JSON.parse(job.artifacts?.['quality-review.json']||'{}');}catch{}
    const path=`${user.id}/${job.id}/before-fidelity-v2.json`;
    if(review?.previousRevisionPath!==path)return reply({error:'No previous revision is available.'},404);
    const snapshot=requireOk(await db.storage.from('private-books').download(path));const previous=JSON.parse(await snapshot.text());
    if(previous.id!==job.id||previous.user_id!==user.id)return reply({error:'Revision does not belong to this book.'},404);
    const files=exportBookFiles(previous);files['DOWNLOAD.md']='# Previous version\n\nThis saved revision was superseded after a source-fidelity repair. It may contain unsupported claims. Use the current version for new work.\n\n'+files['DOWNLOAD.md'];
    return reply({files});
   }
   const findings=scanSkill(job.artifacts);if(findings.length&&input.reviewAccepted!==true)return reply({error:'Review the flagged passages before exporting this skill.',findings},409);
   return reply({files:exportBookFiles(job)});
  }
  if(input.action==='analysis-export') {
   if(!job.analysis)return reply({error:'Analysis is not ready.'},409);
   return reply({files:{'analysis.json':JSON.stringify(job.analysis,null,2),'source.txt':job.source_text}});
  }
  if(input.action==='status')return reply({job:publicJob(job)});
  if(input.action==='pause') {
   const saved=requireOk(await db.from('book_processing_jobs').update({run_state:'paused',updated_at:new Date().toISOString()}).eq('id',job.id).neq('run_state','complete').select().maybeSingle());
   return reply({job:publicJob(saved||job)});
  }
  if(['enqueue','retry','generate'].includes(input.action)) {
   if(job.source_import&&job.status==='uploaded')return reply({error:'Finish saving the original and extracted text before processing.'},409);
   if(!providerKey())return reply({error:'Generation is unavailable.'},503);
   if(job.status==='ready'||job.status==='analyzed'&&input.action!=='generate')return reply({job:publicJob(job)});
   if(input.action==='generate'&&job.status!=='analyzed')return reply({error:'Finish analysis before generating from it.'},409);
   const patch:any={run_state:'queued',error:null,next_attempt_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   if(input.action==='generate'){patch.options={...job.options,mode:'full'};patch.status='processing';}
   // Do not reset an active claim or overwrite a step that finished concurrently.
   if(!job.lease_until||Date.parse(job.lease_until)<Date.now())patch.attempts=0;
   const saved=requireOk(await db.from('book_processing_jobs').update(patch).eq('id',job.id).eq('updated_at',job.updated_at).select().maybeSingle());
   await wake();return reply({job:publicJob(saved||job)});
  }
  if(input.action!=='process')return reply({error:'Unknown action'},400);
  if(job.status==='ready'||job.status==='analyzed')return reply({job:publicJob(job)});
  if(!providerKey())return reply({error:'Generation is unavailable.'},503);
  const claim=requireOk(await db.rpc('claim_book_processing_job',{p_id:job.id,p_user:user.id}));
  if(!claim?.id)return reply({job:publicJob(job),busy:true});
  const result=await processClaim(claim);return reply(result,result.error?502:200);
 }catch(e){return reply({error:e instanceof SyntaxError?'Send valid JSON.':e instanceof Error?e.message:'Could not process this request. Please retry.'},400);}
});
