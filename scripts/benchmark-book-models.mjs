// Small, bounded provider comparison. Dry-run unless --run is supplied.
// Uses the production distillation/compiler, with no queue, cover or retries.
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {parseArgs} from 'node:util';
import {createBookModelClient, bookModelConfig} from '../supabase/functions/_shared/book-model.mjs';
import {splitSource} from '../supabase/functions/_shared/book-sections.mjs';
import {distillSection, compileDistillation} from '../supabase/functions/_shared/book-distillation.mjs';

import {distillSectionBatch,sectionConcurrency} from '../supabase/functions/_shared/book-parallel.mjs';

export const profiles = {
  '5.5': {BOOK_PROCESSING_MODEL:'gpt-5.5', BOOK_REVIEW_MODEL:'gpt-5.5', BOOK_REASONING_EFFORT:'none', BOOK_REVIEW_REASONING_EFFORT:'low'},
  '5.4-mini': {BOOK_PROCESSING_MODEL:'gpt-5.4-mini', BOOK_REVIEW_MODEL:'gpt-5.4-mini', BOOK_REASONING_EFFORT:'none', BOOK_REVIEW_REASONING_EFFORT:'low'},
  '5.4-nano': {BOOK_PROCESSING_MODEL:'gpt-5.4-nano', BOOK_REVIEW_MODEL:'gpt-5.4-nano', BOOK_REASONING_EFFORT:'none', BOOK_REVIEW_REASONING_EFFORT:'low'},
  'flash-lite': {BOOK_PROCESSING_MODEL:'gemini-3.5-flash-lite', BOOK_REVIEW_MODEL:'gemini-3.5-flash-lite'},
  'flash-lite-2.5': {BOOK_PROCESSING_MODEL:'gemini-2.5-flash-lite', BOOK_REVIEW_MODEL:'gemini-2.5-flash-lite'},
  baseline: {BOOK_PROCESSING_MODEL:'gpt-4.1-mini', BOOK_REVIEW_MODEL:'gpt-4.1-mini'},
  fast: {BOOK_PROCESSING_MODEL:'gpt-6-luna', BOOK_REVIEW_MODEL:'gpt-6-luna', BOOK_REASONING_EFFORT:'none', BOOK_REVIEW_REASONING_EFFORT:'low'},
  'strong-review': {BOOK_PROCESSING_MODEL:'gpt-6-luna', BOOK_REVIEW_MODEL:'gpt-6.1-sol', BOOK_REASONING_EFFORT:'none', BOOK_REVIEW_REASONING_EFFORT:'low'},
  quality: {BOOK_PROCESSING_MODEL:'gpt-6.1-sol', BOOK_REVIEW_MODEL:'gpt-6.1-sol', BOOK_REASONING_EFFORT:'low', BOOK_REVIEW_REASONING_EFFORT:'low'},
};
const hash = value => createHash('sha256').update(value).digest('hex');
const pipelineFiles=['book-model','book-parallel','book-schemas','book-sections','book-fidelity','book-distillation','book-overview','book-options','book-artifacts','upstream-guidance'];
const pipelineHashes=()=>Object.fromEntries(pipelineFiles.map(name=>[name,hash(readFileSync(new URL(`../supabase/functions/_shared/${name}.mjs`,import.meta.url)))]));

export function benchmarkSource(text) {
  if(!text.trim() || text.length>75000)throw new Error('Use a nonempty, extracted UTF-8 sample of at most 75,000 characters.');
  const normalized=text.replace(/\r\n?/g,'\n').split('\n').flatMap(line=>line.match(/.{1,1000}/gu)||['']).join('\n');
  const headings=normalized.split('\n').flatMap((line,index)=>/^\s*(?:CHAPTER|Chapter)\s+(?:[IVXLCDM]+|\d+)\b/.test(line)?[{line:index+1,title:line.trim()}]:[]);
  const source=splitSource(normalized,headings);
  if(source.chunks.length>6)throw new Error('Use a smaller sample: the evaluation is limited to six processing sections.');
  return source;
}

