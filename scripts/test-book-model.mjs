import test from 'node:test';
import assert from 'node:assert/strict';
import {createBookModelClient,bookModelConfig} from '../supabase/functions/_shared/book-model.mjs';
import {sectionSchema} from '../supabase/functions/_shared/book-schemas.mjs';
import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {benchmarkSource, runModelBenchmark} from './benchmark-book-models.mjs';

const result = overrides => ({model:'gpt-6-luna',usage:{prompt_tokens:100,completion_tokens:20,prompt_tokens_details:{cached_tokens:40},completion_tokens_details:{reasoning_tokens:5}},choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}],...overrides});
const env = (values = {}) => name => ({OPENAI_API_KEY:'synthetic-secret',...values})[name];

test('modern models use compatible reasoning parameters and strict schema; metrics omit content',async()=>{
 const requests=[],metrics=[];let time=0;
 const client=createBookModelClient({getEnv:env({BOOK_PROCESSING_MODEL:'gpt-6-luna',BOOK_REASONING_EFFORT:'none'}),now:()=>time+=10,onUsage:m=>metrics.push(m),fetchImpl:async(url,init)=>{requests.push({url,init,body:JSON.parse(init.body)});return Response.json(result());}});
 assert.deepEqual(await client('SYSTEM PRIVATE','SOURCE PRIVATE',{schema:sectionSchema,name:'book_section'}),{ok:true});
 const request=requests[0];assert.equal(request.body.reasoning_effort,'none');assert.equal(request.body.max_completion_tokens,6000);assert.equal(request.body.max_tokens,undefined);
 assert.equal(request.body.response_format.type,'json_schema');assert.equal(request.body.response_format.json_schema.strict,true);assert.deepEqual(request.body.response_format.json_schema.schema,sectionSchema);
 assert.equal(request.init.redirect,'error');assert.ok(request.init.signal);assert.equal(metrics[0].model,'gpt-6-luna');assert.equal(metrics[0].inputTokens,100);assert.equal(metrics[0].cachedInputTokens,40);assert.equal(metrics[0].reasoningTokens,5);assert.equal(metrics[0].elapsedMs,10);
 assert.doesNotMatch(JSON.stringify(metrics),/PRIVATE|synthetic-secret/);
});

test('explicit legacy models remain available and review has independent model and reasoning settings',async()=>{
 const sent=[];const client=createBookModelClient({getEnv:env({BOOK_PROCESSING_MODEL:'gpt-6-luna',BOOK_REASONING_EFFORT:'none',BOOK_REVIEW_MODEL:'gpt-6.1-sol'}),fetchImpl:async(_,init)=>{sent.push(JSON.parse(init.body));return Response.json(result());}});
 await client('review','evidence',{kind:'review'});assert.equal(sent[0].model,'gpt-6.1-sol');assert.equal(sent[0].reasoning_effort,'low');
 const legacy=createBookModelClient({getEnv:env({BOOK_PROCESSING_MODEL:'gpt-4.1-mini'}),fetchImpl:async(_,init)=>{sent.push(JSON.parse(init.body));return Response.json(result({model:'gpt-4.1-mini'}));}});
 await legacy('system','input');assert.equal(sent[1].model,'gpt-4.1-mini');assert.equal(sent[1].max_tokens,6000);assert.equal(sent[1].reasoning_effort,undefined);
 assert.throws(()=>bookModelConfig(env({BOOK_PROCESSING_MODEL:'gpt-6.1-sol',BOOK_REASONING_EFFORT:'none'})),/requires reasoning/);
 assert.throws(()=>bookModelConfig(env({BOOK_PROCESSING_MODEL:'gpt-6-astra',BOOK_REASONING_EFFORT:'none'})),/requires reasoning/);
});

test('default Mini matches the benchmark: generation none, review low, with explicit overrides preserved',async()=>{
 const sent=[];
 const client=createBookModelClient({getEnv:env(),fetchImpl:async(_,init)=>{sent.push(JSON.parse(init.body));return Response.json(result({model:'gpt-5.4-mini-2026-03-17'}));}});
 await client('write','source',{schema:sectionSchema,name:'book_section'});
 await client('review','claims',{kind:'review'});
 for(const body of sent){assert.equal(body.model,'gpt-5.4-mini');assert.equal(body.max_completion_tokens,6000);assert.equal(body.max_tokens,undefined);}
 assert.equal(sent[0].reasoning_effort,'none');assert.equal(sent[1].reasoning_effort,'low');assert.equal(sent[0].response_format.type,'json_schema');
 assert.equal(bookModelConfig(env({BOOK_REASONING_EFFORT:'medium'})).effort,'medium');
 assert.equal(bookModelConfig(env({BOOK_REVIEW_REASONING_EFFORT:'high'}),'review').effort,'high');
 assert.equal(bookModelConfig(env({BOOK_PROCESSING_MODEL:'gpt-5.4-mini-2026-03-17'})).effort,'none');
 assert.equal(bookModelConfig(env({BOOK_PROCESSING_MODEL:'gpt-6.1-sol'})).effort,'low');
});

