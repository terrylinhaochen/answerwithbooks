import prompt from './book-reader-prompt.json' with {type:'json'};
import {GenerationReviewError,repairInput,citedFidelityInstructions,requireFaithfulSection} from './book-fidelity.mjs';
import {citedReviewSchema} from './book-schemas.mjs';
const words=text=>String(text).trim().split(/\s+/).filter(Boolean).length;
export const readerPrompt=prompt;
// A digest explains evidence; it need not repeat a source sentence verbatim.
export const readerReviewInstructions=citedFidelityInstructions+` This is an editorial digest, not a quotation extraction. Distinguish historical facts and author-attributed claims from clearly framed editorial interpretation. A limited synthesis or cautious implication can be supported by the cited events even when no source sentence states that synthesis verbatim. Do not reject such a claim solely for being interpretive or for lacking identical wording: explain any actual unsupported premise, leap, contradiction, or excess scope. Still reject invented facts, motives, author intentions, universal causal rules, guaranteed outcomes, and stronger claims than the evidence supports. Interpretations must remain identifiable as the editor's reading, not be attributed to the author without evidence. Reader-fit metadata can describe a relevant situation without claiming the author explicitly recommended it. All existing per-claim evidence, attribution, uncertainty, and factual-support requirements still apply.`;
// Give every processing section a bounded source budget, including late chapters.
export function readerEvidence(job){
 const lines=job.source_text.split('\n'),notes=job.notes||[],chosen=notes;
 const perSection=Math.min(14000,Math.floor(140000/Math.max(1,notes.length)));
 const endMatter=lines.findIndex(l=>/^\*\*\* END OF (?:THE|THIS) PROJECT GUTENBERG/i.test(l));
 const evidence=[];
 for(const note of chosen){
  const refs=[...(note.ideas||[]).flatMap(i=>i.sourceRefs||[]),...(note.scenes||[]).map(s=>({startLine:s.startLine,endLine:s.endLine})),...(note.sourceRefs||[])],seen=new Set();let remaining=perSection;
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
 if(count<bounds.minWords||count>bounds.maxWords)throw Error(`Editorial body needs ${bounds.minWords}–${bounds.maxWords} words from this evidence; received ${count}. ${count<bounds.minWords?'Develop additional source-backed mechanisms, examples and tensions toward the midpoint; preserve accurate material.':'Condense repetition while preserving the argument.'} Do not pad or invent evidence.`);
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
 const targetWords=Math.round((bounds.minWords+bounds.maxWords)/2);
 const input={title:job.title,author:job.author,bounds,writingBudget:{targetWords,approximateParagraphs:Math.ceil(targetWords/90),wordsPerParagraph:90,note:'Develop the source-backed argument across these paragraphs. Word bounds count body paragraphs only, not headings or metadata.'},scope:'Only the supplied source excerpts. Original chapter completeness is unverified.',evidence};
 const previous=job.generation_feedback?.phase==='editorial'?job.generation_feedback:null;
 const request=repairInput(input,previous);
 if(previous?.review?.issues?.some(issue=>String(issue).includes('Editorial body needs')))request.task=`Rewrite the complete digest with about ${targetWords} words in the body paragraphs, excluding headings and metadata. The previous draft failed the measured length bounds. Preserve its accurate material and develop source-backed explanations, examples, tensions and consequences to reach the target. Plan about ${Math.ceil(targetWords/90)} paragraphs averaging 90 words. Stay within ${bounds.minWords}–${bounds.maxWords} words. Do not pad, repeat points or invent claims; cite the supplied original evidence for each paragraph.`;
 let draft;
 const failed=previous?.review?.checks?.filter(check=>check.supported===false).map(check=>check.id)||[];
 if(failed.length){
  // Repair individual rejected claims; don't regenerate already approved paragraphs.
  const original=previous.draft,claims=readerClaims(original,evidence),paragraphIds=failed.filter(id=>id!=='metadata');
  if(failed.some(id=>!claims.some(c=>c.id===id)))throw new GenerationReviewError('editorial',original,{issues:['Repair findings must identify existing claims.']});
  const base=readerSchema(evidence,bounds),obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
  const refs=base.properties.evidenceIds;
  const metadata=failed.includes('metadata')?obj({oneLiner:base.properties.oneLiner,readIf:base.properties.readIf,evidenceIds:refs}):{type:'null'};
  const schema=obj({metadata,paragraphs:{type:'array',minItems:paragraphIds.length,maxItems:paragraphIds.length,items:obj({id:paragraphIds.length?{type:'string',enum:paragraphIds}:{type:'string'},text:{type:'string',minLength:1,maxLength:4000},evidenceIds:refs})}});
  const correction=await modelJson(prompt.instructions+' Repair only the rejected claims named in this request. Return metadata only when it failed, otherwise null. Return exactly one paragraph per rejected paragraph ID. Keep the existing heading, but narrow or replace an unsupported argument rather than preserving it. Correct its evidence citations and remove or qualify unsupported claims. Return paragraph prose only, without repeating its section heading. Write a finished digest, not a review report: do not narrate what the source supports, what an earlier draft claimed, or how you repaired it; express the narrower claim directly with its appropriate attribution. All other paragraphs are already saved and must not be rewritten.',JSON.stringify({title:job.title,author:job.author,evidence,previousDraft:original,rejectedClaims:claims.filter(c=>failed.includes(c.id)),findings:previous.review}),{name:'book_reader_repair',schema});
  if(!Array.isArray(correction.paragraphs)||correction.paragraphs.length!==paragraphIds.length||new Set(correction.paragraphs.map(p=>p.id)).size!==paragraphIds.length||correction.paragraphs.some(p=>!paragraphIds.includes(p.id)))throw new GenerationReviewError('editorial',original,previous.review);
  draft=structuredClone(original);
  if(failed.includes('metadata')){if(!correction.metadata)throw new GenerationReviewError('editorial',original,previous.review);Object.assign(draft,correction.metadata);}
  for(const p of correction.paragraphs){const [,section,paragraph]=/^s(\d+)p(\d+)$/.exec(p.id);const target=draft.sections[Number(section)-1],lines=p.text.trim().split('\n');while(lines[0]?.trim()===target.heading.trim())lines.shift();target.paragraphs[Number(paragraph)-1]={text:lines.join('\n').trim(),evidenceIds:p.evidenceIds};}
 }else draft=await modelJson(prompt.instructions,JSON.stringify(request),{name:'book_reader',schema:readerSchema(evidence,bounds)});
 try{validateReader(draft,job,evidence);}catch(e){throw new GenerationReviewError('editorial',draft,{issues:[e.message]});}
 const claims=readerClaims(draft,evidence);
 // Repair-process commentary is not finished prose, even if its facts are supported.
 const reviewChatter=/does not support a universal claim|staying within the source.{0,8}s specific scenes|source supports the narrower conclusion|rather than claiming more than they show/i;
 const presentation=claims.map(c=>({id:c.id,supported:!reviewChatter.test(c.notes),reason:'Write the qualified historical claim directly. Remove commentary about what the source supports or what the draft cannot claim; preserve the supported facts and citations.'}));
 if(presentation.some(c=>!c.supported))throw new GenerationReviewError('editorial',draft,{supported:false,issues:['Review-process commentary must be rewritten as finished reader-facing prose.'],checks:presentation});
 const review=await modelJson(readerReviewInstructions,JSON.stringify({claims}),{kind:'review',name:'book_reader_review',schema:citedReviewSchema(claims.map(c=>c.id))});
 try{requireFaithfulSection(review,claims.map(c=>c.id));}catch{throw new GenerationReviewError('editorial',draft,review);}
 return renderReader(draft,job,evidence,{status:'model-checked',method:'paragraph-cited-excerpts-v1',paragraphs:claims.length-1,reviewedAt:new Date().toISOString()});
}
