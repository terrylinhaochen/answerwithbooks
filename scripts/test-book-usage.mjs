import test from 'node:test';import assert from 'node:assert/strict';
import {usageReceipt} from '../supabase/functions/_shared/book-usage.mjs';
test('usage prices cached tokens once, includes failed-call usage, and leaves unknown fees explicit',()=>{
 const receipt=usageReceipt([{usage:{model:'gpt-5.4-mini-2026-03-17',inputTokens:1000000,cachedInputTokens:200000,outputTokens:100000,outcome:'error',elapsedMs:1234}},{usage:{requestedModel:'gpt-image-1.5',elapsedMs:2}}]);
 assert.equal(receipt.knownProviderEstimateUsd,1.065);assert.equal(receipt.unpricedCalls,1);assert.equal(receipt.completeEstimate,false);assert.equal(receipt.customerCharge,null);assert.equal(receipt.elapsedProviderMs,1236);
});

test('unmetered legacy books are unknown, not zero-cost complete estimates',()=>{const receipt=usageReceipt([]);assert.equal(receipt.completeEstimate,false);assert.match(receipt.notice,/does not mean free/);});

test('image receipts use reported input and output tokens rather than a guessed flat price',()=>{const r=usageReceipt([{usage:{kind:'image',requestedModel:'gpt-image-1.5',inputTokens:100,inputTextTokens:100,inputImageTokens:0,outputTokens:408}}]);assert.equal(r.imageProviderEstimateUsd,.013556);assert.equal(r.textProviderEstimateUsd,0);assert.equal(r.unpricedCalls,0);});
