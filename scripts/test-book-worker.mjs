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
test('detected headings preserve source coverage and cannot invent titles',()=>{
 const source='Front matter\nChapter 1: Trial\nChoose a safe test.\nChapter 2: Review\nInspect results.';
 const result=splitSource(source,[{line:2,title:'Chapter 1: Trial'},{line:4,title:'Chapter 2: Review'},{line:5,title:'Fabricated'}]);
 assert.deepEqual(result.chunks.map(c=>[c.start,c.end,c.title]),[[1,1,''],[2,3,'Chapter 1: Trial'],[4,5,'Chapter 2: Review']]);
 assert.equal(result.text,source);assert.equal(validateSection({summary:'Review',sourceRefs:[{startLine:4,endLine:5}],ideas:[]},result.chunks[2],2).title,'Chapter 2: Review');
});
test('server sanitizer agrees with original Python for hidden characters and preserves ordinary Unicode',async()=>{
 const {sanitizeSource}=await import('../supabase/functions/_shared/upstream-sanitize.mjs');
 const {runBookAdapter}=await import('../src/lib/upstream-book-node.mjs');
 const text='Chapter 1: Test\n中文 😀 '+[0x200b,0x200c,0x200d,0x2060,0x202e,0xfeff,0xe0001,0xe0020,0x61c].map(n=>String.fromCodePoint(n)).join('')+' ordinary text';
 assert.equal(sanitizeSource(text),runBookAdapter({operation:'analyze',text}).text);
});
