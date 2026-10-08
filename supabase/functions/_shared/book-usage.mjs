// Standard provider estimates, USD per million tokens, checked 2026-10-08.
// Customer billing, taxes, image generation and embedding charges are separate.
const rates=[[/^gpt-5\.4-mini(?:-|$)/,[.75,.075,4.5]],[/^gpt-5\.4-nano(?:-|$)/,[.2,.02,1.25]],[/^gpt-5\.5(?:-|$)/,[5,.5,30]]];
export function usageReceipt(rows) {
 let knownUsd=0,inputTokens=0,outputTokens=0,cachedInputTokens=0,unknownCalls=0,elapsedProviderMs=0;
 const models=new Set();
 for(const row of rows){
  const usage=row.usage||row,model=usage.model||usage.requestedModel||'unknown';models.add(model);
  const counts=[usage.inputTokens,usage.outputTokens];
  const rate=rates.find(([pattern])=>pattern.test(model))?.[1];
  elapsedProviderMs+=Number.isFinite(usage.elapsedMs)?usage.elapsedMs:0;
  if(!rate||counts.some(n=>!Number.isSafeInteger(n)||n<0)){unknownCalls++;continue;}
  const cached=Math.min(usage.inputTokens,Number.isSafeInteger(usage.cachedInputTokens)?usage.cachedInputTokens:0);
  knownUsd+=((usage.inputTokens-cached)*rate[0]+cached*rate[1]+usage.outputTokens*rate[2])/1e6;
  inputTokens+=usage.inputTokens;outputTokens+=usage.outputTokens;cachedInputTokens+=cached;
 }
 return {calls:rows.length,models:[...models],inputTokens,outputTokens,cachedInputTokens,elapsedProviderMs,knownProviderEstimateUsd:Number(knownUsd.toFixed(8)),unpricedCalls:unknownCalls,completeEstimate:unknownCalls===0,customerCharge:null,currency:'USD',rateDate:'2026-10-08',notice:'Provider token estimate for recorded generation/review calls; not a customer bill. Images, retrieval embeddings, unreported usage, taxes and service fees are not included. Customer pricing has not been configured.'};
}
