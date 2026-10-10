import test from 'node:test';import assert from 'node:assert/strict';import {unzipSync,strFromU8} from 'fflate';
import {uploadCombinedSources} from '../src/lib/book-upload-combined.mjs';
import {finalizeBookSource} from '../supabase/functions/_shared/book-revisions.mjs';
const files=()=>['a.txt','b.txt'].map(name=>new File(['A bounded trial applies only to reversible decisions. Record the prediction before testing and preserve uncertainty.'],name));
const setup=()=>{const calls=[],uploads=[];return {calls,uploads,deps:{call:async body=>{calls.push(body);if(body.action==='health')return {available:true,combined_sources:true};if(body.action==='lookup')return {reused:false};if(body.action==='prepare')return {job:{id:'one-guide',billing_required:true},upload:{path:'original'},textUpload:{path:'text'}};return {};},extract:async file=>({text:await file.text()}),put:async(target,bytes)=>uploads.push({target,bytes})}};};
test('browser combined intake preserves both originals and maps, creates one priced job, and never starts generation',async()=>{
 const {calls,uploads,deps}=setup(),result=await uploadCombinedSources(files(),'Decision guide',{mode:'full'},deps);assert.equal(result.job.id,'one-guide');assert.equal(calls.filter(c=>c.action==='prepare').length,1);assert.deepEqual(calls.map(c=>c.action),['health','lookup','prepare','finalize']);
 const archive=unzipSync(uploads[0].bytes);assert.ok(archive['sources/1-a.txt']);assert.ok(archive['sources/2-b.txt']);assert.equal(strFromU8(archive['collection.txt']),strFromU8(uploads[1].bytes));
 const p=calls.find(c=>c.action==='prepare'),job=finalizeBookSource({id:'test',source_name:p.name,source_sha:p.sha,source_import:{sources:p.extraction.sources}},strFromU8(uploads[1].bytes),p.extraction.headings);assert.equal(job.source_manifest.length,2);assert.equal(job.chunks.length,2);
});
test('invalid, oversized, unsupported or unreadable selections never become a partial guide',async()=>{
 for(const selection of [[new File(['x'],'bad.exe'),files()[0]],[{name:'huge.txt',size:51*1024*1024},files()[0]]]){const x=setup();await assert.rejects(uploadCombinedSources(selection,'Guide',{},x.deps));assert.equal(x.calls.length,0);}
 const x=setup();await assert.rejects(uploadCombinedSources(files(),'Guide',{}, {...x.deps,extract:async()=>null}),/structured/);assert.deepEqual(x.calls.map(c=>c.action),['health']);assert.equal(x.uploads.length,0);
 await assert.rejects(uploadCombinedSources(files(),'',{},x.deps),/title/);
 const old=setup();await assert.rejects(uploadCombinedSources(files(),'Guide',{}, {...old.deps,call:async()=>({available:true})}),/not enabled/);assert.equal(old.uploads.length,0);
});
test('retry produces the same archive identity and reuses a saved guide',async()=>{
 const a=setup(),b=setup();await uploadCombinedSources(files(),'Guide',{},a.deps);await uploadCombinedSources(files(),'Guide',{},b.deps);assert.equal(a.calls[1].sha,b.calls[1].sha);
 const c=setup();await uploadCombinedSources(files(),'Guide',{}, {...c.deps,call:async body=>body.action==='health'?{available:true,combined_sources:true}:{reused:true,job:{id:'saved'}}});assert.equal(c.uploads.length,0);
});
