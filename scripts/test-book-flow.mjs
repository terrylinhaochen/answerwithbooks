import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm,readdir} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {prepareLocal,nextLocal,respondLocal,installLocal} from '../../core/src/local-processing.js';
import {localImportPayload} from '../../core/src/local-publish.js';
import {uploadFiles,extractSource} from '../../core/src/upload.js';
import {finalizeBookSource} from '../supabase/functions/_shared/book-revisions.mjs';
import {distillSection,compileDistillation} from '../supabase/functions/_shared/book-distillation.mjs';
import {exportBookFiles} from '../supabase/functions/_shared/book-export.mjs';
import {prepareAgentImport} from '../supabase/functions/_shared/book-agent-import.mjs';
import {libraryEvidence} from '../supabase/functions/_shared/book-library.mjs';
import {collectionSources} from '../supabase/functions/_shared/book-collections.mjs';
const hash=x=>createHash('sha256').update(x).digest('hex');
const sources=[['a.txt','Policy A. Scope: routine scheduling.\nReview commitments every day.\nThis policy does not apply to emergency response.'],['b.md','Policy B. Scope: routine scheduling.\nReview commitments once a week.\nThis policy does not apply to emergency response.']];
const synthesis={oneLiner:'Compare conflicting commitment review schedules.',readIf:'You need a review cadence for routine scheduling.',thesis:'Policy A requires daily review; Policy B requires weekly review. Neither covers emergency response. The sources disagree on cadence.',tags:['commitments'],year:null,glossary:[]};
function response(system,input,options){
 if(options.name==='book_section'){
  const daily=input.includes('every day'),line=Number(input.split('\n').find(l=>l.includes('Review commitments')).split(':')[0]),scope=line+1,rule=daily?'Review commitments every day.':'Review commitments once a week.';
  return {title:'Should not replace collection title',author:'Single author',summary:rule+' This policy excludes emergency response.',sourceRefs:[{startLine:line,endLine:scope}],ideas:[{name:daily?'Daily commitments':'Weekly commitments',explanation:rule,whenToUse:'Routine scheduling under this source policy.',decisionRule:null,steps:[rule],limits:'Does not apply to emergency response.',sourceRefs:[{startLine:line,endLine:scope}],applicationBasis:'source-instruction'}],antiPatterns:[],workedExamples:[]};
 }
 if(options.name==='book_cited_review')return {supported:true,issues:[],checks:JSON.parse(input).claims.map(c=>({id:c.id,supported:true,reason:'The cited fixture explicitly states this rule and limit.'}))};
 if(options.name==='book_synthesis')return synthesis;
 if(options.name==='book_synthesis_review')return {supported:true,issues:[]};
 throw Error('Unexpected model stage '+options.name);
}
async function setup(t){const root=await mkdtemp(join(tmpdir(),'awb-flow-'));t.after(()=>rm(root,{force:true,recursive:true}));for(const [name,text]of sources)await writeFile(join(root,name),text);return {root,paths:sources.map(([name])=>join(root,name))};}
test('two sources -> one guide: local and managed use identical prompts, evidence, review and artifacts; import preserves retrieval evidence',async t=>{
 const {root,paths}=await setup(t),dir=join(root,'work'),extract=async bytes=>({text:bytes.toString(),headings:[]});
 await prepareLocal(paths,{output:dir,combine:'Commitments guide'},{extract});const localCalls=[];
 for(let i=0;i<12;i++){const step=await nextLocal(dir);if(step.status==='ready')break;assert.equal(step.status,'needs_agent_response');const r=step.request;localCalls.push([r.instructions,r.input,r.stage]);const file=join(root,'reply.json');await writeFile(file,JSON.stringify(response(r.instructions,r.input,{name:r.stage})));await respondLocal(dir,{input:file,request:r.id});}
 const local=JSON.parse(await readFile(join(dir,'processing-state.json'),'utf8'));assert.equal(local.status,'ready');assert.equal(local.title,'Commitments guide');assert.equal(local.notes.length,2);assert.equal(local.source_manifest.length,2);assert.equal((await readdir(join(dir,'originals'))).length,2);
 const uploads=[],calls=[];await uploadFiles(paths,{combine:'Commitments guide'},{extract,put:async(target,bytes)=>uploads.push({target,bytes}),call:async body=>{calls.push(body);return body.action==='lookup'?{reused:false}:body.action==='prepare'?{job:{id:'managed',billing_required:true},upload:{path:'original'},textUpload:{path:'text'}}:{};}});
 const prepared=calls.find(c=>c.action==='prepare');assert.ok(prepared);const meta={id:local.id,book_id:local.book_id,source_name:prepared.name,source_sha:local.source_sha,source_import:{sources:prepared.extraction.sources},title:local.title,author:local.author,options:local.options};
 const managed={...meta,...finalizeBookSource(meta,uploads.find(u=>u.target.path==='text').bytes.toString(),prepared.extraction.headings)};
 assert.deepEqual(managed.chunks,local.chunks);assert.deepEqual(managed.source_manifest,local.source_manifest);
 const managedCalls=[],model=async(s,i,o)=>{managedCalls.push([s,i,o.name]);return response(s,i,o);};managed.notes=[];
 for(const [i,chunk]of managed.chunks.entries())managed.notes.push((await distillSection(chunk,i,model,managed.options)).note);
 managed.artifacts=await compileDistillation(managed,managed.notes,model,async x=>hash(x));assert.deepEqual(managedCalls,localCalls);
 const files=exportBookFiles(managed);for(const name of ['book.md','skill/SKILL.md','skill/glossary.md','skill/patterns.md','skill/cheatsheet.md','skill/source-map.json'])assert.equal(files[name],await readFile(join(dir,'package',name),'utf8'),name);
 assert.match(files['book.md'],/sources disagree/);assert.match(files['skill/SKILL.md'],/chapters\//);
 const payload=await localImportPayload(dir),imported=await prepareAgentImport(payload);assert.equal(imported.job.source_manifest.length,2);
 assert.equal(libraryEvidence({note:imported.job.notes[1]}).sources[0].name,'b.md');
 const exported=exportBookFiles(imported.job);assert.equal(JSON.parse(exported['skill/source-map.json']).sources.length,2);
 for(const note of imported.job.notes){const ref=note.ideas[0].sourceRefs[0],text=imported.job.source_text.split('\n').slice(ref.startLine-1,ref.endLine).join('\n');assert.match(text,/Review commitments/);assert.ok(imported.job.source_manifest.some(s=>ref.startLine>=s.startLine&&ref.endLine<=s.endLine));}
 const installed=await installLocal(dir,{}, {skillsDir:join(root,'skills'),cacheRoot:join(root,'cache')});assert.equal(installed.status,'installed');assert.equal((await readdir(installed.path,{recursive:true})).filter(p=>p.endsWith('SKILL.md')).length,1);
 await writeFile('/private/tmp/awb-agent-collection-fixture.json',JSON.stringify(imported));
});
test('collection preserves normalized line coordinates for long unicode lines and rejects tampered/overlapping source maps',async t=>{
 const {root,paths}=await setup(t);await writeFile(paths[0],'😀'.repeat(1200)+'\r\n'+sources[0][1]);
 await prepareLocal(paths,{output:join(root,'work'),combine:'Long lines'},{extract:async b=>({text:b.toString()})});const state=JSON.parse(await readFile(join(root,'work/processing-state.json'),'utf8'));
 for(const s of state.source_manifest)assert.equal(state.source_text.split('\n')[s.startLine-1],`# SOURCE: ${s.name}`);
 const declared=state.source_import.sources;assert.equal(collectionSources(declared,state.source_text).length,2);
 assert.throws(()=>collectionSources([{...declared[0],startLine:1},declared[1]],state.source_text),/coordinates/);
 assert.throws(()=>collectionSources([declared[0],{...declared[1],startLine:declared[0].endLine}],state.source_text),/range/);
 await assert.rejects(prepareLocal(paths,{output:join(root,'ambiguous')},{extract:async b=>({text:b.toString()})}),/--combine/);
});
test('real text extraction preserves both selected fixture sources',async t=>{
 const {paths}=await setup(t);for(const path of paths){const bytes=await readFile(path);const report=await extractSource(bytes,path.endsWith('.md')?'.md':'.txt');assert.match(report.text,/Review commitments/);assert.match(report.text,/emergency response/);}
});
