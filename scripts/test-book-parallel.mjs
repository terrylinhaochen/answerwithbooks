import test from 'node:test';import assert from 'node:assert/strict';
import {distillSectionBatch,sectionConcurrency} from '../supabase/functions/_shared/book-parallel.mjs';
test('bounded parallel sections retain successes around a gap and skip paid work on retry',async()=>{
 const chunks=[1,2,3,4],calls=[],gates=[];let active=0,peak=0;
 const run=distillSectionBatch({chunks,concurrency:3,distill:async(_,index)=>{calls.push(index);active++;peak=Math.max(peak,active);await new Promise(resolve=>gates[index]=resolve);active--;if(index===1)throw Error('source check');return {note:{id:`ch0${index+1}`},...(index===0?{title:'Title'}:{})};}});
 await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(calls,[0,1,2]);gates[2]();gates[0]();gates[1]();
 const batch=await run;assert.equal(peak,3);assert.equal(batch.cursor,1);assert.equal(batch.title,'Title');assert.deepEqual(batch.notes.map(n=>n.id),['ch01','ch03']);assert.equal(batch.errors.length,1);
 const retried=[];const next=await distillSectionBatch({chunks,notes:batch.notes,cursor:batch.cursor,concurrency:3,distill:async(_,index)=>{retried.push(index);return {note:{id:`ch0${index+1}`}};}});
 assert.deepEqual(retried,[1,3]);assert.equal(next.cursor,4);assert.deepEqual(next.notes.map(n=>n.id),['ch01','ch02','ch03','ch04']);
});
test('invalid concurrency and mismatched identities cannot advance the cursor',async()=>{
 for(const value of [0,4,'x',1.5])assert.throws(()=>sectionConcurrency(value));
 const result=await distillSectionBatch({chunks:[1],distill:async()=>({note:{id:'ch02'}})});assert.equal(result.cursor,0);assert.equal(result.notes.length,0);assert.equal(result.errors.length,1);
});
