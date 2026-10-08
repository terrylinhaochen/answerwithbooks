// Public/synthetic retrieval fixture; one bounded embedding call. Dry run by default.
import {readFileSync,writeFileSync} from 'node:fs';
import {parseArgs} from 'node:util';
import {embedBookText,embeddingModel,embeddingDimensions} from '../supabase/functions/_shared/book-embedding.mjs';
const {values}=parseArgs({options:{notes:{type:'string'},output:{type:'string'},run:{type:'boolean',default:false}}});
if(!values.notes)throw Error('Use --notes ACCEPTED_NOTES_JSON [--output NEW_JSON --run].');
const notes=JSON.parse(readFileSync(values.notes,'utf8'));
if(!Array.isArray(notes)||notes.length!==3)throw Error('Use the three public-domain Smith chapter notes.');
const corpus=notes.map(note=>({label:note.id,note,body:('The Wealth of Nations\nAdam Smith\n'+(note.title||'')+'\n'+note.summary+'\n'+JSON.stringify(note.ideas)).slice(0,6000)}));
const distractions=[['cooking','Adjust oven heat and hydration to bake bread. Gluten development, fermentation and dough shaping.'],['astronomy','Select telescopes for planets. Aperture and atmospheric seeing determine the detail visible on Jupiter.'],['interviews','Ask customers about past purchases and actual behavior instead of hypothetical demand or flattering opinions.'],['habits','Build a daily practice by choosing a cue and reducing friction. Repeat a small behavior in a stable context.'],['gardening','Water tomato plants deeply and monitor soil moisture. Prune for sunlight and air circulation.'],['music','Train pitch recognition and rhythm through deliberate scales and listening exercises.']];
for(const [label,body] of distractions)corpus.push({label,note:{id:'ch01',summary:body,sourceRefs:[{startLine:1,endLine:1}],ideas:[]},body});
const queries=[
 {question:'When is there enough demand to justify dedicated specialist roles?',expected:'ch03'},
 {question:'Why does repeating one stage of production raise throughput?',expected:'ch01'},
 {question:'Are occupational differences in ability mostly inborn or learned?',expected:'ch02'},
 {question:'市场规模如何限制专业化分工？',expected:'ch03'},
 {question:'How do I choose a telescope for Jupiter?',expected:'astronomy'},
 {question:'What made the difference between a philosopher and a porter?',expected:'ch02'},
];
console.log(JSON.stringify({mode:values.run?'live':'dry-run',model:embeddingModel,dimensions:embeddingDimensions,texts:corpus.length+queries.length,maxCalls:1}));
if(values.run){
 if(!values.output)throw Error('--run requires --output NEW_JSON.');
 let usage=null;const started=performance.now();
 const vectors=await embedBookText([...corpus.map(c=>c.body),...queries.map(q=>q.question)],{key:process.env.OPENAI_API_KEY,fetchImpl:async(...args)=>{const response=await fetch(...args);if(response.ok)usage=(await response.clone().json()).usage;return response;}});
 const result={model:embeddingModel,dimensions:embeddingDimensions,elapsedMs:performance.now()-started,usage,corpus:corpus.map((row,i)=>({...row,vector:vectors[i]})),queries:queries.map((row,i)=>({...row,vector:vectors[corpus.length+i]}))};
 writeFileSync(values.output,JSON.stringify(result),{flag:'wx',mode:0o600});console.log(JSON.stringify({elapsedMs:result.elapsedMs,usage}));
}
