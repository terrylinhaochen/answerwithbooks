import {test} from 'node:test';import assert from 'node:assert/strict';
import {proofreadPassages,applyProofreading,validateProofreadingEdit} from '../supabase/functions/_shared/guide-proofreading.mjs';
import {formatOriginalText} from '../supabase/functions/_shared/reading-format.mjs';
import {writeReading} from '../supabase/functions/_shared/reading-guides.mjs';
import {bookModelConfig} from '../supabase/functions/_shared/book-model.mjs';
const book={id:'b',source_text:'His rst wife. A bene cial lesson.',notes:[]};
test('proofreading uses a separate small model and preserves raw text',async()=>{
 const refs=await proofreadPassages([book],[{bookId:'b',startLine:1,endLine:1}],async(_s,_i,options)=>{assert.equal(options.kind,'proofreading');return {edits:[{passageIndex:0,before:'rst',after:'first'},{passageIndex:0,before:'bene cial',after:'beneficial'}],issues:[]};});
 assert.equal(applyProofreading(book.source_text,refs[0].proofreading),'His first wife. A beneficial lesson.');assert.equal(book.source_text,'His rst wife. A bene cial lesson.');assert.equal(applyProofreading('Changed source.',refs[0].proofreading),'Changed source.');
 assert.equal(bookModelConfig(()=>undefined,'proofreading').model,'gpt-4.1-mini');assert.equal(bookModelConfig(n=>n==='BOOK_PROOFREAD_MODEL'?'gpt-4.1-nano':undefined,'proofreading').model,'gpt-4.1-nano');
});
test('proofreading never applies rewrites or ambiguous replacements, and rejects unresolved gaps',async()=>{
 assert.equal(validateProofreadingEdit('unhappy','happy'),false);assert.equal(validateProofreadingEdit('Hayes','Jones'),false);assert.equal(validateProofreadingEdit('No','Yes'),false);
 assert.equal(validateProofreadingEdit('environ-\nments','environments'),true);assert.equal(validateProofreadingEdit('Over the years | have','Over the years I have'),true);
 await assert.rejects(proofreadPassages([book],[{bookId:'b',startLine:1,endLine:1}],async()=>({edits:[{passageIndex:0,before:'wife',after:'friend'}],issues:[]})),/wider context/);
 await assert.rejects(proofreadPassages([{...book,source_text:'rst rst'}],[{bookId:'b',startLine:1,endLine:1}],async()=>({edits:[{passageIndex:0,before:'rst',after:'first'}],issues:[]})),/wider context/);
 await assert.rejects(proofreadPassages([book],[{bookId:'b',startLine:1,endLine:1}],async()=>({edits:[],issues:[{passageIndex:0,reason:'Cut off mid-word'}]})),/wider context/);
});
test('page breaks join unfinished sentences while real paragraphs remain',()=>{
 assert.equal(formatOriginalText('What I remember vividly is that\n\n\nHayes grew red.'),'What I remember vividly is that Hayes grew red.');
 assert.equal(formatOriginalText('the person who\n\n\nmonitored accounts.    Beaming, he agreed.\n\nStill an athlete.'),'the person who monitored accounts.\n\nBeaming, he agreed.\n\nStill an athlete.');
});
test('editorial sections bind by ID even when the model returns them out of order',async()=>{
 const source={...book,source_text:'First original.\nSecond original.'};const passages=[{bookId:'b',startLine:1,endLine:1},{bookId:'b',startLine:2,endLine:2}];
 const model=async()=>({introduction:'Intro',conclusion:'End',sections:[{sectionIndex:1,heading:'Second',before:'Second context',after:'After'},{sectionIndex:0,heading:'First',before:'First context',after:'After'}]});
 const result=await writeReading('Question','short',[source],passages,model);assert.equal(result.sections[0].before,'First context');assert.equal(result.sections[0].startLine,1);assert.equal(result.sections[1].before,'Second context');
 await assert.rejects(writeReading('Question','short',[source],passages,async()=>({introduction:'Intro',conclusion:'End',sections:[{sectionIndex:0,heading:'One',before:'Before',after:'After'},{sectionIndex:0,heading:'Two',before:'Before',after:'After'}]})),/exactly once/);
});

