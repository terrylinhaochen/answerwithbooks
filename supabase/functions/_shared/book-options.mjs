export const maxBatchFiles = 10;
export function processingOptions(value = {}) {
 if(!value || typeof value !== 'object' || Array.isArray(value))throw new Error('Invalid processing options.');
 const options={mode:value.mode??'full',depth:value.depth??'study',purpose:value.purpose??'apply',extractionMode:value.extractionMode??'text'};
 if(!['full','analysis'].includes(options.mode)||!['reference','study'].includes(options.depth)||!['apply','mental-models','reference','all'].includes(options.purpose)||!['text','technical'].includes(options.extractionMode))throw new Error('Invalid processing options.');
 return options;
}
export function depthGuidance(value) {
 const options=processingOptions(value);
 return `Purpose: ${options.purpose}. Depth: ${options.depth}. ${options.depth==='reference'?'Make compact notes optimized for looking up frameworks, decision rules, and boundaries.':'Develop explanations and source-supported examples so a reader can learn and apply the method.'} The upstream guidance targets roughly ${options.depth==='reference'?'800–1200':'1000–1800'} tokens per substantive text chapter, but extraction sections are not chapters: never pad thin sections to hit a length target. Include mental models, anti-patterns and worked examples only when the source supports them. Do not invent code or reconstruct tables lost during extraction.`;
}
export function retryPatch(attempts, message, now=Date.now()) {
 return {error:message,lease_token:null,lease_until:null,run_state:attempts>=5?'failed':'queued',next_attempt_at:new Date(now+Math.min(300000,30000*2**Math.max(0,attempts-1))).toISOString(),updated_at:new Date(now).toISOString()};
}
