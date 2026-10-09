import test from 'node:test';import assert from 'node:assert/strict';
import {usageReceipt} from '../supabase/functions/_shared/book-usage.mjs';
test('usage prices cached tokens once, includes failed-call usage, and leaves unknown fees explicit',()=>{
 const receipt=usageReceipt([{usage:{model:'gpt-5.4-mini-2026-03-17',inputTokens:1000000,cachedInputTokens:200000,outputTokens:100000,outcome:'error',elapsedMs:1234}},{usage:{requestedModel:'gpt-image-1.5',elapsedMs:2}}]);
 assert.equal(receipt.knownProviderEstimateUsd,1.065);assert.equal(receipt.unpricedCalls,1);assert.equal(receipt.completeEstimate,false);assert.equal(receipt.customerCharge,null);assert.equal(receipt.elapsedProviderMs,1236);
});

test('unmetered legacy books are unknown, not zero-cost complete estimates',()=>{const receipt=usageReceipt([]);assert.equal(receipt.completeEstimate,false);assert.match(receipt.notice,/does not mean free/);});

test('image receipts use reported input and output tokens rather than a guessed flat price',()=>{const r=usageReceipt([{usage:{kind:'image',requestedModel:'gpt-image-1.5',inputTokens:100,inputTextTokens:100,inputImageTokens:0,outputTokens:408}}]);assert.equal(r.imageProviderEstimateUsd,.013556);assert.equal(r.textProviderEstimateUsd,0);assert.equal(r.unpricedCalls,0);});


test('customer billing exposes final rates and charges without internal markup or provider cost',async()=>{
 const {customerBilling,customerUsage}=await import('../supabase/functions/_shared/book-billing-public.mjs');
 const internal={state:'held',pricingModel:'metered-4x',ceilingCents:500,chargedCents:12,multiplier:4,providerMarginBps:7500,providerCostUsd:.03,rateBasis:'provider-list-rates',modelRates:[{model:'test',version:'v1',input_rate:.75,cached_rate:.075,output_rate:4.5}]};
 const billing=customerBilling(internal);assert.equal(billing.pricingModel,'token-usage-v1');assert.equal(billing.chargedCents,12);assert.deepEqual(billing.modelRates,[{model:'test',version:'v1',inputUsdPerMillion:3,cachedInputUsdPerMillion:.3,outputUsdPerMillion:18}]);
 const usage=customerUsage({calls:1,inputTokens:100,outputTokens:10,knownProviderEstimateUsd:.03,imageProviderEstimateUsd:0,notice:'internal cost'},[{id:'op',cost_usd:.03,rate_version:'internal',metric:{inputTokens:100,outputTokens:10,providerEvidence:'private'}}],internal,true);
 assert.equal(usage.customerCharge,.12);assert.equal(usage.inputTokens,100);assert.doesNotMatch(JSON.stringify({billing,usage}),/multiplier|providerMargin|providerCost|ProviderEstimate|input_rate|cost_usd|private|metered-4x|7500/);
});
