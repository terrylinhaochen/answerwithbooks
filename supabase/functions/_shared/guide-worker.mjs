import {guideModel,meteredGuideCover} from './guide-meter.mjs';
import {searchGuideCandidates,candidateWindow} from './guide-retrieval.mjs';
import {proofreadPassages} from './guide-proofreading.mjs';
import {planGuideCover,guideCoverVersion,currentGuideCoverDesign} from './guide-cover.mjs';
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
export async function drainGuide(db,model,hash,renderCover,options={}){
 const job=checked(await db.rpc('claim_reading_guide'));if(!job?.id)return null;
 if(options.getEnv)model=guideModel(db,job,options.getEnv);
 const patch={lease_token:null,lease_until:null,updated_at:new Date().toISOString(),attempts:0,error:null};
 try {
  if(job.status==='ready'&&job.cover_status==='pending'){
   if(!job.cover_design){const recent=checked(await db.from('reading_guides').select('cover_design').eq('user_id',job.user_id).not('cover_design','is',null).order('created_at',{ascending:false}).limit(12));patch.cover_design=await planGuideCover(job,recent.map(r=>r.cover_design),model);}
   else{const design=currentGuideCoverDesign(job.cover_design);patch.cover_design=design;const result=options.getEnv?await meteredGuideCover(db,job,()=>renderCover(design)):await renderCover(design);const path=`${job.user_id}/reading-guides/${job.id}/cover-${guideCoverVersion}.png`;checked(await db.storage.from('private-books').upload(path,result.bytes,{contentType:'image/png',upsert:true}));patch.cover_path=path;patch.cover_status='ready';patch.cover_usage=result.usage;}
  }else if(job.status==='scanning'){
   const refs=await (options.searchCandidates||searchGuideCandidates)(db,job,model,options.getEnv,job.progress.requiredBookIds||null);
   const books=await sourceBooks(db,job.user_id,[...new Set(refs.map(r=>r.bookId))]);
   const candidates=refs.map(r=>candidateWindow(books.find(b=>b.id===r.bookId),r));
   patch.progress={...job.progress,candidates};patch.status=candidates.length?'proposing':'gap';
   if(!candidates.length)patch.proposal={bookIds:[],matches:[],gap:'No relevant passages were found. Try another question or choose books yourself.'};
  }else if(job.status==='proposing'){
   const refs=job.progress.candidates||[];
   const books=await sourceBooks(db,job.user_id,[...new Set(refs.map(r=>r.bookId))]);
   const hydrated=await hydrateReading({sections:refs},books,hash);
   const proposal=await proposeReading(job.question,hydrated.sections,model);
   patch.proposal={...proposal,books:books.filter(b=>proposal.bookIds.includes(b.id)).map(b=>({id:b.id,title:b.title,author:b.author}))};patch.book_ids=proposal.bookIds;patch.status=proposal.bookIds.length?'awaiting_confirmation':'gap';patch.progress={};
  }else if(job.status==='composing'){
   const books=await sourceBooks(db,job.user_id,job.book_ids);if(books.length!==job.book_ids.length)throw Error('A confirmed book is no longer available.');
   if(!job.progress.candidates&&!job.progress.passages){
    const refs=await (options.searchCandidates||searchGuideCandidates)(db,job,model,options.getEnv,job.book_ids);
    const leads=(job.proposal?.matches||[]).filter(p=>job.book_ids.includes(p.bookId));
    if(leads.length)await hydrateReading({sections:leads},books,hash);
    const found=refs.map(r=>candidateWindow(books.find(b=>b.id===r.bookId),r));
    const candidates=[...leads,...found].filter((r,i,all)=>!all.slice(0,i).some(x=>x.bookId===r.bookId&&x.startLine===r.startLine&&x.endLine===r.endLine));
    if(!candidates.length){const e=Error('No relevant passages were found in these books. Try another question or choose other books.');e.code='NO_RELEVANT_PASSAGES';throw e;}
    patch.progress={...job.progress,candidates:candidates.slice(0,8)};
   }else if(!job.progress.passages){patch.progress={...job.progress,passages:await selectReading(job.question,job.length,books,model,job.progress.feedback,job.progress.candidates)};}
   else if(!job.progress.proofread){patch.progress={...job.progress,passages:await proofreadPassages(books,job.progress.passages,model),proofread:true};}
   else if(!job.progress.draft){patch.progress={...job.progress,draft:await writeReading(job.question,job.length,books,job.progress.passages,model,job.progress.feedback)};}
   else{const composed=await reviewReading(job.question,books,job.progress.draft,model);const hydrated=await hydrateReading(composed,books,hash);
    patch.guide={...hydrated,sections:hydrated.sections.map(({text,...s})=>s),version:1};patch.status='ready';patch.cover_status='pending';patch.book_ids=[...new Set(hydrated.sections.map(s=>s.bookId))];patch.progress={};}
  }
 }catch(error){
  if(error?.code==='INDEX_PREPARING'){patch.attempts=0;patch.next_attempt_at=new Date(Date.now()+30000).toISOString();}
  else if(error?.code==='GUIDE_BUDGET_LIMIT'){patch.error=error.message;patch.attempts=job.attempts;if(job.status==='ready')patch.cover_status='failed';else patch.status='failed';}
  else if(job.status==='ready'){patch.cover_status=job.attempts>=2?'failed':'pending';patch.attempts=job.attempts;patch.next_attempt_at=new Date(Date.now()+60000).toISOString();}
  else if(job.status==='composing'&&error?.code==='NO_RELEVANT_PASSAGES'){patch.status='gap';patch.progress={};patch.proposal={bookIds:[],gap:error.message};}
  else {
  if(job.status==='composing'){const repairs=(job.progress.repairs||0)+1;patch.progress={...(job.progress.candidates?{candidates:job.progress.candidates}:{}),...(error?.code==='PROOFREAD_VALIDATION'&&job.progress.passages?{passages:job.progress.passages}:{}),repairs,feedback:error instanceof Error?error.message:'Source review failed.',...((error&&error.selectionDiagnostic)?{selectionDiagnostic:error.selectionDiagnostic}:{})};if(repairs>=3)patch.status='failed';}
  patch.attempts=job.attempts;patch.status=patch.status==='failed'||job.attempts>=3?'failed':job.status;patch.error=error instanceof Error?error.message:'Could not prepare the reading.';patch.next_attempt_at=new Date(Date.now()+60000).toISOString();}
 }
 checked(await db.from('reading_guides').update(patch).eq('id',job.id).eq('lease_token',job.lease_token).select('id').single());
 return {processed:job.id,status:patch.status||job.status};
}
export async function answerGuides(db,userId,question,model,hash){
 const rows=await allRows(()=>db.from('reading_guides').select('id,question,guide').or(`and(visibility.eq.public,is_private.eq.false),user_id.eq.${userId}`).eq('status','ready').order('id'));
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
 const result=await model(readingInstructions+' Read each original scene and choose up to four whose distinct contributions best develop this question. Return {indices:number[]} using zero-based candidate indices. Choose by the value of the connection, including grounded parallels, contrasts and reflection; do not rank a direct actionable answer above an illuminating indirect passage by default. Choose by meaning and evidence, never position. An empty list is appropriate when none contributes.',JSON.stringify({question,candidates}));
 if(!Array.isArray(result.indices)||result.indices.length>4||new Set(result.indices).size!==result.indices.length||result.indices.some(i=>!Number.isInteger(i)||i<0||i>=candidates.length))throw Error('Invalid candidate comparison.');
 return result.indices;
}
