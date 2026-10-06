import {distillSection,compileDistillation} from '../_shared/book-distillation.mjs';
import {repairBook} from '../_shared/book-repair.mjs';
import {verifyOperator} from '../_shared/operator-auth.mjs';
import {exportBookFiles} from '../_shared/book-export.mjs';
import {sanitizeSource} from '../_shared/upstream-sanitize.mjs';
import { createClient } from 'npm:@supabase/supabase-js@2.49.8';
import { splitSource } from '../_shared/book-sections.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,serviceKey,{auth:{persistSession:false}});
const providerKey=()=>Deno.env.get('OPENAI_API_KEY');
const origins=new Set(['https://answerwithbooks.com','https://www.answerwithbooks.com','https://chenterry.com','http://localhost:4321','http://127.0.0.1:4321']);
const hash=async(bytes:BufferSource)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
function publicJob(job:any) { const {source_text,chunks,notes,lease_token,...rest}=job;return {...rest,total_sections:chunks.length}; }
function requireOk(result:any) { if(result.error) throw new Error('Could not save processing progress. Please retry.');return result.data; }
async function modelJson(system:string,input:string) {
 const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${providerKey()}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('BOOK_PROCESSING_MODEL')||'gpt-4.1-mini',messages:[{role:'system',content:system},{role:'user',content:input}],response_format:{type:'json_object'},max_tokens:6000}),signal:AbortSignal.timeout(60000)});
 if(!response.ok) throw new Error(response.status===429?'The generation provider is busy or out of quota. Please retry later.':'The generation provider could not complete this section. Please retry.');
 const body=await response.json();if(body.choices?.[0]?.finish_reason!=='stop') throw new Error('The generated section was incomplete. Please retry.');
 return JSON.parse(body.choices[0].message.content);
}
async function step(job:any,token:string) {
 const patch:any={error:null,lease_until:null,lease_token:null,updated_at:new Date().toISOString()};
 if(job.status==='uploaded') {
  const source=requireOk(await db.storage.from('private-books').download(`${job.user_id}/${job.id}/source`));
  if(source.size>10485760||await hash(await source.arrayBuffer())!==job.source_sha) throw new Error('The source upload is incomplete or changed. Upload the same file again.');
  patch.status='processing';
 } else if(job.cursor<job.chunks.length) {
  const chunk=job.chunks[job.cursor];
  const {note,title,author}=await distillSection(chunk,job.cursor,modelJson);
  patch.notes=[...job.notes,note];patch.cursor=job.cursor+1;patch.status='processing';patch.attempts=0;
  if(job.cursor===0) { if(typeof title==='string'&&title.trim()) patch.title=title.slice(0,200);if(typeof author==='string'&&author.trim()) patch.author=author.slice(0,200); }
 } else if(!job.artifacts) {
  patch.artifacts=await compileDistillation(job,job.notes,modelJson,hash);patch.status='cover';patch.attempts=0;
 } else {
  const response=await fetch('https://api.openai.com/v1/images/generations',{method:'POST',headers:{Authorization:`Bearer ${providerKey()}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('BOOK_COVER_MODEL')||'gpt-image-1.5',prompt:`Create an original editorial book cover illustration for ${job.title} by ${job.author}. Warm ivory background, quiet ink linework and one muted color, symbolic visual metaphor, generous negative space. No text, letters, logos, or imitation of the publisher cover. Subject context: ${job.notes[0]?.summary?.slice(0,1000)||job.title}`,size:'1024x1536',quality:'low',n:1}),signal:AbortSignal.timeout(110000)});
  if(!response.ok) throw new Error('The book and skill are ready, but cover generation failed. Retry to finish the cover.');
  const result=await response.json();const b64=result.data?.[0]?.b64_json;if(!b64)throw new Error('No cover image was returned. Retry the cover.');
  const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const coverPath=`${job.user_id}/${job.id}/cover.png`;
  requireOk(await db.storage.from('private-books').upload(coverPath,bytes,{contentType:'image/png',upsert:true}));patch.cover_path=coverPath;patch.status='ready';
 }
 const saved=requireOk(await db.from('book_processing_jobs').update(patch).eq('id',job.id).eq('lease_token',token).select().single());return publicJob(saved);
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
  const input=JSON.parse(raw);
  if(input.action==='health')return reply({available:!!providerKey(),formats:['pdf','epub','docx','html','rtf','txt','md','rst','adoc'],max_file_bytes:10485760});
  const bearer=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!bearer)return reply({error:'Sign in to upload a private book.'},401);
  if(input.action==='repair') {
   if(!await verifyOperator(bearer,{url,serviceKey}))return reply({error:'Repair requires server operator authorization.'},403);
   if(!/^[a-f0-9-]{36}$/i.test(input.id||''))return reply({error:'Invalid book ID'},400);
   const {data:target,error:lookupError}=await db.from('book_processing_jobs').select('*').eq('id',input.id).maybeSingle();
   if(lookupError)throw new Error('Could not load this book.');if(!target)return reply({error:'Book not found'},404);
   if(target.status!=='ready')return reply({error:'Finish processing before repairing this book.'},409);
   if(!providerKey())return reply({error:'Generation is unavailable.'},503);
   try {return reply(await repairBook({db,job:target,modelJson,hash}));}catch(e){return reply({error:e instanceof Error?e.message:'Repair failed; original preserved.'},502);}
  }
  const {data:auth,error}=await db.auth.getUser(bearer);if(error||!auth.user)return reply({error:'Sign in to upload a private book.'},401);
  const user=auth.user;
  if(input.action==='create') {
   if(!providerKey())return reply({error:'Book processing is being connected. Please try again later.'},503);
   if(typeof input.name!=='string'||input.name.length>255||! /\.(pdf|epub|docx|rtf|html|htm|xhtml|txt|text|md|markdown|rst|adoc|asciidoc)$/i.test(input.name)||typeof input.text!=='string'||input.text.length<100||input.text.length>1200000||! /^[a-f0-9]{64}$/.test(input.sha||''))return reply({error:'Choose a readable book source under 10 MB.'},400);
   const source=splitSource(sanitizeSource(input.text), input.extraction?.headings||[]);
   const result=await db.rpc('create_book_processing_job',{p_user:user.id,p_name:input.name,p_sha:input.sha,p_text:source.text,p_title:input.name.replace(/\.[^.]+$/,''),p_chunks:source.chunks});
   if(result.error)return reply({error:result.error.message.includes('Daily limit')?'Daily limit reached. Try again tomorrow.':'Could not create this book. Please retry.'},400);
   const job=result.data;let upload=null;
   if(job.status==='uploaded')upload=requireOk(await db.storage.from('private-books').createSignedUploadUrl(`${user.id}/${job.id}/source`,{upsert:true}));
   return reply({job:publicJob(job),upload});
  }
  if(!/^[a-f0-9-]{36}$/i.test(input.id||''))return reply({error:'Invalid book ID'},400);
  const {data:job}=await db.from('book_processing_jobs').select('*').eq('id',input.id).eq('user_id',user.id).maybeSingle();if(!job)return reply({error:'Book not found'},404);
  if(input.action==='delete') {
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
   return reply({files:exportBookFiles(job)});
  }
  if(input.action==='status'||job.status==='ready')return reply({job:publicJob(job)});
  if(!providerKey())return reply({error:'Book processing is being connected. Please try again later.'},503);
  if(input.action!=='process')return reply({error:'Unknown action'},400);
  if(job.attempts>=5)return reply({error:'This section needs review after repeated failures. Your source and completed outputs are saved.'},409);
  const token=crypto.randomUUID();const now=new Date().toISOString();
  const {data:claim,error:claimError}=await db.from('book_processing_jobs').update({lease_token:token,lease_until:new Date(Date.now()+140000).toISOString(),attempts:job.attempts+1}).eq('id',job.id).eq('cursor',job.cursor).eq('updated_at',job.updated_at).or(`lease_until.is.null,lease_until.lt.${now}`).select('id');
  if(claimError)return reply({error:'Could not start processing. Please retry.'},500);
  if(!claim?.length)return reply({job:publicJob(job),busy:true});
  try { return reply({job:await step(job,token)}); }
  catch(e) {
   const message=e instanceof Error?e.message:'Processing failed. Please retry.';
   await db.from('book_processing_jobs').update({error:message,lease_token:null,lease_until:null,updated_at:new Date().toISOString()}).eq('id',job.id).eq('lease_token',token);
   return reply({error:message},502);
  }
 }catch{return reply({error:'Could not process this request. Please retry.'},400);}
});
