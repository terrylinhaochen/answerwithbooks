import {guideMeter} from './guide-meter.mjs';
import {readingInstructions,sourceSpan,bookMap} from './reading-guides.mjs';
const checked=r=>{if(r.error)throw Error('Could not search the reading index.');return r.data;};
export async function embedTexts(texts,getEnv,fetchImpl=fetch){
 if(!getEnv('OPENAI_API_KEY'))throw Error('Semantic retrieval is not configured.');
 const response=await fetchImpl('https://api.openai.com/v1/embeddings',{method:'POST',headers:{Authorization:'Bearer '+getEnv('OPENAI_API_KEY'),'Content-Type':'application/json'},body:JSON.stringify({model:'text-embedding-3-small',dimensions:512,input:texts}),signal:AbortSignal.timeout(50000)});
 if(!response.ok)throw Error('Semantic retrieval is temporarily unavailable.');
 const value=await response.json();const vectors=value.data?.sort((a,b)=>a.index-b.index).map(x=>x.embedding);
 if(!Array.isArray(vectors)||vectors.length!==texts.length||vectors.some(v=>v.length!==512||v.some(n=>!Number.isFinite(n))))throw Error('Invalid retrieval vectors.');
 return {vectors,tokens:value.usage?.total_tokens??null};
}
const indexSchema={type:'object',additionalProperties:false,required:['indices'],properties:{indices:{type:'array',items:{type:'integer'}}}};
// Keep the model's valid, distinct record numbers (up to 12) and drop invented or repeated ones.
// An answer with entries but none valid is malformed; an empty list means no plausible match.
export function shortlistIndices(result,records,message){
 const raw=Array.isArray(result?.indices)?result.indices:null;if(!raw)throw Error(message);
 const kept=[...new Set(raw.filter(i=>Number.isInteger(i)&&records[i]))].slice(0,12);
 if(raw.length&&!kept.length)throw Error(message);
 return kept;
}
export async function searchGuideCandidates(db,job,model,getEnv,bookIds=null){
 const coverage=checked(await db.rpc('guide_index_coverage',{p_user:job.user_id,p_books:bookIds,p_public:job.visibility==='public'}));
 if(coverage?.failed)throw Error('A book search index needs repair. Please try again later.');
 if(coverage?.pending){const e=Error('Preparing the library for passage search.');e.code='INDEX_PREPARING';throw e;}
 const meter=guideMeter(db,job),op=await meter.reserve('text-embedding-3-small','query-embedding',new TextEncoder().encode(job.question).length+1024,0);
 let embedded;let metric={inputTokens:null,outputTokens:null,outcome:'error'};
 try{embedded=await embedTexts([job.question],getEnv);metric={inputTokens:embedded.tokens,outputTokens:0,outcome:'complete'};}
 finally{await meter.settle(op,'text-embedding-3-small',metric);}
 const rows=checked(await db.rpc('search_guide_index',{p_user:job.user_id,p_query:job.question,p_embedding:JSON.stringify(embedded.vectors[0]),p_books:bookIds,p_public:job.visibility==='public'}));
 if(!rows.length)return [];
 const result=await model(readingInstructions+' Shortlist promising passages to inspect in their ORIGINAL context. These searchable records are navigation only. Keep uncertain but potentially illuminating parallels, contrasts and reflective experiences. Return {indices:number[]} with up to 12 distinct values taken from the records\' index fields, preserving diverse perspectives. No fixed similarity threshold and no requirement for actionable advice. Return {indices:[]} when none has a plausible connection.',JSON.stringify({question:job.question,records:rows.map((r,index)=>({index,bookId:r.book_id,kind:r.kind,account:r.body.slice(0,r.kind==='original'?900:1200)}))}),{name:'passage_shortlist',maxOutputTokens:1200,schema:indexSchema});
 let selected=shortlistIndices(result,rows,'Invalid retrieval shortlist.').map(i=>rows[i]);
 const parents=selected.filter(r=>r.kind==='chapter'||r.kind==='section');
 if(parents.length){
  const expanded=selected.filter(r=>r.kind==='scene'||r.kind==='original');
  for(const bookId of [...new Set(parents.map(r=>r.book_id))]){
   const children=checked(await db.rpc('search_guide_index',{p_user:job.user_id,p_query:job.question,p_embedding:JSON.stringify(embedded.vectors[0]),p_books:[bookId],p_public:job.visibility==='public'}));
   expanded.push(...children.filter(r=>(r.kind==='scene'||r.kind==='original')&&parents.some(p=>p.book_id===r.book_id&&r.start_line<=p.end_line&&r.end_line>=p.start_line)).slice(0,8));
  }
  const unique=expanded.filter((r,i,a)=>!a.slice(0,i).some(x=>x.id===r.id));
  if(!unique.length)return [];
  const narrowed=await model(readingInstructions+' Narrow these source-window and scene records to up to 12 originals worth inspecting. Return {indices:number[]} with distinct values taken from the records\' index fields. Retain distinct direct and indirect connections; omit weak matches. Chapter summaries only located these candidates, and are not themselves original passages.',JSON.stringify({question:job.question,records:unique.map((r,index)=>({index,account:r.body.slice(0,1000)}))}),{name:'chapter_to_passages',maxOutputTokens:1200,schema:indexSchema});
  selected=shortlistIndices(narrowed,unique,'Invalid chapter passage shortlist.').map(i=>unique[i]);
 }
 return selected.map(r=>({bookId:r.book_id,startLine:r.start_line,endLine:r.end_line,recordKind:r.kind}));
}
// Expand to surrounding paragraphs, and bound one source window without cutting a line.
export function candidateWindow(book,ref,maxChars=6500){
 const lines=book.source_text.split('\n');let start=Math.max(1,ref.startLine-6),end=Math.min(lines.length,ref.endLine+6);
 while(start>1&&lines[start-2]?.trim()&&ref.startLine-start<18)start--;
 let length=0,actual=start-1;
 for(let i=start;i<=end;i++){if(length+lines[i-1].length+1>maxChars)break;length+=lines[i-1].length+1;actual=i;}
 if(actual<ref.startLine){start=ref.startLine;actual=start;while(actual<end&&lines.slice(start-1,actual+1).join('\n').length<=maxChars)actual++;actual=Math.max(start,actual-1);}
 if(sourceSpan(book,{startLine:start,endLine:actual}).length>maxChars)throw Error('Source line is too large to inspect safely.');
 return {bookId:book.id,startLine:start,endLine:actual};
}
export function compactBookContext(book,passages=[]){
 const map=bookMap(book);const ranges=passages.filter(p=>p.bookId===book.id);
 const sections=(map.sections||[]).filter(s=>ranges.some(p=>(s.sourceRefs||[]).some(r=>r.startLine<=p.endLine&&r.endLine>=p.startLine)));
 return {orientation:map.orientation||'',sections:sections.map(s=>({title:s.title,summary:s.summary,sourceRefs:s.sourceRefs})).slice(0,12)};
}
