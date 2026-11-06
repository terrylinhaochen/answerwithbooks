import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sourceSpan,hydrateReading,nominateBooks,proposeReading,composeReading,mapReadingSection,selectReading} from '../supabase/functions/_shared/reading-guides.mjs';
const book={id:'knight',title:'A life',author:'A writer',source_text:'First line.\nExact words — and punctuation.\nLast line.',notes:[]};
const hash=async bytes=>createHash('sha256').update(bytes).digest('hex');
const modelResponses=(...responses)=>async()=>responses.shift();
test('source ranges reproduce exact stored prose and reject invalid boundaries',()=>{assert.equal(sourceSpan(book,{startLine:2,endLine:3}),'Exact words — and punctuation.\nLast line.');for(const ref of [{startLine:0,endLine:2},{startLine:2,endLine:4},{startLine:3,endLine:1},{startLine:1.2,endLine:2}])assert.throws(()=>sourceSpan(book,ref));});
test('render verifies source hashes and refuses missing editions',async()=>{const g={introduction:'Context',conclusion:'End',sections:[{bookId:'knight',startLine:1,endLine:2}]};const first=await hydrateReading(g,[book],hash);assert.equal(first.sections[0].text,sourceSpan(book,g.sections[0]));await assert.rejects(hydrateReading(first,[{...book,source_text:'Changed.\nExact words — and punctuation.\nLast line.'}],hash),/edition changed/);await assert.rejects(hydrateReading(g,[],hash),/no longer available/);});
test('candidate choice cannot introduce a book outside the account library',async()=>{await assert.rejects(nominateBooks('A question',[book],modelResponses({candidates:[{bookId:'other-owner',startLine:1,endLine:2}]})),/Unknown candidate/);});
test('empty model selection produces a truthful gap',async()=>{const gap=await proposeReading('No fitting topic',[],modelResponses({bookIds:[],connection:'',gap:'No supplied life speaks to this.'}));assert.deepEqual(gap.bookIds,[]);});
test('proposal is bounded by original candidates',async()=>{await assert.rejects(proposeReading('Question',[{bookId:'knight'}],modelResponses({bookIds:['invented'],connection:'x'})),/Invalid proposed/);});
test('a guide cannot silently add an unconfirmed book',async()=>{await assert.rejects(composeReading('Question','short',[book],modelResponses({passages:[{bookId:'outside',startLine:1,endLine:2}]})),/Unconfirmed/);});
test('overlapping source selections are rejected',async()=>{await assert.rejects(composeReading('Question','short',[book],modelResponses({passages:[{bookId:'knight',startLine:1,endLine:2},{bookId:'knight',startLine:2,endLine:3}]},{passages:[{candidateIndex:0,startLine:1,endLine:2},{candidateIndex:1,startLine:2,endLine:3}]})),/overlap/);});
test('review failure prevents a generated reading from becoming ready',async()=>{await assert.rejects(composeReading('Question','short',[book],modelResponses({passages:[{bookId:'knight',startLine:1,endLine:2}]},{passages:[{candidateIndex:0,startLine:1,endLine:2}]},{introduction:'Context',sections:[{heading:'Scene',before:'Before',after:'After'}],conclusion:'End'},{passed:false})),/source review/);});
test('successful guide contains references, never model-reconstructed source prose',async()=>{const result=await composeReading('Question','short',[book],modelResponses({passages:[{bookId:'knight',startLine:1,endLine:2}]},{passages:[{candidateIndex:0,startLine:1,endLine:2}]},{introduction:'Context',sections:[{heading:'Scene',before:'Before',after:'After'}],conclusion:'End'},{passed:true}));assert.equal(result.sections[0].text,undefined);assert.equal((await hydrateReading(result,[book],hash)).sections[0].text,sourceSpan(book,{startLine:1,endLine:2}));});
test('mapped scenes must cite the provided section and pass source review',async()=>{const chunk={start:1,end:3,text:book.source_text};await assert.rejects(mapReadingSection(chunk,0,modelResponses({summary:'A scene',scenes:[{title:'Scene',account:'Event',startLine:0,endLine:3}]})),/coordinates/);await assert.rejects(mapReadingSection(chunk,0,modelResponses({summary:'A scene',scenes:[]},{passed:false})),/source check/);});
test('library scans paginate past the database default window',async()=>{const {allRows}=await import('../supabase/functions/_shared/guide-worker.mjs');const data=Array.from({length:1201},(_,id)=>({id}));const ranges=[];const result=await allRows(()=>({range:async(start,end)=>{ranges.push([start,end]);return {data:data.slice(start,end+1)};}}));assert.equal(result.length,1201);assert.deepEqual(ranges,[[0,499],[500,999],[1000,1499]]);});

import {compareCandidates} from '../supabase/functions/_shared/guide-worker.mjs';
test('large-library comparison keeps the model-selected scenes, not the first scenes',async()=>{
 assert.deepEqual(await compareCandidates('A question',Array.from({length:6},(_,i)=>({text:`Original scene ${i}`})),async()=>({indices:[5,3]})),[5,3]);
 await assert.rejects(()=>compareCandidates('A question',[{text:'Source'}],async()=>({indices:[7]})),/Invalid candidate/);
});

