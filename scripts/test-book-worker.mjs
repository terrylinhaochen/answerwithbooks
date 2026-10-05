import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSource,validateSection} from '../supabase/functions/_shared/book-sections.mjs';
import {bookAgentPrompt} from '../supabase/functions/_shared/book-handoff.mjs';
test('source chunks cover every line once, including long paragraphs and non-Latin text',()=>{
 const original=('A'.repeat(1300)+' 中文\n').repeat(30);const result=splitSource(original);
 assert.ok(result.chunks.length>1);assert.equal(result.chunks[0].start,1);assert.equal(result.chunks.at(-1).end,result.lineCount);
 for(let i=1;i<result.chunks.length;i++)assert.equal(result.chunks[i].start,result.chunks[i-1].end+1);
 assert.equal(result.text.replaceAll('\n',''),original.replaceAll('\n',''));
});
test('model citations cannot point to another section',()=>{
 const data={summary:'Summary',sourceRefs:[{startLine:1,endLine:3}],ideas:[]};
 assert.throws(()=>validateSection(data,{start:4,end:8},0),/references/);
 assert.equal(validateSection(data,{start:1,end:8},0).title,'Source section 1');
});
test('handoff contains usable context and both task modes with no installation prerequisite',()=>{
 const prompt=bookAgentPrompt({title:'Example',author:'Author',url:'https://answerwithbooks.com/your-book/?id=private',digest:'READABLE CONTEXT',skill:'SKILL CONTEXT'});
 assert.match(prompt,/question or complete a task/);assert.match(prompt,/READABLE CONTEXT/);assert.match(prompt,/SKILL CONTEXT/);assert.match(prompt,/No installation or URL access is required/);
});
