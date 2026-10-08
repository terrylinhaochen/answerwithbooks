// Standard provider estimates, USD per million tokens, checked 2026-10-08.
// Customer billing, taxes, image generation and embedding charges are separate.
const rates=[[/^gpt-5\.4-mini(?:-|$)/,[.75,.075,4.5]],[/^gpt-5\.4-nano(?:-|$)/,[.2,.02,1.25]],[/^gpt-5\.5(?:-|$)/,[5,.5,30]]];
export function usageReceipt(rows) {
 let knownUsd=0,imageUsd=0,inputTokens=0,outputTokens=0,cachedInputTokens=0,unknownCalls=0,elapsedProviderMs=0;
 const models=new Set();
 for(const row of rows){
  const usage=row.usage||row,model=usage.model||usage.requestedModel||'unknown';models.add(model);
  const counts=[usage.inputTokens,usage.outputTokens];
  const rate=rates.find(([pattern])=>pattern.test(model))?.[1];
  elapsedProviderMs+=Number.isFinite(usage.elapsedMs)?usage.elapsedMs:0;
  if(usage.kind==='image'&&/^gpt-image-1\.5(?:-|$)/.test(model)&&counts.every(n=>Number.isSafeInteger(n)&&n>=0)){
   // Image generation is text-input only here. Unreported cache discounts are
   // conservatively excluded; official image output rate is $32/M tokens.
   const text=usage.inputTextTokens??usage.inputTokens,images=usage.inputImageTokens??0;
   const cost=(text*5+images*8+usage.outputTokens*32)/1e6;
   knownUsd+=cost;imageUsd+=cost;inputTokens+=usage.inputTokens;outputTokens+=usage.outputTokens;continue;
  }
  if(!rate||counts.some(n=>!Number.isSafeInteger(n)||n<0)){unknownCalls++;continue;}
  const cached=Math.min(usage.inputTokens,Number.isSafeInteger(usage.cachedInputTokens)?usage.cachedInputTokens:0);
  knownUsd+=((usage.inputTokens-cached)*rate[0]+cached*rate[1]+usage.outputTokens*rate[2])/1e6;
  inputTokens+=usage.inputTokens;outputTokens+=usage.outputTokens;cachedInputTokens+=cached;
 }
 return {calls:rows.length,models:[...models],inputTokens,outputTokens,cachedInputTokens,elapsedProviderMs,knownProviderEstimateUsd:Number(knownUsd.toFixed(8)),textProviderEstimateUsd:Number((knownUsd-imageUsd).toFixed(8)),imageProviderEstimateUsd:Number(imageUsd.toFixed(8)),unpricedCalls:unknownCalls,completeEstimate:rows.length>0&&unknownCalls===0,recordingCoverage:'recorded-calls-only',customerCharge:null,currency:'USD',rateDate:'2026-10-08',notice:(rows.length?'':'No usage receipt exists for this book. A zero recorded total does not mean free processing. ')+'Provider token estimate for recorded text and image generation calls; not a customer bill. Unreported image cache discounts, retrieval embeddings, unreported usage, taxes and service fees are not included. Customer pricing has not been configured.'};
}
