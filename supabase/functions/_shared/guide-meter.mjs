import {createBookModelClient} from './book-model.mjs';
export const guideRates={'gpt-5.4-mini':[.75,.075,4.5],'gpt-5.4':[2.5,.25,15],'gpt-image-1.5':[5,5,32],'text-embedding-3-small':[.02,.02,0]};
const checked=r=>{if(r.error){const e=Error(r.error.message?.includes('GUIDE_BUDGET_LIMIT')?'This reading reached its processing budget. Your saved books and question are intact. Try a shorter reading.':'Could not record generation usage.');if(r.error.message?.includes('GUIDE_BUDGET_LIMIT'))e.code='GUIDE_BUDGET_LIMIT';throw e;}return r.data;};
export function priceUsage(model,metric){
 const rates=guideRates[model];if(!rates)throw Error('Unpriced guide model.');
 if(!Number.isSafeInteger(metric.inputTokens)||!Number.isSafeInteger(metric.outputTokens))return null;
 const cached=Math.max(0,Math.min(metric.inputTokens,metric.cachedInputTokens||0));
 return ((metric.inputTokens-cached)*rates[0]+cached*rates[1]+metric.outputTokens*rates[2])/1e6;
}
export function guideMeter(db,job){
 return {
  async reserve(model,stage,inputBound,outputBound,keep=.37){
   const rates=guideRates[model];if(!rates)throw Error('Unpriced guide model.');
   const upper=(inputBound*rates[0]+outputBound*rates[2])/1e6;
   return checked(await db.rpc('reserve_guide_usage',{p_id:job.id,p_operation:crypto.randomUUID(),p_model:model,p_stage:stage,p_upper:upper,p_keep:keep}));
  },
  async settle(operation,model,metric){checked(await db.rpc('settle_guide_usage',{p_operation:operation,p_cost:priceUsage(model,metric),p_metric:metric}));}
 };
}
export function guideModel(db,job,getEnv){
 const meter=guideMeter(db,job);
 return async(system,input,options={})=>{
  const strong=options.kind==='review'||options.kind==='selection';
  const name=strong?'gpt-5.4':'gpt-5.4-mini';
  const client=createBookModelClient({getEnv:n=>n==='BOOK_PROCESSING_MODEL'||n==='BOOK_REVIEW_MODEL'||n==='BOOK_PROOFREAD_MODEL'?name:n==='BOOK_REASONING_EFFORT'||n==='BOOK_REVIEW_REASONING_EFFORT'?(strong?'low':'none'):getEnv(n),
   beforeCall:r=>meter.reserve(name,job.status+':'+(options.name||options.kind||'draft'),r.inputBound,r.outputBound,job.status==='ready'?.35:.37),
   afterCall:(id,metric)=>meter.settle(id,name,metric)});
  return client(system,input,{...options,kind:strong?'review':options.kind,maxOutputTokens:options.maxOutputTokens||(strong?2500:3500)});
 };
}
export async function meteredGuideCover(db,job,generate){
 const meter=guideMeter(db,job);const operation=await meter.reserve('gpt-image-1.5','cover',10000,10000,0);
 let metric={kind:'image',model:'gpt-image-1.5',outcome:'error',inputTokens:null,outputTokens:null};
 try{const result=await generate();metric={...metric,...result.usage,outcome:'complete'};return result;}
 finally{await meter.settle(operation,'gpt-image-1.5',metric);}
}
