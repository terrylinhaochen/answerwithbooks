import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {PGlite} from '@electric-sql/pglite';
import {priceUsage,guideMeter} from '../supabase/functions/_shared/guide-meter.mjs';
import {candidateWindow,compactBookContext,embedTexts,searchGuideCandidates} from '../supabase/functions/_shared/guide-retrieval.mjs';
import {chapterHeadings,buildReadingIndex} from '../supabase/functions/_shared/reading-index.mjs';
const guide='00000000-0000-4000-8000-000000000001';
test('atomic reservations retain unknown charges and protect cover budget',async t=>{
 const db=new PGlite();t.after(()=>db.close());await db.exec('create role anon;create role authenticated;create role service_role;create table reading_guides(id uuid primary key);');
 const migration=await readFile(new URL('../supabase/migrations/20261109080000_guide_retrieval_and_usage.sql',import.meta.url),'utf8');
 await db.exec(migration.slice(migration.indexOf('alter table public.reading_guides add column'),migration.indexOf('create table public.guide_index_usage')));
 await db.query('insert into reading_guides(id) values($1)',[guide]);
 const reserve=(upper,keep=.37)=>db.query("select reserve_guide_usage($1,gen_random_uuid(),'gpt-5.4','review',$2,$3) id",[guide,upper,keep]);
 await assert.rejects(reserve(.7),/GUIDE_BUDGET_LIMIT/);const a=(await reserve(.4)).rows[0].id;
 await assert.rejects(reserve(.3),/GUIDE_BUDGET_LIMIT/);
 await db.query("select settle_guide_usage($1,null,'{}')",[a]);await assert.rejects(reserve(.3),/GUIDE_BUDGET_LIMIT/);
 await assert.rejects(db.query("select settle_guide_usage($1,0,'{}')",[a]),/NOT_RESERVED/);
 const outcomes=await Promise.allSettled(Array.from({length:10},()=>reserve(.1,0)));
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,6);
 assert.equal(Number((await db.query('select sum(upper_usd) n from guide_provider_usage')).rows[0].n),1);
});
test('meter prices cached input and reasoning once, unknown remains unknown',()=>{
 assert.equal(priceUsage('gpt-5.4',{inputTokens:1000,cachedInputTokens:500,outputTokens:100,reasoningTokens:80}),.002875);
 assert.equal(priceUsage('gpt-5.4',{inputTokens:null,outputTokens:null}),null);assert.throws(()=>priceUsage('unpriced',{}));
});
test('reservation failure prevents provider work and keeps a readable budget error',async()=>{
 const meter=guideMeter({rpc:async()=>({error:{message:'GUIDE_BUDGET_LIMIT'}})},{id:guide});await assert.rejects(meter.reserve('gpt-5.4','review',100,100),e=>e.code==='GUIDE_BUDGET_LIMIT');
});
test('source windows stay on exact line boundaries; compact context only contains overlapping sections',()=>{
 const book={id:'b',source_text:Array.from({length:150},(_,i)=>'Line '+(i+1)+' '+('word '.repeat(30))).join('\n'),artifacts:{'reading/map.json':JSON.stringify({orientation:'A life.',sections:[{title:'early',sourceRefs:[{startLine:1,endLine:30}]},{title:'later',sourceRefs:[{startLine:31,endLine:150}]}]})}};
 const span=candidateWindow(book,{startLine:50,endLine:100},3000);assert.ok(span.startLine<=50&&span.endLine>=50&&span.endLine<100);assert.ok(book.source_text.split('\n').slice(span.startLine-1,span.endLine).join('\n').length<=3000);
 assert.deepEqual(compactBookContext(book,[{bookId:'b',startLine:60,endLine:70}]).sections.map(s=>s.title),['later']);
});
test('semantic shortlist cannot invent records or silently switch to another book pool',async()=>{
 const rpc=[];const db={rpc:async(name,args)=>{rpc.push([name,args]);return {data:name==='reserve_guide_usage'?'op':name==='search_guide_index'?[{book_id:'allowed',kind:'scene',start_line:5,end_line:7,body:'A reflective experience.'}]:null};}};
 const old=globalThis.fetch;globalThis.fetch=async()=>Response.json({data:[{index:0,embedding:Array(512).fill(.1)}],usage:{total_tokens:10}});
 try{await assert.rejects(searchGuideCandidates(db,{id:guide,question:'Question?',user_id:'owner',visibility:'public'},async()=>({indices:[4]}),()=> 'fixture',['allowed']),/Invalid retrieval shortlist/);assert.deepEqual(rpc.find(x=>x[0]==='search_guide_index')[1].p_books,['allowed']);assert.equal(rpc.find(x=>x[0]==='search_guide_index')[1].p_public,true);}
 finally{globalThis.fetch=old;}
});
test('automatic index preserves section evidence when chapter headings cannot be recovered',async()=>{
 const map={textSha:'text-sha',sections:[{id:'s1',summary:'A reflection.',sourceRefs:[{startLine:1,endLine:1}],scenes:[{title:'Reflection',account:'An experience.',startLine:1,endLine:1}]}]};
 const result=await buildReadingIndex({id:'b',source_sha:'source-sha',source_text:'A reflection without chapter headings.'},map,()=>{throw Error('No invented chapters');},async()=> 'sha');assert.equal(result.chapters.length,0);assert.equal(result.chapterStructure,'source-sections-only');assert.equal(result.scenes[0].startLine,1);
});
test('chapter boundaries must match actual body headings and pass review',async()=>{
 const source='Chapter One\n'+('A source sentence.\n'.repeat(140))+'Chapter Two\n'+('Another source sentence.\n'.repeat(140));
 const headings=chapterHeadings(source);assert.equal(headings.length,2);
 const job={id:'b',title:'Life',source_sha:'sha',source_text:source};const map={sections:[]};
 await assert.rejects(buildReadingIndex(job,map,async()=>({chapters:[{startLine:99,endLine:100,title:'Invented',summary:'Invalid'}]}),async()=> 'sha'),/Ungrounded/);
});
