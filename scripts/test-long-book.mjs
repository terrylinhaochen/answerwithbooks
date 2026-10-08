import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSource} from '../supabase/functions/_shared/book-sections.mjs';
import {overviewGroupCount,summarizeBookGroup,synthesisEvidence} from '../supabase/functions/_shared/book-overview.mjs';
import {runBookAdapter} from '../src/lib/upstream-book-node.mjs';
test('large sources pass upstream adapter, retain tail text and every line, and have bounded work units',()=>{
 const source=('Source evidence about a reversible trial. Keep uncertainty visible and compare results.\n').repeat(18000)+'FINAL EVIDENCE MARKER';
 assert.ok(source.length>1200000);
 const report=runBookAdapter({operation:'analyze',text:source}),split=splitSource(report.text,report.headings);
 assert.equal(split.text,source);assert.ok(split.chunks.length>60);assert.equal(split.chunks[0].start,1);assert.equal(split.chunks.at(-1).end,split.lineCount);
 assert.ok(split.chunks.at(-1).text.endsWith('FINAL EVIDENCE MARKER'));
 for(let i=1;i<split.chunks.length;i++)assert.equal(split.chunks[i].start,split.chunks[i-1].end+1);
 for(const chunk of split.chunks)assert.ok(chunk.text.length<25500);
});
test('dense headings do not create hundreds of tiny jobs or lose source text',()=>{
 const source=Array.from({length:1500},(_,i)=>`Chapter ${i+1}\n${'Evidence and limits. '.repeat(50)}`).join('\n');
 const normalized=runBookAdapter({operation:'analyze',text:source});
 const split=splitSource(normalized.text,normalized.headings);assert.ok(split.text===normalized.text,'All normalized source text is retained');assert.ok(split.chunks.length<160);assert.equal(split.chunks.at(-1).end,split.lineCount);
});
test('overview groups have bounded size, validate chapter membership, and require a fidelity pass',async()=>{
 const notes=Array.from({length:13},(_,i)=>({id:`ch${String(i+1).padStart(2,'0')}`,summary:'Compare observations with predictions.'}));
 assert.equal(overviewGroupCount(notes),2);assert.throws(()=>synthesisEvidence(notes,[]),/Finish/);
 const model=async prompt=>prompt.startsWith('Verify only')?{supported:true,issues:[]}:{summary:'Compare observations with predictions.',terms:[]};
 const groups=[await summarizeBookGroup(notes.slice(0,12),model),await summarizeBookGroup(notes.slice(12),model)];assert.deepEqual(synthesisEvidence(notes,groups),groups);
 assert.throws(()=>synthesisEvidence([...notes].reverse(),groups),/another source revision/);
 await assert.rejects(summarizeBookGroup(notes,model),/Invalid/);
 await assert.rejects(summarizeBookGroup(notes.slice(0,12),async()=>({summary:'Unsupported',terms:[{term:'Trial',definition:'Test',chapterIds:['ch99']}]})),error=>error.generationFeedback?.review.issues[0].includes('chapter IDs'));
 await assert.rejects(summarizeBookGroup(notes.slice(0,12),async prompt=>prompt.startsWith('Verify only')?{supported:false,issues:['Meaning changed']}:{summary:'Discard all uncertain actions.',terms:[]}),/source check/);
 await assert.rejects(summarizeBookGroup(notes.slice(0,12),async()=>({summary:'A'.repeat(1801),terms:[]})),error=>error.generationFeedback?.review.issues[0].includes('bounds'));
});

test('long-book schemas constrain references to processing section IDs, excluding detected chapter IDs',async()=>{
 const {overviewSchemaFor,synthesisSchemaFor}=await import('../supabase/functions/_shared/book-schemas.mjs');
 const notes=[{id:'ch01',sourceChapters:[{id:'chapter-33'}]},{id:'ch02'}];
 assert.deepEqual(overviewSchemaFor(notes).properties.terms.items.properties.chapterIds.items.enum,['ch01','ch02']);
 assert.deepEqual(synthesisSchemaFor(notes).properties.glossary.items.properties.chapterIds.items.enum,['ch01','ch02']);
 assert.equal(overviewSchemaFor(notes).properties.summary.maxLength,1800);
 let saw=false;
 await summarizeBookGroup(notes,async(prompt,input,options)=>{
  if(options.kind==='review')return {supported:true,issues:[]};
  assert.doesNotMatch(input,/chapter-33/);saw=true;return {summary:'A bounded overview.',terms:[{term:'Trial',definition:'A bounded test.',chapterIds:['ch01']}]};
 });assert.equal(saw,true);
});


test('aggregate review distinguishes richer evidence from the shorter candidate it checks',async()=>{
 const notes=[{id:'ch01',summary:'Division of labour can increase dexterity. Water carriage historically enlarged markets.'}];
 await summarizeBookGroup(notes,async(prompt,input,options)=>{
  if(options.kind!=='review')return {summary:'Division of labour can increase dexterity.',terms:[]};
  const data=JSON.parse(input);
  assert.match(data.evidence[0].summary,/Water carriage/);
  assert.doesNotMatch(data.candidate.summary,/Water carriage/);
  assert.match(prompt,/Do not reverse the comparison/);
  assert.match(prompt,/candidate field/);
  return {supported:true,issues:[]};
 });
});
