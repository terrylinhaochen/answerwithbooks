import {planGuideCover,guideCoverVersion} from './guide-cover.mjs';
import {nominateBooks,proposeReading,selectReading,writeReading,reviewReading,hydrateReading,readingInstructions} from './reading-guides.mjs';
export function checked(result){if(result.error)throw Error('Could not access saved reading data.');return result.data;}
export async function allRows(makeQuery){const rows=[];for(let start=0;;start+=500){const batch=checked(await makeQuery().range(start,start+499));rows.push(...batch);if(batch.length<500)return rows;}}
export async function sourceBooks(db,userId,ids,{savedReading=false}={}){
 if(!ids?.length)return [];
 // Archiving removes a book from discovery, not the owner's existing readings.
 let query=db.from('book_processing_jobs').select('id,title,author,source_text,source_sha,notes,artifacts').or(savedReading&&userId?`user_id.eq.${userId},and(visibility.eq.public,archived_at.is.null)`:userId?`visibility.eq.public,user_id.eq.${userId}`:'visibility.eq.public').eq('status','ready').eq('deletion_pending',false).is('duplicate_of',null);
 if(!savedReading||!userId)query=query.is('archived_at',null);
 return checked(await query.in('id',ids));
}
export async function drainGuide(db,model,hash,renderCover){
 const job=checked(await db.rpc('claim_reading_guide'));if(!job?.id)return null;
 const patch={lease_token:null,lease_until:null,updated_at:new Date().toISOString(),attempts:0,error:null};
 try {
  if(job.status==='ready'&&job.cover_status==='pending'){
   if(!job.cover_design){const recent=checked(await db.from('reading_guides').select('cover_design').eq('user_id',job.user_id).not('cover_design','is',null).order('created_at',{ascending:false}).limit(12));patch.cover_design=await planGuideCover(job,recent.map(r=>r.cover_design),model);}
   else{const result=await renderCover(job.cover_design);const path=`${job.user_id}/reading-guides/${job.id}/cover-${guideCoverVersion}.png`;checked(await db.storage.from('private-books').upload(path,result.bytes,{contentType:'image/png',upsert:true}));patch.cover_path=path;patch.cover_status='ready';patch.cover_usage=result.usage;}
  }else if(job.status==='scanning'){
   const offset=job.progress.offset||0;
   // Snapshot every eligible source ID once. No lexical or embedding candidate filter.
   let ids=job.progress.libraryIds;
   if(!ids){const rows=await allRows(()=>db.from('book_processing_jobs').select('id').or(job.visibility==='public'?'visibility.eq.public':`visibility.eq.public,user_id.eq.${job.user_id}`).is('duplicate_of',null).eq('status','ready').eq('is_current',true).is('archived_at',null).order('id'));ids=rows.map(b=>b.id);}
   if(offset<ids.length){
    const books=await sourceBooks(db,job.user_id,ids.slice(offset,offset+1));
    const candidates=await nominateBooks(job.question,books,model);
    // Candidate text is deliberately not persisted; read it again from owned editions.
    patch.progress={...job.progress,libraryIds:ids,offset:offset+1,candidates:[...(job.progress.candidates||[]),...candidates.map(({text,...ref})=>ref)]};
   }else{patch.status=ids.length?'proposing':'gap';if(!ids.length)patch.proposal={bookIds:[],gap:'Add a biography or memoir to the shared library to begin.'};}
  }else if(job.status==='proposing'){
   const refs=job.progress.candidates||[];
   const books=await sourceBooks(db,job.user_id,[...new Set(refs.map(r=>r.bookId))]);
   // Reduce large libraries in model-read batches, preserving originals for each decision.
   let candidates=refs;
   if(refs.length>6){
    const batch=refs.slice(0,6), hydrated=await hydrateReading({sections:batch},books,hash);
    const selected=await compareCandidates(job.question,hydrated.sections,model);
    patch.progress={...job.progress,candidates:[...refs.slice(6),...selected.map(index=>batch[index])]};
   }else{
    const hydrated=await hydrateReading({sections:candidates},books,hash);
    let proposal=await proposeReading(job.question,hydrated.sections,model);
    if(job.progress.requiredBookIds?.some(id=>!proposal.bookIds.includes(id)))proposal={bookIds:[],connection:'',gap:'We could not find passages that answer this question in every selected book. Try a different question or change the books.'};
    patch.proposal={...proposal,books:books.filter(b=>proposal.bookIds.includes(b.id)).map(b=>({id:b.id,title:b.title,author:b.author}))};patch.book_ids=proposal.bookIds;patch.status=proposal.bookIds.length?'awaiting_confirmation':'gap';patch.progress={};
   }
  }else if(job.status==='composing'){
   const books=await sourceBooks(db,job.user_id,job.book_ids);if(books.length!==job.book_ids.length)throw Error('A confirmed book is no longer available.');
   if(!job.progress.passages){patch.progress={...job.progress,passages:await selectReading(job.question,job.length,books,model,job.progress.feedback)};}
   else if(!job.progress.draft){patch.progress={...job.progress,draft:await writeReading(job.question,job.length,books,job.progress.passages,model,job.progress.feedback)};}
   else{const composed=await reviewReading(job.question,books,job.progress.draft,model);const hydrated=await hydrateReading(composed,books,hash);
    patch.guide={...hydrated,sections:hydrated.sections.map(({text,...s})=>s),version:1};patch.status='ready';patch.cover_status='pending';patch.book_ids=[...new Set(hydrated.sections.map(s=>s.bookId))];patch.progress={};}
  }
 }catch(error){
  if(job.status==='ready'){patch.cover_status=job.attempts>=2?'failed':'pending';patch.attempts=job.attempts;patch.next_attempt_at=new Date(Date.now()+60000).toISOString();}
  else {
  if(job.status==='composing'){const repairs=(job.progress.repairs||0)+1;patch.progress={repairs,feedback:error instanceof Error?error.message:'Source review failed.',...((error&&error.selectionDiagnostic)?{selectionDiagnostic:error.selectionDiagnostic}:{})};if(repairs>=3)patch.status='failed';}
  patch.attempts=job.attempts;patch.status=patch.status==='failed'||job.attempts>=3?'failed':job.status;patch.error=error instanceof Error?error.message:'Could not prepare the reading.';patch.next_attempt_at=new Date(Date.now()+60000).toISOString();}
 }
 checked(await db.from('reading_guides').update(patch).eq('id',job.id).eq('lease_token',job.lease_token).select('id').single());
 return {processed:job.id,status:patch.status||job.status};
}
export async function answerGuides(db,userId,question,model,hash){
 const rows=await allRows(()=>db.from('reading_guides').select('id,question,guide').or(`visibility.eq.public,user_id.eq.${userId}`).eq('status','ready').order('id'));
 const picked=[];
 for(let offset=0;offset<rows.length;offset+=20){
  const batch=rows.slice(offset,offset+20),result=await model(readingInstructions+' Which saved readings help answer this question? Return {ids:string[]}; none if no fit.',JSON.stringify({question,guides:batch.map(g=>({id:g.id,question:g.question,introduction:g.guide.introduction}))}));
  if(!Array.isArray(result.ids)||result.ids.some(id=>!batch.some(g=>g.id===id)))throw Error('Invalid guide selection.');picked.push(...batch.filter(g=>result.ids.includes(g.id)));
 }
 if(!picked.length)return {answer:'Your saved guides do not yet answer this question.',sources:[]};
 let finalists=picked;
 while(finalists.length>4){const batch=finalists.slice(0,20);const result=await model(readingInstructions+' Choose up to four of these saved readings whose distinct contributions best develop the question. Return {ids:string[]}. Do not select by position.',JSON.stringify({question,guides:batch.map(g=>({id:g.id,question:g.question,introduction:g.guide.introduction,conclusion:g.guide.conclusion}))}));
  if(!Array.isArray(result.ids)||result.ids.length>4||result.ids.some(id=>!batch.some(g=>g.id===id)))throw Error('Invalid guide comparison.');finalists=[...finalists.slice(20),...batch.filter(g=>result.ids.includes(g.id))];
 }
 const evidence=[];
 for(const g of finalists){const books=await sourceBooks(db,userId,[...new Set(g.guide.sections.map(s=>s.bookId))]);evidence.push({id:g.id,question:g.question,reading:await hydrateReading(g.guide,books,hash)});}
 const result=await model(readingInstructions+' Answer from these saved readings and original passages. Return {answer:string,sources:[{guideId,sectionIndex}]}. Distinguish editorial inference from the author. Cite at least one supporting section, or say the evidence is insufficient with sources:[].',JSON.stringify({question,evidence}));
 if(typeof result.answer!=='string'||!Array.isArray(result.sources)||result.sources.some(s=>!evidence.some(g=>g.id===s.guideId&&Number.isInteger(s.sectionIndex)&&g.reading.sections[s.sectionIndex])))throw Error('Invalid guide answer references.');
 return result;
}

export async function compareCandidates(question,candidates,model){
 const result=await model(readingInstructions+' Read each original scene and choose up to two whose distinct contributions best develop this question. Return {indices:number[]} using zero-based candidate indices. Choose by meaning and evidence, never position. An empty list is appropriate when none contributes.',JSON.stringify({question,candidates}));
 if(!Array.isArray(result.indices)||result.indices.length>2||new Set(result.indices).size!==result.indices.length||result.indices.some(i=>!Number.isInteger(i)||i<0||i>=candidates.length))throw Error('Invalid candidate comparison.');
 return result.indices;
}