test('final passage selection reads numbered originals and cannot escape inspected candidates',async()=>{
 let calls=0;
 const selected=await selectReading('Question','short',[book],async(system,input)=>{calls++;if(calls===1)return {passages:[{bookId:'knight',startLine:1,endLine:3}]};assert.match(JSON.parse(input).candidates[0].text,/2: Exact words/);return {passages:[{candidateIndex:0,startLine:2,endLine:3}]};});
 assert.equal(calls,2);assert.equal(selected[0].startLine,2);
 await assert.rejects(selectReading('Question','short',[book],modelResponses({passages:[{bookId:'knight',startLine:1,endLine:2}]},{passages:[{candidateIndex:0,startLine:1,endLine:3}]})),/inside the inspected/);
});

test('a rejected selection is discarded for repair and repeated content failures stop',async()=>{
 const {drainGuide}=await import('../supabase/functions/_shared/guide-worker.mjs');
 for(const repairs of [0,2]){
  let saved;
  const job={id:'guide',user_id:'owner',lease_token:'lease',status:'composing',question:'Question',length:'short',attempts:1,book_ids:['knight'],progress:{repairs,passages:[{bookId:'unconfirmed',startLine:1,endLine:2}]}};
  const db={rpc:async()=>({data:job}),from:table=>{
   if(table==='book_processing_jobs'){const q={select:()=>q,eq:()=>q,or:()=>q,is:()=>q,in:async()=>({data:[book]})};return q;}
   const q={update:p=>{saved=p;return q;},eq:()=>q,select:()=>q,single:async()=>({data:{id:'guide'}})};return q;
  }};
  await drainGuide(db,async()=>{throw Error('No model call expected for an invalid source');},hash);
  assert.equal(saved.progress.passages,undefined);assert.equal(saved.progress.repairs,repairs+1);assert.match(saved.progress.feedback,/Unconfirmed/);assert.equal(saved.status,repairs===2?'failed':'composing');
 }
});

test('editorial generation constrains the provider to one section per selected passage',async()=>{
 const {writeReading}=await import('../supabase/functions/_shared/reading-guides.mjs');
 const result=await writeReading('Question','short',[book],[{bookId:'knight',startLine:1,endLine:2}],async(_system,input,options)=>{
  assert.equal(options.schema.properties.sections.minItems,1);
  assert.equal(options.schema.properties.sections.maxItems,1);
  assert.equal(options.schema.additionalProperties,false);
  assert.equal(JSON.parse(input).excerpts[0].sectionIndex,0);
  return {introduction:'Context',sections:[{heading:'Scene',before:'Before',after:'After',interpretation:''}],conclusion:'End'};
 });
 assert.equal(result.sections.length,1);
});

test('ten-minute readings reserve time for context instead of allowing twenty minutes of excerpts',async()=>{
 const {writeReading}=await import('../supabase/functions/_shared/reading-guides.mjs');
 const longBook={...book,source_text:Array(1900).fill('word').join(' ')};
 await assert.rejects(writeReading('Question','short',[longBook],[{bookId:book.id,startLine:1,endLine:1}],async()=>{throw Error('The oversized selection must fail before generation.');}),/700 to 1800 original words TOTAL/);
});
test('reading time includes editorial text as well as original passages',async()=>{
 const {writeReading}=await import('../supabase/functions/_shared/reading-guides.mjs');
 const source={...book,source_text:Array(1000).fill('word').join(' ')};
 await assert.rejects(writeReading('Question','short',[source],[{bookId:book.id,startLine:1,endLine:1}],async(_s,input)=>{
  assert.equal(JSON.parse(input).targetMinutes,10);assert.equal(JSON.parse(input).editorialWordBudget,400);
  return {introduction:Array(1500).fill('word').join(' '),sections:[{heading:'Scene',before:'Before',after:'After'}],conclusion:'End'};
 }),/shorten the excerpts and context/);
});

