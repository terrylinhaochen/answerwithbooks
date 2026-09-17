import test from 'node:test';
import assert from 'node:assert/strict';
import { topUpState, filterUsage, usageCharge, sharedUsageRows } from '../src/lib/billing-view.mjs';
const page='http://127.0.0.1:4321', api='https://api.example.com';
const billing={mode:'live',canTopUp:true,topUps:[1000,2500],policyVersion:'v1',policyUrl:'https://answerwithbooks.com/terms/'};
test('top-ups fail closed for preview, unapproved accounts, payment review, and unknown modes',()=>{
  for(const change of [{mode:'metering-only'},{mode:'unknown'},{canTopUp:false},{paymentReview:true}]) assert.equal(topUpState({...billing,...change},page,api).ready,false);
  assert.equal(topUpState(billing,page,api).ready,true);
  assert.equal(topUpState({...billing,mode:'test',policyUrl:api+'/billing/credit-terms/'},page,api).test,true);
});
test('checkout accepts only configured amounts and trusted credit terms',()=>{
  for(const change of [{topUps:[]},{topUps:[-5]},{topUps:[150.3]},{topUps:[100001]},{policyVersion:''},{policyUrl:'javascript:alert(1)'},{policyUrl:'https://untrusted.example.com/terms'},{policyUrl:'https://name:pass@api.example.com/terms'}]) assert.equal(topUpState({...billing,...change},page,api).ready,false);
  assert.deepEqual(topUpState({...billing,topUps:[1000,1000]},page,api).amounts,[1000]);
});
test('usage filters intersect status, skill and date without changing source records',()=>{
  const now=Date.parse('2026-09-14T00:00:00Z');
  const runs=[{status:'completed',capability:'github-leads',createdAt:'2026-09-13T10:00:00Z'},{status:'running',capability:'x-discourse',createdAt:'2026-09-12T00:00:00Z'},{status:'completed',capability:'github-leads',createdAt:'2026-08-01T00:00:00Z'}];
  assert.equal(filterUsage(runs,{status:'completed',skill:'github-leads',days:'7'},now).length,1);
  assert.equal(filterUsage(runs,{},now).length,3);assert.equal(runs.length,3);
});
test('usage distinguishes actual charges, pending execution, outcome review and unknown cost',()=>{
  assert.equal(usageCharge({billing:{mode:'metering-only'}}),'Not charged');
  assert.equal(usageCharge({status:'running',billing:{mode:'live',chargedCents:0}}),'Pending');
  assert.equal(usageCharge({status:'completed',billing:{mode:'test',state:'pending',chargedCents:0}}),'Awaiting review');
  assert.equal(usageCharge({status:'completed',billing:{mode:'test',state:'settled',chargedCents:500}}),500);
  assert.equal(usageCharge({status:'completed',billing:{mode:'live'}}),'—');
});

test('shared CrowdListen usage shows actual settlement without a second wrapper charge',()=>{
 const rows=sharedUsageRows({mode:'test',runs:[{id:'wrapper',capability:'product-feedback-analysis',createdAt:'2026-09-17',billing:{mode:'metering-only'}}],sharedUsage:[{operation_id:'native',created_at:'2026-09-17',state:'settled',charged_cents:7,origin:'hosted'}]});
 assert.equal(usageCharge(rows.find(r=>r.id==='wrapper')),'See CrowdListen usage');
 assert.equal(usageCharge(rows.find(r=>r.id==='native')),7);
 assert.equal(usageCharge({status:'review',billing:{mode:'test',state:'reconciliation',chargedCents:null}}),'Awaiting review');
});
