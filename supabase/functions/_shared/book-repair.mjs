import {distillSection,compileDistillation} from './book-distillation.mjs';
const check=result=>{if(result.error)throw new Error('Could not save repair progress. Original book preserved.');return result.data;};
export function isReviewed(job){try{return JSON.parse(job.artifacts?.['quality-review.json']||'{}').version===2;}catch{return false;}}
export async function advanceRepair({job,state,modelJson,hash,previousRevisionPath}) {
 const originalHash=await hash(new TextEncoder().encode(JSON.stringify(job.artifacts)));
 if(state&&(state.originalHash!==originalHash||state.sourceSha!==job.source_sha))throw new Error('The source revision changed; original book preserved.');
 const next=state?structuredClone(state):{cursor:0,notes:[],originalHash,sourceSha:job.source_sha};
 if(next.cursor<job.chunks.length){
  const {note}=await distillSection(job.chunks[next.cursor],next.cursor,modelJson);next.notes.push(note);next.cursor++;
  return {state:next,patch:null};
 }
 const artifacts=await compileDistillation(job,next.notes,modelJson,hash);
 const quality=JSON.parse(artifacts['quality-review.json']);quality.previousRevisionPath=previousRevisionPath;artifacts['quality-review.json']=JSON.stringify(quality,null,2);
 return {state:next,patch:{notes:next.notes,artifacts,cursor:job.chunks.length,updated_at:new Date().toISOString()}};
}
export async function repairBook({db,job,modelJson,hash}) {
 if(isReviewed(job))return {repaired:true,alreadyReviewed:true};
 const token=crypto.randomUUID(),now=new Date().toISOString();
 const claim=check(await db.from('book_processing_jobs').update({lease_token:token,lease_until:new Date(Date.now()+140000).toISOString()}).eq('id',job.id).eq('updated_at',job.updated_at).or(`lease_until.is.null,lease_until.lt.${now}`).select('id'));
 if(!claim?.length)return {repaired:false,busy:true};
 const storage=db.storage.from('private-books'),prefix=`${job.user_id}/${job.id}`,snapshotPath=`${prefix}/before-fidelity-v2.json`,progressPath=`${prefix}/fidelity-v2-progress.json`;
 const read=async path=>{const name=path.slice(prefix.length+1);const files=check(await storage.list(prefix,{search:name,limit:1000}));if(!files.some(file=>file.name===name))return null;const file=check(await storage.download(path));return JSON.parse(await file.text());};
 const save=async(path,value,upsert)=>check(await storage.upload(path,new TextEncoder().encode(JSON.stringify(value)),{contentType:'application/octet-stream',upsert}));
 try {
  let previous=await read(snapshotPath);
  if(!previous){previous={...job,lease_token:null,lease_until:null};await save(snapshotPath,previous,false);}
  if(previous.id!==job.id||previous.user_id!==job.user_id||previous.source_sha!==job.source_sha||JSON.stringify(previous.artifacts)!==JSON.stringify(job.artifacts))throw new Error('Original revision changed; repair stopped without replacing it.');
  const result=await advanceRepair({job,state:await read(progressPath),modelJson,hash,previousRevisionPath:snapshotPath});
  if(result.patch){
   const saved=check(await db.from('book_processing_jobs').update({...result.patch,lease_token:null,lease_until:null}).eq('id',job.id).eq('lease_token',token).select('id'));
   if(!saved?.length)throw new Error('Repair lease expired; original book preserved.');
   await storage.remove([progressPath]);
   return {repaired:true,cursor:result.state.cursor,total_sections:job.chunks.length,previousVersionSaved:true};
  }
  await save(progressPath,result.state,true);
  return {repaired:false,cursor:result.state.cursor,total_sections:job.chunks.length,originalAvailable:true};
 }finally{await db.from('book_processing_jobs').update({lease_token:null,lease_until:null}).eq('id',job.id).eq('lease_token',token);}
}
