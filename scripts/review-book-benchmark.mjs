// Cross-model review of saved benchmark output; no source generation or deployment.
// Only public/authorized samples, bounded to the same six sections as the benchmark.
import {readFileSync} from 'node:fs';
import {open} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {benchmarkSource} from './benchmark-book-models.mjs';
import {reviewerEnvironment,gradeCases,evaluationSummary} from './book-quality-eval.mjs';
import {createBookModelClient,bookModelConfig} from '../supabase/functions/_shared/book-model.mjs';
import {sectionClaims,citedFidelityInstructions} from '../supabase/functions/_shared/book-fidelity.mjs';

const {values}=parseArgs({options:{source:{type:'string'},benchmark:{type:'string'},model:{type:'string',default:'gpt-5.4-mini'},output:{type:'string'},run:{type:'boolean',default:false}}});
if(!values.source||!values.benchmark)throw Error('Provide --source TEXT and --benchmark SAVED_RESPONSE.json.');
const source=benchmarkSource(readFileSync(values.source,'utf8')),raw=readFileSync(values.benchmark,'utf8'),saved=JSON.parse(raw);
const hash=value=>createHash('sha256').update(value).digest('hex');
if(saved.report?.sourceTextSha256!==hash(source.text))throw Error('Source hash does not match benchmark.');
const notes=saved.files?.['accepted-notes.json'];
if(!Array.isArray(notes)||notes.length!==source.chunks.length)throw Error('Complete section notes are required.');
const cases=notes.map((note,i)=>{
 if(note.id!==`ch${String(i+1).padStart(2,'0')}`)throw Error('Unexpected section order.');
 const chunk=source.chunks[i],refs=[note.sourceRefs,...note.ideas.map(idea=>idea.sourceRefs),...(note.antiPatterns||[]).map(a=>a.sourceRefs),...(note.workedExamples||[]).map(e=>e.sourceRefs)].flat();
 if(refs.some(r=>!Number.isInteger(r.startLine)||!Number.isInteger(r.endLine)||r.startLine<chunk.start||r.endLine>chunk.end||r.endLine<r.startLine))throw Error('Invalid source references.');
 const claims=sectionClaims(note,chunk);return {id:note.id,input:{claims},expectedIds:claims.map(c=>c.id)};
});
const getEnv=reviewerEnvironment(values.model),config=bookModelConfig(getEnv,'review');
console.log(JSON.stringify({paid:values.run,config,sections:cases.length,maxProviderRequests:cases.length,sourceSha256:hash(source.text)}));
if(values.run){
 if(!values.output)throw Error('Choose a new --output report.json path.');
 const file=await open(values.output,'wx',0o600),metrics=[];
 const report={version:1,config,sourceSha256:hash(source.text),benchmarkSha256:hash(raw),rubricSha256:hash(citedFidelityInstructions),startedAt:new Date().toISOString(),metrics,limitations:'Different-model source review of saved section notes only. Same production rubric. Not blinded human evaluation, full-book coverage, or synthesis re-review.'};
 try{
  const client=createBookModelClient({getEnv,onUsage:m=>metrics.push(m)});
  report.results=await gradeCases(cases,client,'claims');Object.assign(report,evaluationSummary(report.results));report.status=report.accepted===cases.length?'accepted':'needs_review';report.completedAt=new Date().toISOString();
  console.log(JSON.stringify({status:report.status,...evaluationSummary(report.results),results:report.results.map(({id,accepted,status,report:r})=>({id,accepted,status,issues:r?.issues,failedChecks:r?.checks?.filter(c=>!c.supported)}))}));
  if(report.status!=='accepted')process.exitCode=1;
 }finally{await file.writeFile(JSON.stringify(report,null,2)+'\n');await file.close();}
}
