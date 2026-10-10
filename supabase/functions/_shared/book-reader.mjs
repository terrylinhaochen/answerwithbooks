import prompt from './book-reader-prompt.json' with {type:'json'};
import {GenerationReviewError,repairInput,citedFidelityInstructions,requireFaithfulSection} from './book-fidelity.mjs';
import {citedReviewSchema} from './book-schemas.mjs';
const words=text=>String(text).trim().split(/\s+/).filter(Boolean).length;
export const readerPrompt=prompt;
// Give every processing section a bounded source budget, including late chapters.
export function readerEvidence(job){
 const lines=job.source_text.split('\n'),notes=job.notes||[],chosen=notes;
 const perSection=Math.min(14000,Math.floor(140000/Math.max(1,notes.length)));
 const endMatter=lines.findIndex(l=>/^\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG/i.test(l));
 const evidence=[];
 for(const note of chosen){
  const refs=[...(note.ideas||[]).flatMap(i=>i.sourceRefs||[]),...(note.sourceRefs||[])],seen=new Set();let remaining=perSection;
  for(const ref of refs){
   if(!Number.isInteger(ref.startLine)||!Number.isInteger(ref.endLine)||ref.startLine<1||ref.endLine>lines.length||ref.endLine<ref.startLine)throw Error('Invalid reader evidence coordinates.');
   if(remaining<300||seen.has(ref.startLine)||(endMatter>=0&&ref.startLine>endMatter))continue;seen.add(ref.startLine);
   let end=ref.startLine,excerpt='';
   while(end<=ref.endLine&&excerpt.length+lines[end-1].length+12<=remaining){excerpt+=`${end}: ${lines[end-1]}\n`;end++;}
   if(!excerpt.trim())continue;remaining-=excerpt.length;
   evidence.push({id:`E${evidence.length+1}`,startLine:ref.startLine,endLine:end-1,text:excerpt.trimEnd(),sources:(job.source_manifest||[]).filter(s=>s.startLine<end&&s.endLine>=ref.startLine).map(s=>({name:s.name,startLine:s.startLine,endLine:s.endLine}))});
  }
 }
 if(!evidence.length)throw Error('No cited original text is available for the editorial summary.');
 return evidence;
}
export function readerBounds(job){
 const count=words(job.source_text),excerpt=count<10000;
 return count<2000?{minWords:Math.min(80,Math.max(15,Math.floor(count*.3))),maxWords:650,minSections:1,maxSections:3}:excerpt?{minWords:600,maxWords:1000,minSections:3,maxSections:4}:{minWords:1200,maxWords:1800,minSections:4,maxSections:6};
}
export function readerSchema(evidence,bounds){
 const str={type:'string',minLength:1,maxLength:4000},obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
 const refs={type:'array',items:{type:'string',enum:evidence.map(e=>e.id)},minItems:1,maxItems:8};
 return obj({oneLiner:{...str,maxLength:600},readIf:{...str,maxLength:600},evidenceIds:refs,sections:{type:'array',minItems:bounds.minSections,maxItems:bounds.maxSections,items:obj({heading:{...str,maxLength:150},paragraphs:{type:'array',minItems:1,maxItems:6,items:obj({text:str,evidenceIds:refs})}})}});
}
export function validateReader(draft,job,evidence=readerEvidence(job)){
 const bounds=readerBounds(job),ids=new Set(evidence.map(e=>e.id));
 const checkText=(s,max)=>{if(typeof s!=='string'||!s.trim()||s.length>max||/[<>]|^\s*#|\n\s*[-*#]/m.test(s))throw Error('Use bounded, plain editorial prose.');};
 const checkRefs=refs=>{if(!Array.isArray(refs)||!refs.length||refs.length>8||new Set(refs).size!==refs.length||refs.some(id=>!ids.has(id)))throw Error('Every reader claim must cite supplied evidence IDs.');};
 if(!draft||Object.keys(draft).some(k=>!['oneLiner','readIf','evidenceIds','sections'].includes(k)))throw Error('Invalid reader data.');
 checkText(draft.oneLiner,600);checkText(draft.readIf,600);checkRefs(draft.evidenceIds);
 if(!Array.isArray(draft.sections)||draft.sections.length<bounds.minSections||draft.sections.length>bounds.maxSections)throw Error('Use the requested number of editorial sections.');
 const seen=new Set();
 for(const section of draft.sections){checkText(section.heading,150);if(/^(core lessons|key frameworks|key takeaways|conclusion)$/i.test(section.heading))throw Error('Use idea-led headings.');
  if(!Array.isArray(section.paragraphs)||!section.paragraphs.length||section.paragraphs.length>6)throw Error('Invalid editorial paragraphs.');
  for(const p of section.paragraphs){checkText(p.text,4000);checkRefs(p.evidenceIds);if(seen.has(p.text.trim()))throw Error('Repeated editorial paragraph.');seen.add(p.text.trim());}
 }
 const count=words(draft.sections.flatMap(s=>s.paragraphs.map(p=>p.text)).join(' '));
 if(count<bounds.minWords||count>bounds.maxWords)throw Error(`Editorial body needs ${bounds.minWords}–${bounds.maxWords} words from this evidence; received ${count}. Do not pad. Narrow unsupported claims and use source-backed mechanisms.`);
 return draft;
}
export function readerClaims(draft,evidence){
 const claim=(id,text,ids)=>({id,notes:text,evidence:ids.map(id=>evidence.find(e=>e.id===id).text).join('\n\n')});
 return [claim('metadata',`${draft.oneLiner}\n${draft.readIf}`,draft.evidenceIds),...draft.sections.flatMap((s,i)=>s.paragraphs.map((p,j)=>claim(`s${i+1}p${j+1}`,`${s.heading}\n${p.text}`,p.evidenceIds)))];
}
export function renderReader(draft,job,evidence,review){
 validateReader(draft,job,evidence);
 return {'reader/digest.md':draft.sections.map(s=>`## ${s.heading}\n\n`+s.paragraphs.map(p=>p.text).join('\n\n')).join('\n\n')+'\n',
  'reader/digest.json':JSON.stringify({version:2,promptVersion:prompt.version,promptSha256:prompt.instructionsSha256,title:job.title,author:job.author,sourceSha256:job.source_sha,...draft,review},null,2),
  'reader/evidence.json':JSON.stringify({promptVersion:prompt.version,sourceSha256:job.source_sha,evidence:evidence.map(({text,...ref})=>ref)},null,2)};
}
export async function compileReader(job,modelJson){
 const evidence=readerEvidence(job),bounds=readerBounds(job);
 const input={title:job.title,author:job.author,bounds,scope:'Only the supplied source excerpts. Original chapter completeness is unverified.',evidence};
 const draft=await modelJson(prompt.instructions,JSON.stringify(repairInput(input,job.generation_feedback?.phase==='editorial'?job.generation_feedback:null)),{name:'book_reader',schema:readerSchema(evidence,bounds)});
 try{validateReader(draft,job,evidence);}catch(e){throw new GenerationReviewError('editorial',draft,{issues:[e.message]});}
 const claims=readerClaims(draft,evidence);
 const review=await modelJson(citedFidelityInstructions,JSON.stringify({claims}),{kind:'review',name:'book_reader_review',schema:citedReviewSchema(claims.map(c=>c.id))});
 try{requireFaithfulSection(review,claims.map(c=>c.id));}catch{throw new GenerationReviewError('editorial',draft,review);}
 return renderReader(draft,job,evidence,{status:'model-checked',method:'paragraph-cited-excerpts-v1',paragraphs:claims.length-1,reviewedAt:new Date().toISOString()});
}
