import test from 'node:test';
import assert from 'node:assert/strict';
import {calibrationCases,gradeCases,evaluationSummary} from './book-quality-eval.mjs';

test('unavailable model responses never count as correct rejection grades',async()=>{
 const cases=calibrationCases('claims');
 const results=await gradeCases(cases,async()=>{throw Error('Provider unavailable');},'claims');
 assert.equal(results.length,12);assert.ok(results.every(r=>r.accepted===null&&r.pass===false));
 assert.deepEqual(evaluationSummary(results),{cases:12,graded:0,unavailable:12,passed:0,accepted:0,rejected:0});
});
test('fixtures grade both valid and invalid claims without revealing expected answers to the model',async()=>{
 const cases=calibrationCases('claims').slice(0,2);let call=0;
 const results=await gradeCases(cases,async(_system,input)=>{
  assert.ok(!Object.hasOwn(JSON.parse(input),'expected'));
  const supported=call++===1;
  return {supported,issues:supported?[]:['The condition was lost.'],checks:[{id:'claim',supported,reason:'Source comparison.'}]};
 },'claims');
 assert.equal(evaluationSummary(results).passed,2);
});
test('missing individual grades are unavailable for both positive and negative fixtures',async()=>{
 for(const item of calibrationCases('claims').slice(0,2)){
  const [result]=await gradeCases([item],async()=>({supported:true,issues:[],checks:[]}), 'claims');
  assert.equal(result.accepted,null);assert.equal(result.pass,false);assert.equal(result.status,'invalid');
 }
});