test('provider errors, refusal and truncation cannot become accepted notes or expose provider text',async()=>{
 for(const [response,pattern] of [
  [()=>new Response('synthetic-secret private body',{status:429}),/busy/],
  [()=>new Response('synthetic-secret private body',{status:400}),/HTTP 400/],
  [()=>Response.json(result({choices:[{finish_reason:'stop',message:{refusal:'private refusal'}}]})),/declined/],
  [()=>Response.json(result({choices:[{finish_reason:'length',message:{content:'{"ok":true}'}}]})),/incomplete/],
  [()=>Response.json(result({choices:[{finish_reason:'stop',message:{content:'[1,2]'}}]})),/invalid book object/],
  [()=>Response.json(result({choices:[{finish_reason:'stop',message:{content:'not json'}}]})),/invalid JSON/],
 ]){
  const metrics=[];const client=createBookModelClient({getEnv:env(),fetchImpl:async()=>response(),onUsage:m=>metrics.push(m)});
  await assert.rejects(client('system','source'),error=>pattern.test(error.message)&&!/synthetic-secret|private/.test(error.message));assert.equal(metrics[0].outcome,'error');
 }
 const client=createBookModelClient({getEnv:env(),fetchImpl:async()=>{throw Error('synthetic-secret');}});await assert.rejects(client('system','source'),/could not be reached/);
});

test('missing usage stays unknown and telemetry errors do not retry successful paid output',async()=>{
 const metrics=[];const client=createBookModelClient({getEnv:env(),fetchImpl:async()=>Response.json(result({model:null,usage:undefined})),onUsage:m=>{metrics.push(m);throw Error('Telemetry down');}});
 assert.deepEqual(await client('system','source'),{ok:true});assert.equal(metrics[0].inputTokens,null);assert.equal(metrics[0].model,null);
});

test('bounded evaluation uses the real pipeline, saves usage, and never overwrites a previous run',async()=>{
 const root=mkdtempSync(join(tmpdir(),'awb-model-test-'));
 try{
  assert.throws(()=>benchmarkSource(''),/nonempty/);assert.throws(()=>benchmarkSource('x'.repeat(75001)),/75,000/);
  const source=benchmarkSource('Record expectations before a reversible trial.\nCompare observations with expectations and retain uncertainty.');
  let calls=0;
  const fetchImpl=async(_,request)=>{
   calls++;const body=JSON.parse(request.body),name=body.response_format.json_schema.name,input=JSON.parse(name.includes('review')?body.messages[1].content:'{}');
   const refs=[{startLine:1,endLine:2}];
   const value=name==='book_section'?{title:'Trials',author:null,summary:'Record expectations before comparing observations.',sourceRefs:refs,ideas:[{name:'Compare expectations',explanation:'Compare observed results with recorded expectations.',whenToUse:'Before and after a reversible trial.',steps:['Record expectations.','Compare observations.'],limits:'Retain uncertainty.',applicationBasis:'source-instruction',sourceRefs:refs}],antiPatterns:[],workedExamples:[]}:
    name==='book_cited_review'?{supported:true,issues:[],checks:input.claims.map(claim=>({id:claim.id,supported:true,reason:'Supported by the cited source.'}))}:
    name==='book_synthesis'?{oneLiner:'Compare trials with expectations.',readIf:'You are planning a trial.',thesis:'Record expectations and retain uncertainty.',tags:['trials'],year:null,glossary:[]}:{supported:true,issues:[]};
   return Response.json(result({choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]}));
  };
  const output=join(root,'run'),args={source,selected:['fast'],output,key:'synthetic-secret',fetchImpl};
  const report=await runModelBenchmark(args);assert.equal(calls,4);assert.equal(report.results[0].status,'complete',report.results[0].error);assert.equal(report.results[0].humanQualityReview,'not_performed');assert.equal(report.results[0].metrics.length,4);
  assert.doesNotMatch(readFileSync(join(output,'report.json'),'utf8'),/synthetic-secret|Record expectations/);
  await assert.rejects(runModelBenchmark(args),/EEXIST/);assert.equal(calls,4);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test('Gemini uses its fixed endpoint and credential, preserving schema and bounded output',async()=>{
 let request;
 const client=createBookModelClient({getEnv:name=>({BOOK_PROCESSING_MODEL:'gemini-3.5-flash-lite',GEMINI_API_KEY:'google-test',OPENAI_API_KEY:'must-not-send'}[name]),fetchImpl:async(url,options)=>{request={url,...options};return Response.json({choices:[{finish_reason:'stop',message:{content:'{"ok":true}'}}]});}});
 await client('system','public domain input',{schema:{type:'object'},name:'test'});
 assert.match(request.url,/^https:\/\/generativelanguage.googleapis.com\//);assert.equal(request.headers.Authorization,'Bearer google-test');
 const body=JSON.parse(request.body);assert.equal(body.reasoning_effort,'minimal');assert.equal(body.max_tokens,6000);assert.equal(body.response_format.type,'json_schema');
 const cfg=bookModelConfig(env({BOOK_PROCESSING_MODEL:'gemini-3.5-flash-lite',BOOK_REVIEW_REASONING_EFFORT:'low'}),'review');assert.equal(cfg.effort,'low');
 assert.throws(()=>bookModelConfig(env({BOOK_PROCESSING_MODEL:'gemini-3.5-flash-lite',BOOK_REASONING_EFFORT:'none'})),/Invalid Gemini/);
});
