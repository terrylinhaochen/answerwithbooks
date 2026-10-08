import {usageReceipt} from '../_shared/book-usage.mjs';
import {distillSectionBatch,sectionConcurrency} from '../_shared/book-parallel.mjs';
import {createBookModelClient} from '../_shared/book-model.mjs';
import {bookUser} from '../_shared/book-cli-auth.mjs';
import {reusableBook,cachedBookSummary} from '../_shared/book-cache.mjs';
import {summarizeBookGroup,overviewGroupCount,overviewGroupSize} from '../_shared/book-overview.mjs';
import {scanSkill} from '../_shared/book-skill-review.mjs';
import {processingOptions,retryPatch} from '../_shared/book-options.mjs';
import {distillSection,compileDistillation} from '../_shared/book-distillation.mjs';
import {repairBook} from '../_shared/book-repair.mjs';
import {previousReviewPath} from '../_shared/book-review-status.mjs';
import {verifyOperator} from '../_shared/operator-auth.mjs';
import {exportBookFiles} from '../_shared/book-export.mjs';
import {sanitizeSource} from '../_shared/upstream-sanitize.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { splitSource } from '../_shared/book-sections.mjs';
import {finalizeBookSource,skillSummary,libraryBook} from '../_shared/book-revisions.mjs';
import uploadLimits from '../_shared/book-upload-limits.json' with {type:'json'};
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,serviceKey,{auth:{persistSession:false}});
const providerKey=()=>Deno.env.get('OPENAI_API_KEY');
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','https://chenterry.com','http://localhost:4321','http://127.0.0.1:4321']);
const hash=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
function publicJob(job:any) { const {source_text,chunks,notes,section_feedback,generation_feedback,overview_notes=[],lease_token,cover_lease_token,...rest}=job;return {...rest,total_sections:chunks.length,completed_sections:notes.length,overview_completed:overview_notes.length,overview_total:overviewGroupCount(notes)}; }
function requireOk(result:any) { if(result.error) throw new Error('Could not save processing progress. Please retry.');return result.data; }
const modelFor=(job:any)=>createBookModelClient({getEnv:(name:string)=>Deno.env.get(name),onUsage:async(metric:unknown)=>{const result=await db.from('book_model_usage').insert({job_id:job.id,user_id:job.user_id,section:job.cursor,phase:job.status,usage:metric});if(result.error)console.error('book_usage_receipt_failed',job.id);}});
async function step(job:any,token:string) {
 const modelJson=modelFor(job);
 const patch:any={error:null,attempts:0,lease_until:null,lease_token:null,updated_at:new Date().toISOString(),generation_feedback:null};
 if(job.status==='uploaded') {
  const source=requireOk(await db.storage.from('private-books').download(`${job.user_id}/${job.id}/source`));
  if(source.size>uploadLimits.maxFileBytes||await hash(await source.arrayBuffer())!==job.source_sha) throw new Error('The source upload is incomplete or changed. Upload the same file again.');
  patch.status='processing';
 } else if(job.cursor<job.chunks.length) {
  const batch=await distillSectionBatch({chunks:job.chunks,notes:job.notes,cursor:job.cursor,
   concurrency:sectionConcurrency(Deno.env.get('BOOK_SECTION_CONCURRENCY')||'1'),
   distill:(chunk:any,index:number)=>distillSection(chunk,index,modelFor({...job,cursor:index}),job.options,job.section_feedback?.[index])});
  patch.notes=batch.notes;patch.cursor=batch.cursor;patch.status='processing';patch.attempts=0;
  patch.section_feedback={...job.section_feedback};
  for(const note of batch.notes)delete patch.section_feedback[Number(note.id.slice(2))-1];
  for(const error of batch.errors)if(error.feedback)patch.section_feedback[error.sectionIndex]={...error.feedback,attempts:(job.section_feedback?.[error.sectionIndex]?.attempts||0)+1};
  if(job.revision_kind!=='append'&&!job.source_name.endsWith('.collection.zip')) { if(typeof batch.title==='string'&&batch.title.trim()) patch.title=batch.title.slice(0,200);if(typeof batch.author==='string'&&batch.author.trim()) patch.author=batch.author.slice(0,200); }
  const transportErrors=batch.errors.filter(error=>!error.feedback);
  if(batch.errors.length&&!transportErrors.length){
   // A useful review is completed work, not a provider outage. Repair promptly
   // and fill spare slots with later, unprocessed sections. Never accept a failed draft.
   const exhausted=Object.values(patch.section_feedback).some((feedback:any)=>feedback.attempts>=5);
   patch.error=exhausted?'A section still fails its source check after five failed review attempts. Accepted sections are saved.':'Repairing source-review findings; accepted sections are saved.';
   if(exhausted)patch.run_state='failed';
   patch.next_attempt_at=new Date().toISOString();
  }
  if(transportErrors.length) {
   // Save paid, reviewed successes without releasing this lease or resetting retries.
   const {lease_until,lease_token,attempts,error,...progress}=patch;
   requireOk(await db.from('book_processing_jobs').update(progress).eq('id',job.id).eq('lease_token',token).select('id').single());
   throw transportErrors[0];
  }
 } else if(job.options?.mode==='analysis') {
  patch.analysis={title:job.title,author:job.author,sections:job.notes,sourceSha256:job.source_sha,createdAt:new Date().toISOString()};patch.status='analyzed';patch.run_state='complete';
 } else if((job.overview_notes||[]).length<overviewGroupCount(job.notes)) {
  const start=(job.overview_notes||[]).length*overviewGroupSize;
  patch.overview_notes=[...(job.overview_notes||[]),await summarizeBookGroup(job.notes.slice(start,start+overviewGroupSize),modelJson,job.generation_feedback?.phase==='overview'?job.generation_feedback:null)];
 } else if(!job.artifacts) {
  patch.artifacts=await compileDistillation(job,job.notes,modelJson,hash);patch.skill_summary=skillSummary(patch.artifacts);patch.status='ready';patch.run_state='complete';patch.cover_status='pending';patch.attempts=0;
 } else {
  patch.status='ready';patch.run_state='complete';patch.cover_status=job.cover_path?'ready':'pending';
 }
 let save=db.from('book_processing_jobs').update(patch).eq('id',job.id).eq('lease_token',token);
 if(patch.run_state==='failed')save=save.neq('run_state','paused');
 let saved=requireOk(await save.select().maybeSingle());
 if(!saved&&patch.run_state==='failed')saved=requireOk(await db.from('book_processing_jobs').update({...patch,run_state:'paused'}).eq('id',job.id).eq('lease_token',token).eq('run_state','paused').select().single());
 if(!saved)throw new Error('Processing lease changed; saved progress was preserved.');
 return publicJob(saved);
}
async function processCover(job:any) {
 const started=Date.now();let metric:any={kind:'image',provider:'openai',requestedModel:Deno.env.get('BOOK_COVER_MODEL')||'gpt-image-1.5',outcome:'error'};
 const patch:any={cover_lease_until:null,cover_lease_token:null};
 try {
  const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${providerKey()}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('BOOK_COVER_MODEL')||'gpt-image-1.5',prompt:`Create an original editorial book cover illustration for ${job.title} by ${job.author}. Warm ivory background, quiet ink linework and one muted color, symbolic visual metaphor, generous negative space. No text, letters, logos, or imitation of the publisher cover. Subject context: ${job.notes[0]?.summary?.slice(0,1000)||job.title}`,size:'1024x1536',quality:'low',n:1}),signal:AbortSignal.timeout(110000)});
  if(!response.ok) throw new Error('The book and skill are ready, but cover generation failed. Retry to finish the cover.');
  const result=await response.json();
  const count=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0?Number(value):null;
  metric.inputTokens=count(result.usage?.input_tokens);metric.outputTokens=count(result.usage?.output_tokens);
  metric.inputTextTokens=count(result.usage?.input_tokens_details?.text_tokens)??metric.inputTokens;
  metric.inputImageTokens=count(result.usage?.input_tokens_details?.image_tokens)??0;
  const b64=result.data?.[0]?.b64_json;if(!b64)throw new Error('No cover image was returned. Retry the cover.');
  const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const coverPath=`${job.user_id}/${job.id}/cover.png`;
  requireOk(await db.storage.from('private-books').upload(coverPath,bytes,{contentType:'image/png',upsert:true}));patch.cover_path=coverPath;patch.status='ready';patch.run_state='complete';
  delete patch.status;delete patch.run_state;patch.cover_status='ready';patch.cover_error=null;metric.outcome='complete';
 }catch(error){
  patch.cover_status=job.cover_attempts>=5?'failed':'pending';
  patch.cover_error=error instanceof Error?error.message:'Cover generation failed. Your book and skill are ready.';
  patch.cover_next_attempt_at=new Date(Date.now()+Math.min(300,30*2**Math.max(0,job.cover_attempts-1))*1000).toISOString();
 }finally{
  metric.elapsedMs=Date.now()-started;
  await db.from('book_model_usage').insert({job_id:job.id,user_id:job.user_id,phase:'cover',usage:metric});
 }
 requireOk(await db.from('book_processing_jobs').update(patch).eq('id',job.id).eq('cover_lease_token',job.cover_lease_token));
 await wake();return {processed:job.id,status:'ready',cover_status:patch.cover_status};
}

