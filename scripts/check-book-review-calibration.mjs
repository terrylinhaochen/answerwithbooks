// Opt-in paid regression probe. Fixtures are public-domain excerpts or synthetic.
import {writeFile} from 'node:fs/promises';
import {createBookModelClient} from '../supabase/functions/_shared/book-model.mjs';
import {citedFidelityInstructions,requireFaithfulSection} from '../supabase/functions/_shared/book-fidelity.mjs';
import {citedReviewSchema} from '../supabase/functions/_shared/book-schemas.mjs';
const cases=[
 ['conditional-output',false,'1: They could, when they exerted themselves, make about twelve pounds of pins in a day.','The workshop routinely produced twelve pounds of pins every day.'],
 ['qualified-output',true,'1: They could, when they exerted themselves, make about twelve pounds of pins in a day.','Smith says that with exertion they could make about twelve pounds in a day.'],
 ['metadata-only',false,'1: The Wealth of Nations, by Adam Smith.','Labour determines the exchange value of commodities.'],
 ['missing-deadline',false,'1: An action without a date is incomplete: clarify its timing before committing to it.','Discard any action that lacks a deadline.'],
 ['lifetime-roles',false,'1: Some historical workers spent their whole lives at one operation. Repetition developed their dexterity.',{applicationBasis:'derived-application',steps:['Assign workers to permanent lifetime roles to obtain the productivity benefit.']}],
 ['cautious-application',true,'1: Repetition can develop dexterity. Switching operations consumes time.',{applicationBasis:'derived-application',steps:['Try grouping similar tasks temporarily and observe whether switching time falls.'],limits:'This is an application to test, not an author-prescribed staffing policy.'}],
 ['invented-source-instruction',false,'1: Repetition can develop dexterity. Switching operations consumes time.',{applicationBasis:'source-instruction',steps:['Use fixed quarterly rotations to optimize productivity.']}],
 ['transport-overgeneralization',false,'1: Water carriage historically made it possible to carry larger loads over longer distances at lower expense than carts on the routes described.',{applicationBasis:'derived-application',steps:['Always ship by water, because it is cheaper for every route.']}],
];
if(!process.argv.includes('--run')){console.log(JSON.stringify({paid:false,cases:cases.map(([id,expected])=>({id,expected})),model:'gpt-5.4-mini',reviewEffort:'low'}));process.exit(0);}
const output=process.argv[process.argv.indexOf('--output')+1];if(!process.argv.includes('--output')||!output)throw Error('Choose a new --output report.json path.');
const metrics=[];const model=createBookModelClient({getEnv:name=>({BOOK_PROCESSING_MODEL:'gpt-5.4-mini',BOOK_REVIEW_MODEL:'gpt-5.4-mini',BOOK_REVIEW_REASONING_EFFORT:'low'}[name]||process.env[name]),onUsage:value=>metrics.push(value)});
const results=[];
for(let start=0;start<cases.length;start+=3){
 results.push(...await Promise.all(cases.slice(start,start+3).map(async([id,expected,evidence,notes])=>{
  const claims=[{id:'claim',notes,evidence,sourceRefs:[{startLine:1,endLine:1}]}];
  const report=await model(citedFidelityInstructions,JSON.stringify({claims}),{kind:'review',name:'book_review_calibration',schema:citedReviewSchema(['claim'])});
  let accepted=true;try{requireFaithfulSection(report,['claim']);}catch{accepted=false;}
  return {id,expected,accepted,pass:accepted===expected,report};
 })));
}
await writeFile(output,JSON.stringify({model:'gpt-5.4-mini',reviewEffort:'low',results,metrics,limitations:'Eight known regression cases; not an estimate of general factual accuracy or an independent human evaluation.'},null,2),{flag:'wx'});
console.log(JSON.stringify({cases:results.length,passed:results.filter(result=>result.pass).length,results:results.map(({id,expected,accepted,pass})=>({id,expected,accepted,pass}))}));
if(results.some(result=>!result.pass))process.exitCode=1;
