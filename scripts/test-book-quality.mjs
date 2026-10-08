import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSource} from '../supabase/functions/_shared/book-sections.mjs';
import {sectionClaims,requireFaithfulSection} from '../supabase/functions/_shared/book-fidelity.mjs';
import {distillSection,compileDistillation} from '../supabase/functions/_shared/book-distillation.mjs';
import {isReviewed} from '../supabase/functions/_shared/book-repair.mjs';
import {sourceReviewNotice,previousReviewPath} from '../supabase/functions/_shared/book-review-status.mjs';
import {exportBookFiles} from '../supabase/functions/_shared/book-export.mjs';
import {createHash} from 'node:crypto';

const hash=async bytes=>createHash('sha256').update(bytes).digest('hex');
const source='Example Manual\nSource: public-domain sample\n\nCHAPTER I.\nRepeated work can improve dexterity.\nThis observation does not prescribe permanent roles.';
const chunk=splitSource(source,[{line:4,title:'CHAPTER I.'}]).chunks[0];
const draft={title:'Example Manual',author:'Editor',summary:'Practice can develop dexterity, without requiring permanent roles.',sourceRefs:[{startLine:5,endLine:6}],ideas:[{name:'Practice',explanation:'Repetition can develop dexterity.',whenToUse:'When examining repeated operations.',steps:['Examine opportunities for practice.'],limits:'No permanent assignment rule is given.',applicationBasis:'derived-application',decisionRule:null,sourceRefs:[{startLine:5,endLine:6}]}],antiPatterns:[],workedExamples:[]};
const supported = input => ({supported:true,issues:[],checks:JSON.parse(input).claims.map(claim=>({id:claim.id,supported:true,reason:'Supported by the cited excerpt.'}))});

test('a short title and provenance prefix shares the first real chapter, retaining all citation lines',()=>{
 const result=splitSource(source,[{line:4,title:'CHAPTER I.'}]);
 assert.equal(result.chunks.length,1);assert.equal(result.chunks[0].start,1);assert.equal(result.chunks[0].end,6);assert.equal(result.chunks[0].title,'CHAPTER I.');assert.equal(result.text,source);
 assert.equal(result.chunks[0].sourceChapters[0].startLine,4);
 const large='P'.repeat(3000)+'\nCHAPTER I.\n'+'Evidence. '.repeat(2200);
 assert.ok(splitSource(large,[{line:4,title:'CHAPTER I.'}]).chunks.length>1,'long prefaces remain size bounded');
});

test('review sees each item with only its cited evidence, preserving non-one section offsets',()=>{
 const shifted={...chunk,start:101,end:106,text:chunk.text.replace(/^(\d+):/gm,(_,n)=>`${Number(n)+100}:`)};
 const note=structuredClone(draft);note.sourceRefs=[{startLine:105,endLine:106}];note.ideas[0].sourceRefs=[{startLine:102,endLine:102}];
 const claims=sectionClaims(note,shifted);
 assert.match(claims[0].evidence,/dexterity/);assert.equal(claims[1].evidence,'102: Source: public-domain sample');assert.doesNotMatch(claims[1].evidence,/dexterity/);
});

test('one unchecked, failed, duplicated or invented claim prevents section acceptance',()=>{
 const pass={supported:true,issues:[],checks:[{id:'summary',supported:true,reason:'Source agrees.'},{id:'idea-0',supported:true,reason:'Source agrees.'}]};
 requireFaithfulSection(pass,['summary','idea-0']);
 for(const checks of [pass.checks.slice(0,1),[pass.checks[0],pass.checks[0]],[pass.checks[0],{...pass.checks[1],id:'unknown'}],[pass.checks[0],{...pass.checks[1],supported:false}],[]])assert.throws(()=>requireFaithfulSection({...pass,checks},['summary','idea-0']),/every cited claim/);
 assert.throws(()=>requireFaithfulSection({supported:true,issues:[]},['summary']),/every cited claim/);
});

test('a rejected metadata-grounded hallucination never returns accepted notes',async()=>{
 const bad=structuredClone(draft);bad.ideas[0]={...bad.ideas[0],name:'Commodity value',explanation:'Labour determines exchange value.',sourceRefs:[{startLine:2,endLine:2}]};
 let calls=0;
 const model=async (_,input,options)=>{
  calls++;if(options.kind!=='review')return bad;
  const claims=JSON.parse(input).claims;assert.equal(claims[1].evidence,'2: Source: public-domain sample');
  return {supported:false,issues:['Metadata does not establish commodity value.'],checks:claims.map(claim=>({id:claim.id,supported:claim.id==='summary',reason:'Metadata-only citation.'}))};
 };
 await assert.rejects(distillSection(chunk,0,model),/source check/);assert.equal(calls,2);
});