async function wake() { await db.rpc('wake_book_processing',{p_count:1}); }
async function processClaim(claim:any) {
 try {return {job:await step(claim,claim.lease_token)};}
 catch(e) {
  const message=e instanceof Error?e.message:'Processing failed. Please retry.';
  const patch:any=retryPatch(claim.attempts,message);
  if((e as any)?.generationFeedback){
   const attempts=(claim.generation_feedback?.attempts||0)+1;
   patch.generation_feedback={...(e as any).generationFeedback,attempts};
   patch.attempts=0;patch.run_state=attempts>=5?'failed':'queued';patch.next_attempt_at=new Date().toISOString();
  }
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
   if(!claim?.id){const cover=requireOk(await db.rpc('claim_book_cover'));return reply(cover?.id?await processCover(cover):{idle:true});}
   const result=await processClaim(claim);return reply(result.error?{error:result.error}:{processed:claim.id,status:result.job?.status},result.error?502:200);
  }
  if(input.action==='repair') {
   if(!await verifyOperator(bearer,{url,serviceKey}))return reply({error:'Repair requires server operator authorization.'},403);
   if(!/^[a-f0-9-]{36}$/i.test(input.id||''))return reply({error:'Invalid book ID'},400);
   const {data:target,error:lookupError}=await db.from('book_processing_jobs').select('*').eq('id',input.id).maybeSingle();
   if(lookupError)throw new Error('Could not load this book.');if(!target)return reply({error:'Book not found'},404);
   if(target.status!=='ready')return reply({error:'Finish processing before repairing this book.'},409);
   if(!providerKey())return reply({error:'Generation is unavailable.'},503);
   try {return reply(await repairBook({db,job:target,modelJson:modelFor(target),hash}));}catch(e){return reply({error:e instanceof Error?e.message:'Repair failed; original preserved.'},502);}
  }
  if(bearer.startsWith('awb_cli_')&&!['list','lookup','prepare','create','finalize','enqueue','status','export','analysis-export','pause','retry','generate','revisions','activate','usage','retry-cover'].includes(input.action))return reply({error:'This action is not available to agent sessions.'},403);
  const user=await bookUser(db,bearer);if(!user)return reply({error:'Sign in to access your private books.'},401);
  if(input.action==='list') {
   const offset=Number(input.offset||0);if(!Number.isSafeInteger(offset)||offset<0)return reply({error:'Invalid offset'},400);
   const jobs=requireOk(await db.from('book_processing_jobs').select('id,book_id,revision,is_current,title,author,source_name,status,run_state,cursor,created_at,error,skill_summary').eq('user_id',user.id).eq('is_current',true).order('created_at',{ascending:false}).order('id').range(offset,offset+99));
   return reply({books:jobs.map(libraryBook),next_offset:jobs.length===100?offset+100:null});
  }
  if(input.parentId&&!/^[a-f0-9-]{36}$/i.test(input.parentId))return reply({error:'Invalid parent book ID.'},400);
  if(input.parentId&&['prepare','create'].includes(input.action)){
   const parent=requireOk(await db.from('book_processing_jobs').select('id').eq('id',input.parentId).eq('user_id',user.id).maybeSingle());
   if(!parent)return reply({error:'Book not found'},404);
  }
  if(['lookup','prepare','create'].includes(input.action)&&!input.parentId) {
   if(typeof input.sha!=='string'||! /^[a-f0-9]{64}$/.test(input.sha))return reply({error:'Invalid source fingerprint.'},400);
   // Read before provider availability, extraction, quotas, or signed uploads.
   const existing=requireOk(await db.from('book_processing_jobs').select('id,title,status,run_state').eq('user_id',user.id).eq('source_sha',input.sha).neq('revision_kind','append').order('is_current',{ascending:false}).order('created_at',{ascending:false}).limit(1).maybeSingle());
   if(reusableBook(existing))return reply({job:cachedBookSummary(existing),reused:true});
   if(input.action==='lookup')return reply({job:null,reused:false});
  }
  if(input.action==='prepare') {
   if(!providerKey())return reply({error:'Generation is unavailable.'},503);
   if(typeof input.name!=='string'||input.name.length>255||! /\.(pdf|epub|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc|collection\.zip)$/i.test(input.name)||!Number.isSafeInteger(input.size)||input.size<1||input.size>uploadLimits.maxFileBytes||!Number.isSafeInteger(input.textBytes)||input.textBytes<100||input.textBytes>uploadLimits.maxTextBytes||! /^[a-f0-9]{64}$/.test(input.sha||'')||! /^[a-f0-9]{64}$/.test(input.textSha||''))return reply({error:'Choose a supported source within the upload limits.'},400);
   const options=processingOptions(input.options),headings=input.extraction?.headings||[];
   if(!Array.isArray(headings)||headings.length>uploadLimits.maxSourceHeadings||headings.some((h:any)=>!h||!Number.isSafeInteger(h.line)||h.line<1||typeof h.title!=='string'||h.title.length>1000))return reply({error:'Invalid extracted source structure.'},400);
   const result=input.parentId?await db.rpc('create_book_revision',{p_user:user.id,p_parent:input.parentId,p_name:input.name,p_sha:input.sha,p_kind:input.revisionKind,p_options:options}):await db.rpc('create_book_processing_job',{p_user:user.id,p_name:input.name,p_sha:input.sha,p_text:'Source upload pending. '.repeat(6),p_title:input.name.replace(/(?:\.collection)?\.[^.]+$/,''),p_chunks:[]});
   if(result.error)return reply({error:input.parentId?result.error.message:result.error.message.includes('Daily limit')?'Daily limit reached. Try again tomorrow.':'Could not save this source. Please retry.'},400);
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
   if(typeof input.name!=='string'||input.name.length>255||! /\.(pdf|epub|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc|collection\.zip)$/i.test(input.name)||typeof input.text!=='string'||input.text.length<100||input.text.length>uploadLimits.maxTextCharacters||! /^[a-f0-9]{64}$/.test(input.sha||''))return reply({error:'Choose a supported source with 100 to six million readable characters.'},400);
   const options=processingOptions(input.options);
   const source=splitSource(sanitizeSource(input.text), input.extraction?.headings||[]);
   const result=input.parentId?await db.rpc('create_book_revision',{p_user:user.id,p_parent:input.parentId,p_name:input.name,p_sha:input.sha,p_kind:input.revisionKind,p_options:options}):await db.rpc('create_book_processing_job',{p_user:user.id,p_name:input.name,p_sha:input.sha,p_text:source.text,p_title:input.name.replace(/(?:\.collection)?\.[^.]+$/,''),p_chunks:source.chunks});
   if(result.error)return reply({error:input.parentId?result.error.message:result.error.message.includes('Daily limit')?'Daily limit reached. Try again tomorrow.':'Could not create this book. Please retry.'},400);
   let job=result.data;let upload=null;
   if(reusableBook(job))return reply({job:cachedBookSummary(job),reused:true});
   if(job.source_import&&job.status==='uploaded')return reply({error:'This book has an unfinished large-source upload. Choose the same file again in the current upload dialog.'},409);
   if(job.status==='uploaded'&&!job.lease_until) {
    // Options can change only before processing starts. Enqueue follows completed upload.
    const parent=job.parent_job_id?requireOk(await db.from('book_processing_jobs').select('*').eq('id',job.parent_job_id).eq('user_id',user.id).single()):undefined;
    const prepared=finalizeBookSource(job,source.text,input.extraction?.headings||[],parent);
    job=requireOk(await db.from('book_processing_jobs').update({...prepared,options,run_state:input.options?'staging':'manual'}).eq('id',job.id).eq('updated_at',job.updated_at).is('lease_token',null).select().single());
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
    const parent=job.parent_job_id?requireOk(await db.from('book_processing_jobs').select('*').eq('id',job.parent_job_id).eq('user_id',user.id).single()):undefined;
    const source=finalizeBookSource(job,text,job.source_import.headings,parent);
    const saved=requireOk(await db.from('book_processing_jobs').update({...source,status:'processing',run_state:'queued',error:null,attempts:0,next_attempt_at:now,lease_token:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id',job.id).eq('lease_token',token).select().single());
    await wake();return reply({job:publicJob(saved)});
   }finally{await db.from('book_processing_jobs').update({lease_token:null,lease_until:null}).eq('id',job.id).eq('lease_token',token);}
  }
  if(input.action==='delete') {
   if(job.cover_lease_until&&Date.parse(job.cover_lease_until)>Date.now())return reply({error:'Wait for the cover attempt to finish before deleting this book.'},409);
   const children=requireOk(await db.from('book_processing_jobs').select('id').eq('parent_job_id',job.id).eq('user_id',user.id).limit(1));
   if(children.length||job.parent_job_id&&job.is_current)return reply({error:'This book is part of a saved revision history. Only an unactivated revision can be removed individually.'},409);
   // Stop claims before touching storage. An active provider call must finish first.
   const now=new Date().toISOString();
   const stopped=requireOk(await db.from('book_processing_jobs').update({run_state:'paused',updated_at:now}).eq('id',job.id).eq('user_id',user.id).eq('updated_at',job.updated_at).or(`lease_until.is.null,lease_until.lt.${now}`).select('id').maybeSingle());
   if(!stopped)return reply({error:'Pause this book and wait for its current section to finish before deleting it.'},409);
   const newChildren=requireOk(await db.from('book_processing_jobs').select('id').eq('parent_job_id',job.id).eq('user_id',user.id).limit(1));
   if(newChildren.length){
    requireOk(await db.from('book_processing_jobs').update({run_state:job.run_state,updated_at:new Date().toISOString()}).eq('id',job.id).eq('updated_at',now));
    return reply({error:'A new revision was added. The original and version history were preserved.'},409);
   }
   const prefix=`${user.id}/${job.id}`;const files=requireOk(await db.storage.from('private-books').list(prefix,{limit:1000}));
   if(files.length)requireOk(await db.storage.from('private-books').remove(files.map((file:any)=>`${prefix}/${file.name}`)));
   requireOk(await db.from('book_processing_jobs').delete().eq('id',job.id).eq('user_id',user.id));return reply({deleted:true});
  }
  if(input.action==='export') {
   if(input.revision==='previous') {
    const path=previousReviewPath(job,user.id);
    if(!path)return reply({error:'No previous revision is available.'},404);
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
  if(input.action==='usage') {
   const rows:any[]=[];for(let offset=0;offset<10000;offset+=500){const page=requireOk(await db.from('book_model_usage').select('usage,created_at').eq('job_id',job.id).eq('user_id',user.id).order('created_at').order('id').range(offset,offset+499));rows.push(...page);if(page.length<500)break;}
   return reply({job_id:job.id,receipt:usageReceipt(rows)});
  }
  if(input.action==='retry-cover') {
   if(job.status!=='ready')return reply({error:'Finish the book before requesting a cover.'},409);
   if(job.cover_path||job.cover_lease_until&&Date.parse(job.cover_lease_until)>Date.now())return reply({job:publicJob(job)});
   const saved=requireOk(await db.from('book_processing_jobs').update({cover_status:'pending',cover_attempts:0,cover_error:null,cover_next_attempt_at:new Date().toISOString()}).eq('id',job.id).eq('updated_at',job.updated_at).select().maybeSingle());
   await wake();return reply({job:publicJob(saved||job)});
  }
  if(input.action==='revisions') {
   const revisions=requireOk(await db.from('book_processing_jobs').select('id,book_id,revision,parent_job_id,revision_kind,is_current,title,author,source_name,status,run_state,created_at,error').eq('user_id',user.id).eq('book_id',job.book_id||job.id).order('revision',{ascending:false}));
   return reply({book_id:job.book_id||job.id,revisions});
  }
  if(input.action==='activate') {
   if(job.status!=='ready'||!job.artifacts)return reply({error:'Finish processing before reviewing this revision.'},409);
   if(input.reviewAccepted!==true)return reply({error:'Review the new book and skill before making this revision current.',findings:scanSkill(job.artifacts)},409);
   const activated=await db.rpc('activate_book_revision',{p_user:user.id,p_id:job.id});
   if(activated.error)return reply({error:activated.error.message},409);
   return reply({job:publicJob(activated.data)});
  }
  if(input.action==='pause') {
   if(job.source_import?.kind==='native'&&job.source_import.state!=='complete')return reply({error:'Native conversion is in progress. Processing can be paused after extraction finishes.'},409);
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
   if(!job.lease_until||Date.parse(job.lease_until)<Date.now()){
    patch.attempts=0;
    if(input.action==='retry'&&job.run_state==='failed'){
     patch.section_feedback=Object.fromEntries(Object.entries(job.section_feedback||{}).map(([key,value]:[string,any])=>[key,{...value,attempts:0}]));
     if(job.generation_feedback)patch.generation_feedback={...job.generation_feedback,attempts:0};
    }
   }
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
