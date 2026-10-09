// Incomplete uploads must resume intake. Everything already saved keeps its
// progress, options, review state and artifacts; lookup never restarts a job.
export function reusableBook(job) {
 return !!job && (job.status !== 'uploaded' || job.run_state === 'queued');
}
export function cachedBookSummary(job) {
 return {id:job.id,title:job.title,status:job.status,run_state:job.run_state};
}

// Fingerprints are exact, account-scoped, and never based on title similarity.
// Revisions deliberately bypass this helper at the caller.
export async function findSavedBook(db,userId,{sha,textSha,excludeId}={}) {
 const valid=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 const filters=[];
 if(valid(sha))filters.push(`source_sha.eq.${sha}`);
 if(valid(textSha))filters.push(`source_text_sha.eq.${textSha}`,`source_import->>textSha.eq.${textSha}`);
 if(!filters.length)return null;
 let query=db.from('book_processing_jobs').select('id,title,status,run_state,is_current,created_at')
  .eq('user_id',userId).neq('revision_kind','append').or(filters.join(','))
  .order('is_current',{ascending:false}).order('created_at',{ascending:false});
 if(excludeId)query=query.neq('id',excludeId);
 const {data,error}=await query;
 if(error)throw new Error('Could not check your saved books. Please retry.');
 const reusable=(data||[]).filter(reusableBook);
 // Prefer an available complete package over an older failed or active duplicate.
 return reusable.find(job=>job.status==='ready'&&job.is_current!==false)
  ||reusable.find(job=>job.status==='ready')||reusable[0]||null;
}
