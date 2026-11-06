import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {verifySourceStream} from '../supabase/functions/_shared/book-source-stream.mjs';
const max=500*1024*1024;
const sha=data=>createHash('sha256').update(data).digest('hex');
test('500 MB is verified without buffering the source',async()=>{
 const block=Buffer.alloc(64*1024,65),digest=createHash('sha256');for(let i=0;i<max/block.length;i++)digest.update(block);
 let sent=0;const body=new ReadableStream({pull(c){if(sent===max)c.close();else{c.enqueue(block);sent+=block.length;}}});
 await verifySourceStream(new Response(body),max,digest.digest('hex'),max);assert.equal(sent,max);
});
test('rejects oversized, truncated, wrong-hash and dishonest-length uploads',async()=>{
 for(const [bytes,expected,hash,headers] of [[Buffer.from('abc'),4,sha('abc'),{}],[Buffer.from('abcd'),3,sha('abc'),{}],[Buffer.from('abc'),3,sha('def'),{}],[Buffer.from('abc'),3,sha('abc'),{'content-length':'4'}],[Buffer.from('abc'),max+1,sha('abc'),{}]])await assert.rejects(verifySourceStream(new Response(bytes,{headers}),expected,hash,max));
});
