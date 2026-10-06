// Operator-only backfill. Keeps source text out of logs and preserves originals privately.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const project=process.env.AWB_PROJECT_REF||'yozeqanibszoxnowmvsm';
const apply=process.argv.includes('--apply'),output=process.env.AWB_REPAIR_RECEIPT;
const keys=JSON.parse(execFileSync('/opt/homebrew/bin/supabase',['projects','api-keys','--project-ref',project,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const key=keys.find(row=>row.name==='service_role')?.api_key;assert.ok(key,'Operator key unavailable');
const db=createClient(`https://${project}.supabase.co`,key,{auth:{persistSession:false}});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const {data:jobs,error}=await db.from('book_processing_jobs').select('*').eq('status','ready');assert.ifError(error);
const candidates=jobs.filter(job=>{try{return JSON.parse(job.artifacts?.['quality-review.json']||'{}').version!==2;}catch{return true;}});
const receipt={mode:apply?'apply':'audit',candidates:candidates.length,repaired:0,checks:[],checkedAt:new Date().toISOString()};
console.log(JSON.stringify({mode:receipt.mode,candidates:candidates.length,sections:candidates.reduce((n,j)=>n+j.chunks.length,0)}));
if(apply)for(const [index,original] of candidates.entries()){
 let complete=false,reviewRetries=0;
 for(let step=0;step<original.chunks.length+4;step++){
  const response=await db.functions.invoke('book-process',{body:{action:'repair',id:original.id}});
  if(response.error){let message='Worker unavailable';try{message=(await response.error.context.json()).error;}catch{}if(/source check found/.test(message)&&reviewRetries++<2){console.log(JSON.stringify({book:index+1,retryingRejectedSection:true}));continue;}throw new Error(message);}
  if(response.data.busy)throw new Error('Another repair is active. Retry this script after it finishes.');
  console.log(JSON.stringify({book:index+1,cursor:response.data.cursor,total:response.data.total_sections,repaired:response.data.repaired}));
  if(response.data.repaired){complete=true;break;}
  const interim=await db.from('book_processing_jobs').select('artifacts').eq('id',original.id).single();assert.ifError(interim.error);assert.equal(hash(interim.data.artifacts),hash(original.artifacts),'Original must remain available until checked replacement is complete');
 }
 assert.ok(complete,'Repair did not finish');
 const fresh=await db.from('book_processing_jobs').select('*').eq('id',original.id).single();assert.ifError(fresh.error);
 const job=fresh.data,review=JSON.parse(job.artifacts['quality-review.json']);assert.equal(review.version,2);assert.equal(job.source_text,original.source_text);assert.equal(job.source_sha,original.source_sha);assert.equal(job.cover_path,original.cover_path);assert.equal(job.status,'ready');assert.equal(job.notes.length,job.chunks.length);
 const backup=await db.storage.from('private-books').download(review.previousRevisionPath);assert.ifError(backup.error);const previous=JSON.parse(await backup.data.text());assert.equal(hash(previous.artifacts),hash(original.artifacts));assert.equal(previous.source_text,original.source_text);
 assert.doesNotMatch(Object.values(job.artifacts).join('\n'),/Discard any actions lacking deadlines/i);
 receipt.repaired++;receipt.checks.push({book:index+1,sourcePreserved:true,coverPreserved:true,originalSnapshotVerified:true,checkedSections:job.notes.length,currentSkillReadable:!/^name: book-[a-f0-9-]{36}$/m.test(job.artifacts['skill/SKILL.md'])});
}
if(output)writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify({complete:true,repaired:receipt.repaired}));
