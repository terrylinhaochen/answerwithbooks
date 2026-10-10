import {prepareAgentImport,importByteLimit} from './book-agent-import.mjs';
export function agentImportHandler(db,authenticate){return async request=>{
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({error:'Use POST from your connected agent.'},405);
 // Agent-only endpoint; no browser CORS or anonymous imports.
 const bearer=request.headers.get('authorization')?.replace(/^Bearer /i,'');if(!bearer)return reply({error:'Connect your account first.'},401);
 try{
  const user=await authenticate(db,bearer);if(!user)return reply({error:'Your account session expired.'},401);
  if(Number(request.headers.get('content-length')||0)>importByteLimit)return reply({error:'Package exceeds 16 MB.'},413);
  const reader=request.body?.getReader();if(!reader)return reply({error:'Missing package.'},400);
  const parts=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>importByteLimit){await reader.cancel();return reply({error:'Package exceeds 16 MB.'},413);}parts.push(value);}
  const bytes=new Uint8Array(length);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
  let prepared;try{prepared=await prepareAgentImport(JSON.parse(new TextDecoder().decode(bytes)));}catch(e){return reply({error:e instanceof Error?e.message:'Invalid package.'},400);}
  const saved=await db.rpc('import_agent_book',{p_user:user.id,p_sha:prepared.packageSha,p_job:prepared.job});
  if(saved.error)return reply({error:'Could not import this package. Your local work is safe; retry later or check the daily import limit.'},409);
  const job=saved.data;
  // Preserve a downloadable extracted source; repeated imports repair a failed storage upload.
  const stored=await db.storage.from('private-books').upload(`${user.id}/${job.id}/source`,prepared.job.source_text,{contentType:'text/plain',upsert:true});
  if(stored.error)return reply({error:'Book saved, but source-file sync is pending. Retry the same local publish command.'},503);
  const wake=await db.rpc('wake_book_library');
  const coverage=await db.rpc('book_library_coverage',{p_user:user.id,p_book:job.id});
  return reply({status:'imported',id:job.id,url:`https://answerwithbooks.com/your-book/?id=${job.id}`,visibility:'private',generationChargeCents:0,indexing:coverage.data??null,indexingWakeQueued:!wake.error,review:'Customer-agent content; structural checks only. Verify claims against the source.'});
 }catch{return reply({error:'Import unavailable. Your completed local package is unchanged; retry later.'},503);}
};}