export async function runModelBenchmark({source, selected, output, key, geminiKey, concurrency=1, fetchImpl=fetch}) {
  sectionConcurrency(concurrency);
  if(selected.some(name=>!name.startsWith('flash-')) && !key)throw new Error('Set OPENAI_API_KEY in the process environment; do not put it in arguments or output files.');
  if(!selected.length || new Set(selected).size!==selected.length || selected.some(name=>!Object.hasOwn(profiles,name)))throw new Error(`Select unique profiles: ${Object.keys(profiles).join(', ')}.`);
  if(!source.chunks.length || source.chunks.length>6)throw new Error('Invalid benchmark source.');
  // An existing output directory is never overwritten, even after an interrupted run.
  mkdirSync(output,{mode:0o700});
  const report={version:2,concurrency,startedAt:new Date().toISOString(),pipelineHashes:pipelineHashes(),sourceTextSha256:hash(source.text),characters:source.text.length,sections:source.chunks.length,
    includes:['section generation','cited-claim review','synthesis','synthesis review','artifact compilation'],
    excludes:['extraction','upload','queue','cover','installation','human quality review'],maxProviderRequests:selected.length*(2*source.chunks.length+2),results:[]};
  const save=()=>writeFileSync(join(output,'report.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});
  save();
  for(const name of selected){
    const directory=join(output,name);mkdirSync(directory,{mode:0o700});
    const metrics=[],outputs=[],result={profile:name,config:profiles[name],status:'running',metrics,sourceCheck:'not_complete',humanQualityReview:'not_performed'};
    report.results.push(result);save();
    const getEnv=variable=>variable==='OPENAI_API_KEY'?key:variable==='GEMINI_API_KEY'?geminiKey:profiles[name][variable];
    bookModelConfig(getEnv);bookModelConfig(getEnv,'review');
    const client=createBookModelClient({getEnv,fetchImpl,onUsage:metric=>{metrics.push(metric);save();}});
    let calls=0;
    const modelJson=async(system,input,options)=>{
      if(++calls>2*source.chunks.length+2)throw new Error('The evaluation request limit was reached.');
      const value=await client(system,input,options);
      outputs.push({stage:options.name,value});writeFileSync(join(directory,'model-outputs.json'),JSON.stringify(outputs,null,2)+'\n',{mode:0o600});
      return value;
    };
    const started=performance.now();let notes=[];
    try{
      let cursor=0;
      while(cursor<source.chunks.length){
        const batch=await distillSectionBatch({chunks:source.chunks,notes,cursor,concurrency,distill:(chunk,index)=>distillSection(chunk,index,modelJson,{mode:'full',depth:'study',purpose:'apply'})});
        notes=batch.notes;cursor=batch.cursor;
        writeFileSync(join(directory,'accepted-notes.json'),JSON.stringify(notes,null,2)+'\n',{mode:0o600});
        if(batch.errors.length)throw batch.errors[0];
      }
      const job={id:'00000000-0000-4000-8000-000000000001',title:'Bounded source sample',author:'Source author',source_text:source.text,source_sha:hash(source.text),options:{mode:'full',depth:'study',purpose:'apply'}};
      const artifacts=await compileDistillation(job,notes,modelJson,async bytes=>hash(bytes));
      writeFileSync(join(directory,'artifacts.json'),JSON.stringify(artifacts,null,2)+'\n',{mode:0o600});
      result.status='complete';result.sourceCheck='model_passed_not_human_verified';result.artifactCount=Object.keys(artifacts).length;
    }catch(error){result.status='failed';result.error=error.message;}
    finally{result.elapsedMs=performance.now()-started;result.completedSections=notes.length;save();}
  }
  report.completedAt=new Date().toISOString();save();
  return report;
}

async function main(){
  const {values}=parseArgs({options:{source:{type:'string'},output:{type:'string'},profiles:{type:'string',default:'baseline,fast,strong-review'},concurrency:{type:'string',default:'1'},run:{type:'boolean',default:false}}});
  if(!values.source)throw new Error('Use --source EXTRACTED_TEXT [--output NEW_DIRECTORY] [--profiles baseline,fast,strong-review,quality] [--run]. Without --run this only prints the plan.');
  const concurrency=sectionConcurrency(values.concurrency);
  const selected=values.profiles.split(',');
  if(!selected.length || new Set(selected).size!==selected.length || selected.some(name=>!Object.hasOwn(profiles,name)))throw new Error(`Select unique profiles: ${Object.keys(profiles).join(', ')}.`);
  const source=benchmarkSource(readFileSync(values.source,'utf8'));
  console.log(JSON.stringify({mode:values.run?'live':'dry-run',concurrency,sourceTextSha256:hash(source.text),characters:source.text.length,sections:source.chunks.length,profiles:selected.map(name=>({name,...profiles[name]})),maxProviderRequests:selected.length*(source.chunks.length*2+2),maxOutputTokensPerRequest:6000,automaticRetries:0},null,2));
  if(!values.run)return;
  if(!values.output)throw new Error('--run requires --output NEW_DIRECTORY.');
  const report=await runModelBenchmark({source,selected,output:resolve(values.output),key:process.env.OPENAI_API_KEY,geminiKey:process.env.GEMINI_API_KEY,concurrency});
  console.log(JSON.stringify(report.results.map(({profile,status,elapsedMs,completedSections,error})=>({profile,status,elapsedMs,completedSections,error})),null,2));
  if(report.results.some(result=>result.status!=='complete'))process.exitCode=1;
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error(error.message);process.exitCode=1;});
