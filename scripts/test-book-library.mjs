import test from 'node:test';import assert from 'node:assert/strict';
import {embedBookText,embeddingDimensions} from '../supabase/functions/_shared/book-embedding.mjs';
import {libraryQuery,libraryEvidence,selectLibraryEntries,searchLibrary,indexLibraryBatch} from '../supabase/functions/_shared/book-library.mjs';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('embedding provider preserves ordering and rejects malformed, duplicate and truncated vectors',async()=>{
 const vector=Array(embeddingDimensions).fill(.01);let captured;
 const good=await embedBookText(['first','second'],{key:'synthetic',fetchImpl:async(url,options)=>{captured={url,...options};return Response.json({data:[{index:1,embedding:vector},{index:0,embedding:vector}]});}});
 assert.equal(good.length,2);assert.equal(JSON.parse(captured.body).dimensions,512);assert.equal(captured.redirect,'error');
 for(const data of [[{index:0,embedding:[1]}],[{index:1,embedding:vector}],[{index:0,embedding:Array(512).fill(0)}]])await assert.rejects(()=>embedBookText(['x'],{key:'synthetic',fetchImpl:async()=>Response.json({data})}),/Invalid/);
 await assert.rejects(()=>embedBookText(['x'],{key:'synthetic',fetchImpl:async()=>Response.json({error:'sensitive provider error'},{status:401})}),error=>!error.message.includes('sensitive'));
});
test('search inputs are bounded and candidates are diverse, not treated as a relevance verdict',()=>{
 for(const question of ['',null,'x'.repeat(2001)])assert.throws(()=>libraryQuery({question}));
 assert.throws(()=>libraryQuery({question:'work',book:'../../file'}));
 const candidates=Array.from({length:30},(_,i)=>({entry_id:id(i+1),book_id:id(100+Math.floor(i/5))}));
 const selected=selectLibraryEntries(candidates);assert.deepEqual(selected,[id(1),id(2),id(3),id(6),id(7),id(8)]);
});
test('evidence returns exact numbered source excerpts with visible truncation, never the source bundle',()=>{
 const source=['first','second evidence','x'.repeat(2000),'last'].join('\n');
 const evidence=libraryEvidence({entry_id:id(1),book_id:id(2),revision_id:id(3),title:'Book',author:'Author',section_id:'ch01',source_text:source,citations:[{source:'S1',startLine:2,endLine:3,requestedEndLine:4,truncated:true,excerpt:'2: second evidence\n3: '+ 'x'.repeat(900)}],note:{summary:'Summary',sourceRefs:[{startLine:2,endLine:4},{startLine:0,endLine:99}],ideas:[]}});
 assert.equal(evidence.source_text,undefined);assert.match(evidence.citations[0].excerpt,/^2: second evidence\n3: /);assert.equal(evidence.citations[0].endLine,3);assert.equal(evidence.citations[0].truncated,true);assert.equal(evidence.citations[0].requestedEndLine,4);assert.ok(JSON.stringify(evidence).length<5000);
});
test('search sends verified owner scope and falls back honestly on embedding failure; race-deleted hits are omitted',async()=>{
 const calls=[];const db={rpc:async(name,body)=>{calls.push({name,body});assert.equal(body.p_user,id(1));return {data:({allow_book_library_search:true,book_library_coverage:{sections:10,embedded:10},search_book_library:[{entry_id:id(2),book_id:id(3)}],book_library_evidence:[]})[name]};}};
 const result=await searchLibrary({db,user:{id:id(1)},input:{question:'How to organize work?',user_id:id(99)},embed:async()=>{throw Error('provider unavailable');}});
 assert.equal(result.method,'lexical');assert.match(result.semanticNotice,/unavailable/);assert.deepEqual(result.matches,[]);assert.equal(result.status,'needs_reasoning');assert.equal(calls.find(c=>c.name==='search_book_library').body.p_embedding,null);
 const limited=await searchLibrary({db:{rpc:async()=>({data:false})},user:{id:id(1)},input:{question:'work'}});assert.equal(limited.rateLimited,true);
});
test('index failures release leased entries with backoff and stale results are lease/hash guarded',async()=>{
 const entries=[{id:id(1),lease_token:id(2),content_hash:'hash',body:'Evidence',attempts:2}];const writes=[];
 const db={rpc:async()=>({data:entries}),from:()=>({update:patch=>{const filters=[];writes.push({patch,filters});const q={eq:(k,v)=>{filters.push([k,v]);return q;},then:resolve=>resolve({data:[]})};return q;}})};
 await assert.rejects(()=>indexLibraryBatch({db,embed:async()=>{throw Error('down');}}));assert.equal(writes[0].patch.lease_token,null);assert.ok(Date.parse(writes[0].patch.next_attempt_at)>Date.now());
 await indexLibraryBatch({db,embed:async()=>[Array(512).fill(.01)]});assert.deepEqual(writes[1].filters,[['id',id(1)],['lease_token',id(2)],['content_hash','hash']]);
});
