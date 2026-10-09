// Customer receipts expose retail rates and charges, never internal economics.
export const customerPricingModel='token-usage-v1';
export function customerBilling(billing){
 if(!billing)return billing;
 const result={};
 for(const key of ['state','quoteId','priceCents','ceilingCents','chargedCents','reservedCents','releasedCents','unresolvedOperations','currency','expiresAt','priceVersion','chargeWhen','includes','reason'])if(billing[key]!==undefined)result[key]=billing[key];
 if(billing.pricingModel)result.pricingModel=customerPricingModel;
 if(Array.isArray(billing.modelRates))result.modelRates=billing.modelRates.map(rate=>({model:rate.model,version:rate.version,inputUsdPerMillion:Number(rate.input_rate)*4,cachedInputUsdPerMillion:Number(rate.cached_rate)*4,outputUsdPerMillion:Number(rate.output_rate)*4}));
 return result;
}
export function customerUsage(receipt,operations,billing,billingRequired){
 const result={};
 for(const key of ['calls','models','inputTokens','outputTokens','cachedInputTokens','elapsedProviderMs','recordingCoverage','currency'])if(receipt[key]!==undefined)result[key]=receipt[key];
 result.meteredOperations=operations.map(o=>({id:o.id,kind:o.kind,model:o.model,state:o.state,created_at:o.created_at,metric:{inputTokens:o.metric?.inputTokens,outputTokens:o.metric?.outputTokens,cachedInputTokens:o.metric?.cachedInputTokens}}));
 result.customerCharge=billing?.chargedCents!=null?billing.chargedCents/100:billingRequired?null:0;
 result.customerBilling=customerBilling(billing)||{state:billingRequired?'unquoted':'free',chargedCents:0};
 result.notice='Recorded generation usage. Charges use your approved token rates. Incomplete usage is reviewed before settlement.';
 return result;
}