test('proofreading sees bounded neighboring source without importing it into the excerpt',async()=>{
 const b={id:'b',source_text:'The speaker was introduced.\nA complete thought.\nThe next scene began.',notes:[]};
 const refs=await proofreadPassages([b],[{bookId:'b',startLine:2,endLine:2}],async(system,input)=>{
  const p=JSON.parse(input).passages[0];assert.equal(p.text,'A complete thought.');
  assert.equal(p.contextBefore,'The speaker was introduced.');assert.equal(p.contextAfter,'The next scene began.');
  assert.match(system,/edits must target text/);return {edits:[],issues:[]};
 });assert.equal(applyProofreading('A complete thought.',refs[0].proofreading),'A complete thought.');
});

test('invalid proofreading is repaired with exact feedback without changing the selected source',async()=>{
 let calls=0;const refs=await proofreadPassages([book],[{bookId:'b',startLine:1,endLine:1}],async(_s,input)=>{
  calls++;const p=JSON.parse(input);if(calls===1)return {edits:[{passageIndex:0,before:'wife',after:'friend'}],issues:[]};
  assert.match(p.repairFeedback.reason,/Unsafe/);assert.equal(p.passages[0].text,book.source_text);
  return {edits:[{passageIndex:0,before:'rst',after:'first'}],issues:[]};
 });assert.equal(calls,2);assert.equal(applyProofreading(book.source_text,refs[0].proofreading),'His first wife. A bene cial lesson.');
});
test('genuine missing source context is not treated as a format retry',async()=>{
 let calls=0;await assert.rejects(()=>proofreadPassages([book],[{bookId:'b',startLine:1,endLine:1}],async()=>{calls++;return {edits:[],issues:[{passageIndex:0,reason:'Sentence is truncated.'}]};}),e=>e.code==='SOURCE_BOUNDARIES');assert.equal(calls,2);
});

test('a stronger source check resolves a false layout alarm without rewriting the original',async()=>{
 let calls=0;const b={id:'b',source_text:'He shared his\n\nviews.',notes:[]};
 const refs=await proofreadPassages([b],[{bookId:'b',startLine:1,endLine:3}],async(_s,input,options)=>{
  calls++;if(options.kind==='review'){
   assert.equal(options.name,'source_coherence');assert.equal(JSON.parse(input).passages[0].text,b.source_text);
   return {coherent:true,reason:'The complete sentence is interrupted only by whitespace.'};
  }return {edits:[],issues:[{passageIndex:0,reason:'Possible line-wrap defect.'}]};
 });assert.equal(calls,2);assert.equal(applyProofreading(b.source_text,refs[0].proofreading),b.source_text);
});