import {guideCoverPrompt,validateGuideCoverDesign,generateGuideCover,decodeImportedGuideCover} from '../supabase/functions/_shared/guide-cover.mjs';
const coverDesign={label:'Working Together',topic:'Work',metaphor:'Three distinct pieces interlocking into one arrow',background:'#0b6bdc'};
test('guide art direction uses an individual metaphor, empty title area, and no baked text',()=>{
 const prompt=guideCoverPrompt(coverDesign);assert.match(prompt,/Three distinct pieces/);assert.match(prompt,/LEFT 46%/);assert.match(prompt,/NO text/);assert.match(prompt,/book jackets/);
 assert.throws(()=>validateGuideCoverDesign({...coverDesign,background:'url(evil)'}));assert.throws(()=>decodeImportedGuideCover(btoa('<svg>not a JPEG</svg>')));
});
test('hosted cover generation uses the configured image provider and captures usage',async()=>{
 const result=await generateGuideCover(coverDesign,{getEnv:key=>({OPENAI_API_KEY:'synthetic',BOOK_COVER_MODEL:'configured-image-model'})[key],fetchImpl:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/images/generations');const body=JSON.parse(options.body);assert.equal(body.model,'configured-image-model');assert.equal(body.size,'1536x1024');assert.equal(body.n,1);
  return new Response(JSON.stringify({data:[{b64_json:btoa(String.fromCharCode(137,80,78,71,13,10,26,10))}],usage:{input_tokens:10,output_tokens:20}}));
 }});assert.equal(result.usage.outputTokens,20);assert.equal(result.bytes[0],137);
});
test('cover failure never turns a finished reading into a failed reading',async()=>{
 const {drainGuide}=await import('../supabase/functions/_shared/guide-worker.mjs');
 let saved;const job={id:'guide',user_id:'owner',lease_token:'lease',status:'ready',cover_status:'pending',cover_design:coverDesign,attempts:2,progress:{}};
 const db={rpc:async()=>({data:job}),from:()=>{const q={update:p=>{saved=p;return q;},eq:()=>q,select:()=>q,single:async()=>({data:{id:'guide'}})};return q;}};
 await drainGuide(db,()=>{},hash,async()=>{throw Error('Provider unavailable');});assert.equal(saved.cover_status,'failed');assert.equal(saved.status,undefined);assert.equal(saved.error,null);
});

test('selected-book scan never expands the library and preserves required sources',async()=>{
 const {drainGuide}=await import('../supabase/functions/_shared/guide-worker.mjs');let saved,readIds;
 const job={id:'guide',user_id:'owner',visibility:'public',lease_token:'lease',status:'scanning',question:'Question',progress:{libraryIds:[book.id],requiredBookIds:[book.id]},attempts:1};
 const db={rpc:async()=>({data:job}),from:table=>{const q={select:()=>q,or:()=>q,eq:()=>q,is:()=>q,in:(_k,ids)=>{readIds=ids;return Promise.resolve({data:[book]});},update:p=>{saved=p;return q;},single:async()=>({data:{id:'guide'}})};return q;}};
 await drainGuide(db,modelResponses({candidates:[{bookId:book.id,startLine:1,endLine:2,contribution:'An experience.'}]}),hash,()=>{});assert.deepEqual(readIds,[book.id]);assert.deepEqual(saved.progress.requiredBookIds,[book.id]);assert.deepEqual(saved.progress.libraryIds,[book.id]);assert.equal(saved.progress.offset,1);
});
test('a requested book cannot silently disappear from the proposed guide',async()=>{
 const {drainGuide}=await import('../supabase/functions/_shared/guide-worker.mjs');let saved;
 const job={id:'guide',user_id:'owner',visibility:'public',lease_token:'lease',status:'proposing',question:'Question',progress:{requiredBookIds:[book.id,'missing'],candidates:[{bookId:book.id,startLine:1,endLine:2}]},attempts:1};
 const db={rpc:async()=>({data:job}),from:()=>{const q={select:()=>q,or:()=>q,eq:()=>q,is:()=>q,in:async()=>({data:[book]}),update:p=>{saved=p;return q;},single:async()=>({data:{id:'guide'}})};return q;}};
 await drainGuide(db,modelResponses({bookIds:[book.id],connection:'Only one contributes.',gap:''}),hash,()=>{});assert.equal(saved.status,'gap');assert.deepEqual(saved.book_ids,[]);assert.match(saved.proposal.gap,/every selected book/);
});

test('final passage refinement keeps every confirmed book',async()=>{await assert.rejects(selectReading('Question','short',[book,{...book,id:'second'}],modelResponses({passages:[{bookId:book.id,startLine:1,endLine:2}]},{passages:[{candidateIndex:0,startLine:1,endLine:2}]})),/every confirmed book/);});

test('mapping and review receive the same absolute numbered original lines',async()=>{const inputs=[];const chunk={start:41,end:43,text:'41: First line\n42: Second line\n43: Third line'};await mapReadingSection(chunk,3,async(prompt,input)=>{inputs.push(JSON.parse(input));return inputs.length===1?{summary:'Three lines',scenes:[]}:{passed:true};});assert.equal(inputs[0].text,'41: First line\n42: Second line\n43: Third line');assert.equal(inputs[1].source,inputs[0].text);});

test('source-check findings return to the next map attempt without lowering the review gate',async()=>{let feedback;try{await mapReadingSection({start:1,end:1,text:'1: Original'},0,modelResponses({summary:'A scene',scenes:[]},{passed:false,reason:'Outcome goes beyond this source.'}));}catch(e){feedback=e.generationFeedback;}assert.equal(feedback.phase,'reading-map');let input;await mapReadingSection({start:1,end:1,text:'1: Original'},0,async(prompt,data)=>{input??=JSON.parse(data);return prompt.includes('Check the account')?{passed:true}:{summary:'Supported account',scenes:[]};},feedback);assert.equal(input.repairFeedback,'Outcome goes beyond this source.');});
