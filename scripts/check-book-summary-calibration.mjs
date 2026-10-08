// Opt-in paid regression check for the direction of aggregate review.
import {writeFile} from 'node:fs/promises';
import {createBookModelClient} from '../supabase/functions/_shared/book-model.mjs';
import {summaryFidelityInstructions,requireFaithfulSection} from '../supabase/functions/_shared/book-fidelity.mjs';
import {fidelitySchema} from '../supabase/functions/_shared/book-schemas.mjs';
const evidence=[{summary:'Smith argues that division of labour increases productivity through dexterity, reduced switching time and machine invention. Its extent is limited by the market, which historical water carriage could enlarge.',terms:[{term:'Division of labour',definition:'Specialization can increase productivity.',chapterIds:['ch01']}]}];
const cases=[
 {id:'shorter-candidate',expected:true,candidate:{thesis:'Smith links specialization to higher productivity.',glossary:[{term:'Division of labour',definition:'Specialization can increase productivity.',chapterIds:['ch01']}]}},
 {id:'source-detail-in-candidate',expected:true,candidate:{thesis:'Smith argues that water carriage could historically enlarge markets.',glossary:[]}},
 {id:'invented-obligation',expected:false,candidate:{thesis:'Smith requires every company to give each worker a lifetime assignment and always use water transport.',glossary:[]}},
];
if(!process.argv.includes('--run')){console.log(JSON.stringify({paid:false,cases:cases.map(({id,expected})=>({id,expected})),model:'gpt-5.4-mini'}));process.exit(0);}
const output=process.argv[process.argv.indexOf('--output')+1];if(!process.argv.includes('--output')||!output)throw Error('Choose a new --output report.json path.');
const metrics=[];const model=createBookModelClient({getEnv:name=>({BOOK_REVIEW_MODEL:'gpt-5.4-mini',BOOK_REVIEW_REASONING_EFFORT:'low'}[name]||process.env[name]),onUsage:value=>metrics.push(value)});
const results=await Promise.all(cases.map(async({id,expected,candidate})=>{const report=await model(summaryFidelityInstructions,JSON.stringify({evidence,candidate}),{kind:'review',name:'book_summary_calibration',schema:fidelitySchema});let accepted=true;try{requireFaithfulSection(report);}catch{accepted=false;}return {id,expected,accepted,pass:expected===accepted,report};}));
await writeFile(output,JSON.stringify({model:'gpt-5.4-mini',reviewEffort:'low',results,metrics,limitations:'Three targeted aggregate-review regressions, not a general accuracy estimate.'},null,2),{flag:'wx'});
console.log(JSON.stringify({cases:results.length,passed:results.filter(r=>r.pass).length,results}));if(results.some(r=>!r.pass))process.exitCode=1;