test('Apple OCR line-wrap markers can be repaired without changing wording',async()=>{
 for(const marker of ['-','¬','\u00ad'])assert.equal(validateProofreadingEdit(`com${marker}\nplicated`,'complicated'),true);
 assert.equal(validateProofreadingEdit('com¬plicated','complicated'),false);
 assert.equal(validateProofreadingEdit('small-company','smallcompany'),false);
 assert.equal(validateProofreadingEdit('com¬\nplicated','simple'),false);
 const source={id:'apple',source_text:'A com¬\nplicated hierarchy. They re¬\nmained small.'};
 const refs=await proofreadPassages([source],[{bookId:'apple',startLine:1,endLine:3}],async()=>({edits:[{passageIndex:0,before:'com¬\nplicated',after:'complicated'},{passageIndex:0,before:'re¬\nmained',after:'remained'}],issues:[]}));
 assert.equal(applyProofreading(source.source_text,refs[0].proofreading),'A complicated hierarchy. They remained small.');
 assert.equal(source.source_text,'A com¬\nplicated hierarchy. They re¬\nmained small.');
});
test('repeated unsupported suggestions do not block coherent originals or modify them',async()=>{
 let calls=0;const source={id:'b',source_text:'The chance to a buy a company. A bene cial lesson.',notes:[]};
 const refs=await proofreadPassages([source],[{bookId:'b',startLine:1,endLine:1}],async(_s,input,options)=>{
  calls++;if(options.kind==='review'){
   const p=JSON.parse(input);assert.equal(p.passages[0].text,'The chance to a buy a company. A beneficial lesson.');
   assert.equal(p.passages[0].extractedText,source.source_text);assert.equal(p.rejectedEdits.length,1);
   return {coherent:true,reason:'The awkward phrase remains understandable without rewriting it.'};
  }
  return {edits:[{passageIndex:0,before:'to a buy',after:'to buy'},{passageIndex:0,before:'bene cial',after:'beneficial'}],issues:[]};
 });assert.equal(calls,3);assert.equal(refs[0].proofreading.edits.length,1);assert.equal(refs[0].proofreading.sourceReview.coherent,true);
 assert.equal(applyProofreading(source.source_text,refs[0].proofreading),'The chance to a buy a company. A beneficial lesson.');
});
test('ambiguous fixes remain unapplied, with independent review required',async()=>{
 const source={id:'b',source_text:'She did not go. He did not go.',notes:[]};let reviewed=false;
 const refs=await proofreadPassages([source],[{bookId:'b',startLine:1,endLine:1}],async(_s,input,options)=>{
  if(options.kind==='review'){reviewed=true;assert.equal(JSON.parse(input).passages[0].text,source.source_text);return {coherent:true,reason:'Both sentences are complete.'};}
  return {edits:[{passageIndex:0,before:'did not',after:'did  not'}],issues:[]};
 });assert.equal(reviewed,true);assert.deepEqual(refs[0].proofreading.edits,[]);
});
test('coherence review sees safe repairs before judging reported OCR defects',async()=>{
 const source={id:'b',source_text:'A com¬\nplicated task.',notes:[]};
 await proofreadPassages([source],[{bookId:'b',startLine:1,endLine:2}],async(_s,input,options)=>{
  if(options.kind==='review'){assert.equal(JSON.parse(input).passages[0].text,'A complicated task.');return {coherent:true,reason:'The line wrap is repaired.'};}
  return {edits:[{passageIndex:0,before:'com¬\nplicated',after:'complicated'}],issues:[{passageIndex:0,reason:'Broken word.'}]};
 });
});
test('real gaps still stop the guide when unsafe suggestions are discarded',async()=>{
 await assert.rejects(proofreadPassages([book],[{bookId:'b',startLine:1,endLine:1}],async(_s,_i,o)=>o.kind==='review'?{coherent:false,reason:'Words are missing in the middle of this scene.'}:{edits:[{passageIndex:0,before:'wife',after:'invented missing scene'}],issues:[]}),e=>e.code==='SOURCE_BOUNDARIES'&&e.message.includes('Words are missing'));
});
test('one rejected original is set aside when the other originals are sound',async()=>{
 const two={id:'t',source_text:'Helen kept the household running.\nWords are [gap] missing here.'};
 const passages=[{bookId:'t',startLine:1,endLine:1},{bookId:'t',startLine:2,endLine:2}];
 const kept=await proofreadPassages([two],passages,async(_s,_i,o)=>o.kind==='review'?{coherent:false,reason:'Passage 1 has missing words.',rejectedPassages:[1,1,9]}:{edits:[],issues:[{passageIndex:1,reason:'gap'}]});
 assert.deepEqual(kept.map(p=>p.startLine),[1]);assert.equal(kept[0].proofreading.sourceReview.coherent,true);
 await assert.rejects(proofreadPassages([two],passages,async(_s,_i,o)=>o.kind==='review'?{coherent:false,reason:'Both are cut.',rejectedPassages:[0,1]}:{edits:[],issues:[{passageIndex:0,reason:'gap'}]}),e=>e.code==='SOURCE_BOUNDARIES','all rejected still fails');
 await assert.rejects(proofreadPassages([two],passages,async(_s,_i,o)=>o.kind==='review'?{coherent:false,reason:'Unclear.',rejectedPassages:[]}:{edits:[],issues:[{passageIndex:0,reason:'gap'}]}),e=>e.code==='SOURCE_BOUNDARIES','an unspecific rejection still fails');
});