test('successful notes preserve application basis in all outputs and record actual review coverage',async()=>{
 const model=async (_,input,options)=>{
  if(options.kind!=='review'){
   for(const refs of [options.schema.properties.sourceRefs,options.schema.properties.ideas.items.properties.sourceRefs]){
    assert.equal(refs.items.properties.startLine.minimum,1);assert.equal(refs.items.properties.endLine.maximum,6);assert.equal(refs.maxItems,8);
   }
   return structuredClone(draft);
  }
  const checks=options.schema.properties.checks;assert.equal(checks.minItems,2);assert.equal(checks.maxItems,2);assert.deepEqual(checks.items.properties.id.enum,['summary','idea-0']);
  return supported(input);
 };
 const {note}=await distillSection(chunk,0,model);assert.equal(note.sourceReview.claimCount,2);
 const synth={oneLiner:'Practice can improve dexterity.',readIf:'You are considering repeated work.',thesis:'Practice develops skills without establishing permanent roles.',tags:['practice'],year:null,glossary:[]};
 const compileModel=async (_,input,options)=>options.kind==='review'?{supported:true,issues:[]}:synth;
 const job={id:'example',book_id:'example',source_sha:'a'.repeat(64),source_text:source,title:'Example',author:'Editor'};
 const files=await compileDistillation(job,[note],compileModel,hash);
 for(const name of ['book.md','skill/chapters/ch01.md','skill/patterns.md','skill/cheatsheet.md'])assert.match(files[name],/Suggested application \(inference\)/);
 const report=JSON.parse(files['quality-review.json']);assert.equal(report.sectionsReviewed,1);assert.equal(report.totalSections,1);assert.equal(isReviewed({artifacts:files}),true);
 assert.match(exportBookFiles({...job,artifacts:files})['DOWNLOAD.md'],/each note against its cited source excerpts/);
 const legacy=structuredClone(note);delete legacy.sourceReview;
 const oldFiles=await compileDistillation(job,[legacy],compileModel,hash);assert.equal(isReviewed({artifacts:oldFiles}),false,'old notes are not relabelled as individually checked');
 assert.equal(isReviewed({artifacts:{'quality-review.json':'{"version":2}'}}),false);
});

test('review notices distinguish legacy and partially checked notes; previous versions stay owner scoped',()=>{
 const artifacts=review=>({'quality-review.json':JSON.stringify(review)});
 assert.match(sourceReviewNotice(artifacts({version:2})),/earlier automated/);
 assert.match(sourceReviewNotice(artifacts({version:3,totalSections:2,sectionsReviewed:1})),/notes that have not/);
 assert.match(sourceReviewNotice(artifacts({version:3,totalSections:0,sectionsReviewed:0})),/notes that have not/);
 assert.match(sourceReviewNotice({'quality-review.json':'not JSON'}),/has not received/);
 for(const version of [2,3])assert.equal(previousReviewPath({id:'book',artifacts:artifacts({previousRevisionPath:`owner/book/before-fidelity-v${version}.json`})},'owner'),`owner/book/before-fidelity-v${version}.json`);
 for(const path of ['stranger/book/before-fidelity-v3.json','owner/other/before-fidelity-v3.json','owner/book/../../secret','owner/book/before-fidelity-v4.json'])assert.equal(previousReviewPath({id:'book',artifacts:artifacts({previousRevisionPath:path})},'owner'),null);
});

test('failed claims survive as targeted repair feedback without accepting the draft',async()=>{
 let failure;
 try{await distillSection(chunk,0,async(_,input,options)=>options.kind==='review'?{supported:false,issues:['Do not prescribe lifetime roles.'],checks:[]}:draft);}catch(error){failure=error;}
 assert.equal(failure.sectionIndex,0);assert.deepEqual(failure.feedback.draft,draft);
 const repaired=await distillSection(chunk,0,async(_,input,options)=>{
  if(options.kind==='review')return supported(input);
  const data=JSON.parse(input);assert.deepEqual(data.previousDraft,draft);assert.match(data.reviewFindings.issues[0],/lifetime/);assert.equal(data.source,chunk.text);return draft;
 },undefined,failure.feedback);
 assert.equal(repaired.note.sourceReview.claimCount,2);
});
