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
test('proofreading rejects rewrites, ambiguous replacements, and unresolved gaps',async()=>{
 assert.equal(validateProofreadingEdit('unhappy','happy'),false);assert.equal(validateProofreadingEdit('Hayes','Jones'),false);assert.equal(validateProofreadingEdit('No','Yes'),false);
 assert.equal(validateProofreadingEdit('environ-\nments','environments'),true);assert.equal(validateProofreadingEdit('Over the years | have','Over the years I have'),true);
 await assert.rejects(proofreadPassages([book],[{bookId:'b',startLine:1,endLine:1}],async()=>({edits:[{passageIndex:0,before:'wife',after:'friend'}],issues:[]})),/Unsafe/);
 await assert.rejects(proofreadPassages([{...book,source_text:'rst rst'}],[{bookId:'b',startLine:1,endLine:1}],async()=>({edits:[{passageIndex:0,before:'rst',after:'first'}],issues:[]})),/Ambiguous/);
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
