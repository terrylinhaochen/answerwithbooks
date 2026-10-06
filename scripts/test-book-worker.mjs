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
test('fidelity gate rejects semantic drift even with valid line citations',async()=>{
 const {requireFaithfulSection}=await import('../supabase/functions/_shared/book-fidelity.mjs');
 assert.throws(()=>requireFaithfulSection({supported:false,issues:['Discarding actions changes the source meaning.']}),/changed meaning/);
 assert.throws(()=>requireFaithfulSection({supported:true,issues:['Unsupported obligation']}),/source check/);
 assert.throws(()=>requireFaithfulSection({supported:true}),/source check/);
 requireFaithfulSection({supported:true,issues:[]});
});
test('legacy private downloads gain readable metadata and resolvable source lines',async()=>{
 const {exportBookFiles}=await import('../supabase/functions/_shared/book-export.mjs');
 const files=exportBookFiles({title:'The Team Manual',source_sha:'abcdef',source_text:'A source line\nSet a deadline.',artifacts:{'book.md':'# ## Chapter 1: Action\nSource S1:L2–L2.','skill/SKILL.md':'---\nname: book-uuid\ndescription: Bad grammar\n---\n# Book','skill/chapters/ch01.md':'# ## Chapter 1: Action\nSource S1:L2–L2.'}});
 assert.equal(files['skill/source.txt'].split('\n')[1],'Set a deadline.');
 assert.match(files['skill/SKILL.md'],/name: the-team-manual/);assert.match(files['skill/SKILL.md'],/\[source.txt\]\(source.txt\)/);
 assert.doesNotMatch(files['skill/chapters/ch01.md'],/# ##/);assert.match(files['DOWNLOAD.md'],/private/);
});

test('repair advances separately and replaces artifacts only after checked synthesis',async()=>{
 const {advanceRepair,isReviewed}=await import('../supabase/functions/_shared/book-repair.mjs');
 const {createHash}=await import('node:crypto');const hash=async bytes=>createHash('sha256').update(bytes).digest('hex');
 const refs=[{startLine:1,endLine:2}],source='Assign an owner.\nRecord an agreed deadline.';
 const job={id:'job',user_id:'owner',title:'Meeting Manual',author:'Editor',source_sha:'a'.repeat(64),source_text:source,chunks:[{start:1,end:2,text:'1: Assign an owner.\n2: Record an agreed deadline.'}],artifacts:{'book.md':'Old draft'}};
 const original=structuredClone(job);
 const section={summary:'Record accountable actions.',sourceRefs:refs,ideas:[{name:'Action record',explanation:'Record owner and date.',whenToUse:'After agreeing an action.',steps:['Assign an owner.','Agree a deadline.'],limits:'This is a record, not a performance measure.',sourceRefs:refs}]};
 const book={oneLiner:'Actions with owners and dates.',readIf:'You record meeting actions.',thesis:'Commitments require ownership and dates.',tags:['meetings'],year:null,glossary:[]};
 let calls=0;const modelJson=async prompt=>{calls++;return prompt.startsWith('Check generated')?{supported:true,issues:[]}:prompt.startsWith('Synthesize')?book:section;};
 const first=await advanceRepair({job,state:null,modelJson,hash,previousRevisionPath:'owner/job/original.json'});assert.equal(first.patch,null);assert.equal(first.state.cursor,1);assert.deepEqual(job,original);
 const final=await advanceRepair({job,state:first.state,modelJson,hash,previousRevisionPath:'owner/job/original.json'});assert.match(final.patch.artifacts['skill/SKILL.md'],/name: meeting-manual/);assert.equal(isReviewed({artifacts:final.patch.artifacts}),true);assert.equal(JSON.parse(final.patch.artifacts['quality-review.json']).previousRevisionPath,'owner/job/original.json');assert.equal(calls,4);assert.deepEqual(job,original);
 const deniedModel=async prompt=>prompt.startsWith('Check generated')?{supported:false,issues:['Unsupported action']}:section;
 await assert.rejects(advanceRepair({job,state:null,modelJson:deniedModel,hash,previousRevisionPath:''}),/source check/);assert.deepEqual(job,original);
 await assert.rejects(advanceRepair({job:{...job,source_sha:'b'.repeat(64)},state:first.state,modelJson,hash,previousRevisionPath:''}),/revision changed/);
});
test('operator validation fails closed without trusting role claims or the API key alone',async()=>{
 const {verifyOperator}=await import('../supabase/functions/_shared/operator-auth.mjs');
 for(const status of [401,403,404,500])assert.equal(await verifyOperator('untrusted',{url:'https://project.example',serviceKey:'secret',fetchImpl:async()=>new Response('',{status})}),false);
 assert.equal(await verifyOperator('',{url:'https://project.example',serviceKey:'secret'}),false);
 assert.equal(await verifyOperator('untrusted',{url:'https://project.example',serviceKey:'secret',fetchImpl:async()=>{throw Error('offline');}}),false);
 assert.equal(await verifyOperator('validated-operator',{url:'https://project.example',serviceKey:'secret',fetchImpl:async(url,options)=>{assert.match(url,/\/auth\/v1\/admin\/users\?/);assert.equal(options.headers.Authorization,'Bearer validated-operator');return new Response('',{status:200});}}),true);
});
