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
 const model=async prompt=>prompt.startsWith('Check generated')?{supported:true,issues:[]}:{summary:'Compare observations with predictions.',terms:[]};
 const groups=[await summarizeBookGroup(notes.slice(0,12),model),await summarizeBookGroup(notes.slice(12),model)];assert.deepEqual(synthesisEvidence(notes,groups),groups);
 assert.throws(()=>synthesisEvidence([...notes].reverse(),groups),/another source revision/);
 await assert.rejects(summarizeBookGroup(notes,model),/Invalid/);
 await assert.rejects(summarizeBookGroup(notes.slice(0,12),async()=>({summary:'Unsupported',terms:[{term:'Trial',definition:'Test',chapterIds:['ch99']}]})),error=>error.generationFeedback?.review.issues[0].includes('chapter IDs'));
 await assert.rejects(summarizeBookGroup(notes.slice(0,12),async prompt=>prompt.startsWith('Check generated')?{supported:false,issues:['Meaning changed']}:{summary:'Discard all uncertain actions.',terms:[]}),/source check/);
 await assert.rejects(summarizeBookGroup(notes.slice(0,12),async()=>({summary:'A'.repeat(1801),terms:[]})),error=>error.generationFeedback?.review.issues[0].includes('bounds'));
});
