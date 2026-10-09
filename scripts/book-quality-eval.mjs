// Paid model calls are opt-in. Reports distinguish wrong grades from unavailable grades.
import {open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {createBookModelClient,bookModelConfig} from '../supabase/functions/_shared/book-model.mjs';
import {citedFidelityInstructions,summaryFidelityInstructions,requireFaithfulSection} from '../supabase/functions/_shared/book-fidelity.mjs';
import {citedReviewSchema,fidelitySchema} from '../supabase/functions/_shared/book-schemas.mjs';
import {reviewCases,summaryCases,summaryEvidence} from './book-eval-fixtures.mjs';

export function calibrationCases(suite) {
 if(suite==='claims')return reviewCases.map(([id,expected,evidence,notes])=>({id,expected,input:{claims:[{id:'claim',notes,evidence,sourceRefs:[{startLine:1,endLine:1}]}]},expectedIds:['claim']}));
 if(suite==='summary')return summaryCases.map(({id,expected,candidate})=>({id,expected,input:{evidence:summaryEvidence,candidate}}));
 throw Error('Select claims or summary.');
}
export function reviewerEnvironment(model,effort='low',base=process.env) {
 return name=>({BOOK_PROCESSING_MODEL:model,BOOK_REVIEW_MODEL:model,BOOK_REVIEW_REASONING_EFFORT:effort}[name]??base[name]);
}
export async function gradeCases(cases,client,suite) {
 const results=[];
 for(let start=0;start<cases.length;start+=3)results.push(...await Promise.all(cases.slice(start,start+3).map(async item=>{
  try{
   const report=await client(suite==='claims'?citedFidelityInstructions:summaryFidelityInstructions,JSON.stringify(item.input),{kind:'review',name:'book_quality_eval',schema:item.expectedIds?citedReviewSchema(item.expectedIds):fidelitySchema});
   const validBase=typeof report?.supported==='boolean'&&Array.isArray(report.issues)&&report.issues.every(i=>typeof i==='string')&&(report.supported?report.issues.length===0:report.issues.length>0);
   const checks=report?.checks;
   const validChecks=!item.expectedIds||(Array.isArray(checks)&&checks.length===item.expectedIds.length&&new Set(checks.map(c=>c?.id)).size===item.expectedIds.length&&checks.every(c=>item.expectedIds.includes(c?.id)&&typeof c.supported==='boolean'&&typeof c.reason==='string'&&c.reason.trim()));
   if(!validBase||!validChecks)return {id:item.id,expected:item.expected??null,accepted:null,pass:false,status:'invalid',report};
   let accepted=true;try{requireFaithfulSection(report,item.expectedIds);}catch{accepted=false;}
   return {id:item.id,expected:item.expected??null,accepted,pass:typeof item.expected==='boolean'?accepted===item.expected:null,status:'graded',report};
  }catch{return {id:item.id,expected:item.expected??null,accepted:null,pass:false,status:'unavailable'};}
 })));
 return results;
}
export function evaluationSummary(results) {
 return {cases:results.length,graded:results.filter(r=>r.status==='graded').length,unavailable:results.filter(r=>r.status!=='graded').length,passed:results.filter(r=>r.pass===true).length,accepted:results.filter(r=>r.accepted===true).length,rejected:results.filter(r=>r.accepted===false).length};
}
export async function calibrationCli(suite) {
 const {values}=parseArgs({options:{model:{type:'string',default:'accounts/fireworks/models/glm-5p3-flash'},effort:{type:'string',default:'low'},output:{type:'string'},run:{type:'boolean',default:false}}});
 const cases=calibrationCases(suite),getEnv=reviewerEnvironment(values.model,values.effort),config=bookModelConfig(getEnv,'review');
 console.log(JSON.stringify({paid:values.run,suite,config,cases:cases.map(({id,expected})=>({id,expected})),maxProviderRequests:cases.length}));
 if(!values.run)return;
 if(!values.output)throw Error('Choose a new --output report.json path.');
 // Reserve the output before spending, so a repeated command cannot replace evidence.
 const file=await open(values.output,'wx',0o600);
 const metrics=[],report={version:1,suite,config,startedAt:new Date().toISOString(),fixturesSha256:createHash('sha256').update(JSON.stringify(cases)).digest('hex'),rubricSha256:createHash('sha256').update(suite==='claims'?citedFidelityInstructions:summaryFidelityInstructions).digest('hex'),status:'running',results:[],metrics,limitations:'Targeted agent-labeled regressions. Not a general accuracy estimate, generation quality score, or human evaluation.'};
 try{
  const client=createBookModelClient({getEnv,onUsage:m=>metrics.push(m)});
  report.results=await gradeCases(cases,client,suite);Object.assign(report,evaluationSummary(report.results));report.status=report.passed===cases.length?'passed':'failed';report.completedAt=new Date().toISOString();
  console.log(JSON.stringify({status:report.status,...evaluationSummary(report.results),results:report.results.map(({id,accepted,pass,status})=>({id,accepted,pass,status}))}));
  if(report.status!=='passed')process.exitCode=1;
 }finally{await file.writeFile(JSON.stringify(report,null,2)+'\n');await file.close();}
}
