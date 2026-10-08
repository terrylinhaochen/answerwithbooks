import test from 'node:test';import assert from 'node:assert/strict';
import {usageReceipt} from '../supabase/functions/_shared/book-usage.mjs';
test('usage prices cached tokens once, includes failed-call usage, and leaves unknown fees explicit',()=>{
 const receipt=usageReceipt([{usage:{model:'gpt-5.4-mini-2026-03-17',inputTokens:1000000,cachedInputTokens:200000,outputTokens:100000,outcome:'error',elapsedMs:1234}},{usage:{requestedModel:'gpt-image-1.5',elapsedMs:2}}]);
 assert.equal(receipt.knownProviderEstimateUsd,1.065);assert.equal(receipt.unpricedCalls,1);assert.equal(receipt.completeEstimate,false);assert.equal(receipt.customerCharge,null);assert.equal(receipt.elapsedProviderMs,1236);
});
