import {createHash} from 'node:crypto';import test from 'node:test';import assert from 'node:assert/strict';
import {compileReader,readerEvidence,readerPrompt,renderReader} from '../supabase/functions/_shared/book-reader.mjs';
import {prepareAgentImport} from '../supabase/functions/_shared/book-agent-import.mjs';
const source='Record the responsible person and an agreed deadline for each action.\nReview the record at the next meeting.\nA missing deadline means the record is incomplete, not that the action should be discarded.';
const note={id:'ch01',title:'Record commitments',summary:'Record the responsible person and agreed deadline; review at the next meeting.',sourceRefs:[{startLine:1,endLine:3}],ideas:[{name:'Record commitments',explanation:'Record a person and agreed deadline.',whenToUse:'Recording actions.',decisionRule:null,steps:['Record the person and deadline.'],limits:'An incomplete record does not authorize discarding the action.',sourceRefs:[{startLine:1,endLine:3}],applicationBasis:'source-instruction'}],antiPatterns:[],workedExamples:[]};
const job={id:'fixture',source_sha:'a'.repeat(64),title:'Commitments',author:'Fixture',source_text:source,notes:[note]};
const draft=()=>({oneLiner:'Keep commitments explicit.',readIf:'You need to record agreed actions.',evidenceIds:['E1'],sections:[{heading:'Preserve an incomplete commitment',paragraphs:[{text:'The source asks for an identified person and agreed deadline. A record without a deadline is incomplete, but that is not permission to discard the action. Review the record at the next meeting.',evidenceIds:['E1']}]}]});
const review=claims=>({supported:true,issues:[],checks:claims.map(c=>({id:c.id,supported:true,reason:'These fixture lines explicitly support the statement.'}))});
test('editorial review receives each paragraph and its own original excerpts; it cannot silently accept missing checks',async()=>{
 assert.equal(createHash('sha256').update(readerPrompt.instructions).digest('hex'),readerPrompt.instructionsSha256);
 const calls=[];const artifacts=await compileReader(job,async(s,i,o)=>{calls.push(o.name);if(o.name==='book_reader'){assert.equal(s,readerPrompt.instructions);return draft();}const {claims}=JSON.parse(i);assert.equal(claims.length,2);assert.match(claims[1].evidence,/not that the action should be discarded/);return review(claims);});
 assert.deepEqual(calls,['book_reader','book_reader_review']);assert.match(artifacts['reader/digest.md'],/^## Preserve/);assert.doesNotMatch(artifacts['reader/digest.md'],/E1|SKILL/);
 const mapping=JSON.parse(artifacts['reader/evidence.json']);assert.equal(mapping.evidence[0].startLine,1);assert.equal(mapping.evidence[0].text,undefined);
 await assert.rejects(compileReader(job,async(s,i,o)=>o.name==='book_reader'?draft():{supported:true,issues:[],checks:[]}),e=>e.generationFeedback.phase==='editorial');
});
test('source review failure retains draft for targeted repair; foreign citations, raw HTML and repeated prose are rejected',async()=>{
 await assert.rejects(compileReader(job,async(s,i,o)=>o.name==='book_reader'?draft():{supported:false,issues:['A claim reverses the source.'],checks:[]}),e=>e.generationFeedback.draft.sections.length===1);
 for(const change of [d=>d.sections[0].paragraphs[0].evidenceIds=['foreign'],d=>d.sections[0].paragraphs[0].text='<script>unsafe</script>',d=>d.sections[0].paragraphs.push({...d.sections[0].paragraphs[0]})]){const d=draft();change(d);await assert.rejects(compileReader(job,async()=>d),e=>e.generationFeedback.phase==='editorial');}
 let repaired=false;await compileReader({...job,generation_feedback:{phase:'editorial',draft:draft(),review:{issues:['Narrow the claim.']}}},async(s,i,o)=>{if(o.name==='book_reader'){const input=JSON.parse(i);assert.ok(input.previousDraft);assert.deepEqual(input.reviewFindings.issues,['Narrow the claim.']);repaired=true;return draft();}return review(JSON.parse(i).claims);});assert.ok(repaired);
});
test('long-source evidence budgets include every section, not just the beginning, and exclude Gutenberg end matter',()=>{
 const text=Array.from({length:90},(_,i)=>`Original passage ${i+1} explains a distinct condition.`).join('\n')+'\n*** END OF THE PROJECT GUTENBERG EBOOK ***\nLicense';
 const notes=Array.from({length:92},(_,i)=>({...note,ideas:[],id:'ch'+i,sourceRefs:[{startLine:i+1,endLine:i+1}]}));const es=readerEvidence({...job,source_text:text,notes});assert.equal(es.length,90);assert.equal(es.at(-1).startLine,90);assert.ok(es.reduce((n,e)=>n+e.text.length,0)<=140000);
});
test('customer-agent upload renders its reader through fixed paths and does not inherit semantic review claims',async()=>{
 const book={oneLiner:'Keep commitments explicit.',readIf:'You record actions.',thesis:'Record the person and agreed deadline, then review.',tags:['commitments'],year:null,glossary:[]};const payload={schemaVersion:1,title:job.title,author:job.author,sourceText:source,book,chapters:[note],glossary:[],reader:draft()};const imported=await prepareAgentImport(payload);assert.equal(JSON.parse(imported.job.artifacts['reader/digest.json']).review.status,'customer-agent');assert.match(imported.job.artifacts['reader/digest.md'],/incomplete/);payload.reader.evidenceIds=['fake'];await assert.rejects(prepareAgentImport(payload),/evidence IDs/);
});

import {summarizeReadingBook,publishReadingDigest} from '../supabase/functions/_shared/reading-guides.mjs';
test('shared summaries reuse reviewed editorial prose and preserve maps, questions and provenance',async()=>{
 const reader=await compileReader(job,async(_s,i,o)=>o.name==='book_reader'?draft():review(JSON.parse(i).claims));
 const shared={...job,chunks:[{}],artifacts:reader};
 let calls=0;
 const generated=await summarizeReadingBook(shared,async(system)=>{calls++;assert.doesNotMatch(system,/summary:string/);return calls===1?{orientation:'A book about commitments.',questions:Array.from({length:3},(_,i)=>({question:`How can I keep commitment ${i+1}?`,contribution:'Explores how records support follow-through.'}))}:{passed:true};},async()=> 'hash');
 const map=JSON.parse(generated['reading/map.json']);
 assert.equal(map.summary,reader['reader/digest.md']);assert.equal(generated['reader/digest.json'],reader['reader/digest.json']);assert.deepEqual(map.sections,job.notes);
 assert.match(generated['book.md'],/## Preserve/);assert.doesNotMatch(generated['book.md'],/undefined|SKILL.md/);
 await assert.rejects(summarizeReadingBook(job,async()=>{throw Error('Must not call model');},async()=> 'hash'),/Compile the reviewed/);
 const old={...job,artifacts:{'reading/map.json':JSON.stringify({...map,summary:'Old short overview.'}),'other':'keep'}};
 const updated=publishReadingDigest(old,reader);
 assert.equal(updated.other,'keep');assert.equal(JSON.parse(updated['reading/map.json']).summary,map.summary);assert.deepEqual(JSON.parse(updated['reading/map.json']).questions,map.questions);assert.equal(JSON.parse(old.artifacts['reading/map.json']).summary,'Old short overview.');
});
test('shared scene coordinates supply original evidence beyond a chapter preamble',()=>{
 const evidence=readerEvidence({...job,notes:[{...note,ideas:[],scenes:[{startLine:3,endLine:3}]}]});
 assert.equal(evidence[0].startLine,3);assert.match(evidence[0].text,/incomplete/);
});

test('length repairs develop the digest rather than reuse the factual narrowing instruction',async()=>{
 let sawRepair=false;
 await compileReader({...job,generation_feedback:{phase:'editorial',draft:draft(),review:{issues:['Editorial body needs more words.']}}},async(system,input,options)=>{
  if(options.name==='book_reader'){const request=JSON.parse(input);assert.equal(system,readerPrompt.instructions);assert.match(request.task,/Rewrite the complete digest/);assert.match(request.task,/Preserve its accurate material/);assert.ok(request.source.writingBudget.targetWords);sawRepair=true;return draft();}
  return review(JSON.parse(input).claims);
 });
 assert.ok(sawRepair);
});

test('source repairs change only failed paragraphs and preserve approved prose',async()=>{
 const previous=draft();previous.sections[0].paragraphs.push({text:'An incorrect claim needs correction.',evidenceIds:['E1']});
 const feedback={phase:'editorial',draft:previous,review:{supported:false,issues:['s1p2 needs correction.'],checks:[{id:'metadata',supported:true},{id:'s1p1',supported:true},{id:'s1p2',supported:false}]}};
 const artifacts=await compileReader({...job,generation_feedback:feedback},async(_system,input,options)=>{
  if(options.name==='book_reader_repair'){assert.deepEqual(JSON.parse(input).rejectedClaims.map(c=>c.id),['s1p2']);return {metadata:null,paragraphs:[{id:'s1p2',text:'The record is reviewed at the next meeting.',evidenceIds:['E1']}]};}
  return review(JSON.parse(input).claims);
 });
 const saved=JSON.parse(artifacts['reader/digest.json']);assert.deepEqual(saved.sections[0].paragraphs[0],previous.sections[0].paragraphs[0]);assert.equal(saved.sections[0].paragraphs[1].text,'The record is reviewed at the next meeting.');assert.equal(saved.oneLiner,previous.oneLiner);
});
