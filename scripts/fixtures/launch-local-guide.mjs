// Deterministic original-source fixture. Tests real CLI/hosted transport, not LLM quality.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function exerciseLocalGuide({cli,env,work,onImported,destination="library"}) {
 const run=(...args)=>JSON.parse(execFileSync(process.execPath,[cli,...args],{env,cwd:work,encoding:'utf8',maxBuffer:12*1024*1024,stdio:['ignore','pipe','pipe']}));
 const files=[join(work,'routine.txt'),join(work,'urgent.txt')],dir=join(work,'guide'),responseFile=join(work,'response.json');
 await writeFile(files[0],'Record the person responsible for each agreed action.\nAgree and record a deadline with that person.\nReview the record at the next meeting.');
 await writeFile(files[1],'For urgent actions, record the responsible person and an agreed deadline.\nReview urgent commitments every day.\nThis daily review rule applies only to urgent actions.');
 const title='Launch commitments guide';
 const prepared=run('local','prepare',...files,'--combine',title,'--output',dir,'--destination',destination);
 assert.equal(prepared.sources,2);assert.equal(prepared.customerChargeCents,0);
 const book={oneLiner:'Record commitments and review them.',readIf:'You need to record agreed actions and urgent follow-up.',thesis:'Record a responsible person and agreed deadline. Review the routine record at the next meeting and urgent commitments daily.',tags:['meeting-notes'],year:null,glossary:[]};
 const stages=[];let finished;
 for(let attempt=0;attempt<18;attempt++){
  const step=run('local','next',dir);
  if(step.status==='ready'){finished=step;break;}
  assert.equal(step.status,'needs_agent_response',JSON.stringify(step.findings||step));const request=step.request;stages.push(request.stage);let value;
  if(request.stage==='book_section'){
   const state=JSON.parse(await readFile(join(dir,'processing-state.json'),'utf8')),chunk=state.chunks[state.notes.length];
   const urgent=request.input.includes('Review urgent commitments every day');
   const sourceRefs=[{startLine:chunk.start,endLine:chunk.end}];
   const summary=urgent?'Record the person and agreed deadline for urgent actions, then review those commitments daily.':'Record the person and agreed deadline for an action, then review the record at the next meeting.';
   value={title:null,author:null,summary,sourceRefs,ideas:[{name:urgent?'Urgent review':'Routine review',explanation:summary,whenToUse:urgent?'Recording urgent actions.':'Recording agreed actions.',decisionRule:null,steps:urgent?['Record the responsible person and agreed deadline.','Review urgent commitments every day.']:['Record the responsible person.','Agree and record the deadline.','Review the record at the next meeting.'],limits:urgent?'The daily review rule applies only to urgent actions.':'No further boundary is specified.',sourceRefs,applicationBasis:'source-instruction'}],antiPatterns:[],workedExamples:[]};
  }else if(request.stage==='book_synthesis')value=book;
  else if(request.stage==='book_synthesis_review')value={supported:true,issues:[]};
  else if(['book_cited_review','book_reader_review'].includes(request.stage))value={supported:true,issues:[],checks:JSON.parse(request.input).claims.map(c=>({id:c.id,supported:true,reason:'Deterministic fixture preserves the stated owner, deadline and review cadence.'}))};
  else if(request.stage==='book_reader'){
   const evidenceIds=JSON.parse(request.input).evidence.map(e=>e.id);
   value={oneLiner:book.oneLiner,readIf:book.readIf,evidenceIds,sections:[{heading:'Record commitments, then review',paragraphs:[{text:'Each agreed action has a recorded responsible person and a deadline agreed with that person. The routine record is reviewed at the next meeting. Urgent commitments instead receive a daily review, and that daily rule is limited to urgent actions.',evidenceIds}]}]};
  }else throw Error('Unexpected fixture stage: '+request.stage);
  await writeFile(responseFile,JSON.stringify(value),{mode:0o600});run('local','respond',dir,'--input',responseFile,'--request',request.id);
 }
 assert.ok(finished,'Local processing did not finish.');if(destination==='device')return {stages,finished};assert.ok(finished.library?.id,'Automatic private sync did not complete.');onImported(finished.library.id,title);
 assert.equal(finished.customerChargeCents,0);
 const list=run('books','--private','--json');assert.equal(list.count,1);assert.equal(list.books[0].title,title);
 const result=run('search','How should I review urgent commitments and agreed deadlines?','--book',finished.library.id,'--json');
 assert.equal(result.status,'needs_reasoning');assert.ok(result.matches.length>0);
 const payload=JSON.parse(await readFile(join(dir,'processing-state.json'),'utf8'));
 assert.equal(payload.source_manifest.length,2);
 assert.ok(stages.includes('book_reader')&&stages.includes('book_reader_review'));
 return {id:finished.library.id,title,stages,sourceCount:2,remoteMatches:result.matches.length,boundary:'Fixture-authored generation/review responses; real extraction, CLI pairing, automatic hosted sync and retrieval; no provider generation calls.'};
}
