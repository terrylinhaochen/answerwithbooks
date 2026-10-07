import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {basename,extname} from 'node:path';

if(process.env.AWB_LIVE_NATIVE_TEST!=='1')throw Error('Set AWB_LIVE_NATIVE_TEST=1 for production acceptance with temporary confirmed users; no emails are sent.');
const paths=process.argv.slice(2);assert.ok(paths.length,'Provide original synthetic PDF/Kindle fixture paths.');
process.loadEnvFile('.env');
const url=process.env.PUBLIC_SUPABASE_URL,anon=process.env.PUBLIC_SUPABASE_ANON_KEY;
assert.equal(new URL(url).hostname,'yozeqanibszoxnowmvsm.supabase.co');
const service=execFileSync('python3',['-c',`import importlib.util,json,urllib.request
s=importlib.util.spec_from_file_location('setup','scripts/sync-auth-email-templates.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=urllib.request.Request('https://api.supabase.com/v1/projects/'+m.PROJECT+'/api-keys',headers={'Authorization':'Bearer '+m.access_token()})
with urllib.request.urlopen(r,timeout=30) as f: keys=json.load(f)
print(next(k['api_key'] for k in keys if k['name']=='service_role'))`],{encoding:'utf8'}).trim();
const opts={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,service,opts),owner=createClient(url,anon,opts),outsider=createClient(url,anon,opts);
const users=[],jobs=[],receipt={emailsSent:0,productionBackend:true,fixtures:[],startedAt:new Date().toISOString()};
const invoke=async(client,endpoint,body)=>{const result=await client.functions.invoke(endpoint,{body});if(result.error)throw Error(`${endpoint} ${body.action}: ${await result.error.context?.text?.()||result.error.message}`);return result.data;};
try {
 const health=await invoke(owner,'book-native',{action:'health'});assert.equal(health.available,true,'Native worker must have passed startup and have a fresh heartbeat.');receipt.health=health;
 for(const client of [owner,outsider]){
  const email=`native-release-${randomUUID()}@example.invalid`,password=randomUUID()+randomUUID();
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);users.push(created.data.user.id);
  assert.ifError((await client.auth.signInWithPassword({email,password})).error);
 }
 for(const path of paths){
  const bytes=await readFile(path),technical=extname(path)==='.pdf';
  const prepared=await invoke(owner,'book-native',{action:'prepare',name:basename(path),size:bytes.length,sha:createHash('sha256').update(bytes).digest('hex'),extractionMode:technical?'technical':'text',options:{mode:'full',depth:'study',purpose:'apply'}});
  assert.ok(prepared.upload);const id=prepared.job.id;jobs.push(id);
  const upload=await owner.storage.from('private-books').uploadToSignedUrl(prepared.upload.path,prepared.upload.token,bytes,{contentType:technical?'application/pdf':'application/octet-stream'});assert.ifError(upload.error);
  await invoke(owner,'book-native',{action:'finalize',id});
  const denied=await outsider.functions.invoke('book-native',{body:{action:'finalize',id}});assert.ok(denied.error);assert.equal(denied.error.context.status,404);
  receipt.fixtures.push({name:basename(path),id,technical,originalBytes:bytes.length});
 }
 const deadline=Date.now()+1800000;let previous='';
 while(Date.now()<deadline){
  const states=await Promise.all(jobs.map(id=>invoke(owner,'book-process',{action:'status',id})));
  const progress=states.map(({job})=>`${job.source_import?.state}/${job.status}/${job.run_state}`).join(', ');
  if(progress!==previous){console.log(progress);previous=progress;}
  for(const {job}of states)assert.notEqual(job.run_state,'failed',job.error||'Native processing failed');
  if(states.every(({job})=>job.status==='ready'))break;
  await new Promise(r=>setTimeout(r,5000));
 }
 for(const fixture of receipt.fixtures){
  const {job}=await invoke(owner,'book-process',{action:'status',id:fixture.id});assert.equal(job.status,'ready','Timed out waiting for native generation');
  const row=await admin.from('book_processing_jobs').select('source_import,source_text,artifacts,cover_path').eq('id',fixture.id).single();assert.ifError(row.error);
  assert.equal(row.data.source_import.state,'complete');
  const text=row.data.source_text,files=row.data.artifacts;assert.ok(text.length>100);assert.ok(files['skill/SKILL.md']);assert.ok(files['book.md']);assert.ok(row.data.cover_path,'Real cover generation must finish');
  if(fixture.technical){
   assert.match(row.data.source_import.metadata.extractor,/docling/);assert.match(text,/\|/);assert.match(text,/```/);assert.match(text,/def squared/);
   assert.match(text.replace(/\\[,;:!]/g,' '),/E\s*=\s*m\s*c\s*(?:\^\s*\{?\s*2|²)/);
   const references=Object.entries(files).filter(([name])=>name.startsWith('skill/chapters/')).map(([,value])=>value).join('\n');assert.match(references,/def squared/);assert.match(references,/\|/);
  }else assert.match(text,/Record predictions/);
  const exported=await invoke(owner,'book-process',{action:'export',id:fixture.id,reviewAccepted:true});assert.ok(exported.files['skill/source.txt']);assert.equal(exported.files['skill/source.txt'],text);
  const metadata=JSON.parse(exported.files['skill/package.json']);assert.equal(metadata.sourceKind,'full-source');assert.equal(metadata.revision,1);
  const denied=await outsider.functions.invoke('book-process',{body:{action:'export',id:fixture.id,reviewAccepted:true}});assert.ok(denied.error);assert.equal(denied.error.context.status,404);
  fixture.extraction=row.data.source_import.metadata.extractor;fixture.sourceCharacters=text.length;fixture.bookSkillCover=true;fixture.sourceBundle=true;fixture.accountIsolation=true;
 }
 receipt.passed=true;receipt.completedAt=new Date().toISOString();await mkdir('docs/verification/native-worker-2026-10-07',{recursive:true});await writeFile('docs/verification/native-worker-2026-10-07/acceptance.json',JSON.stringify(receipt,null,2)+'\n');
 console.log('PASS native original upload → dedicated converter → production generation → book, skill, cover and private source package.');
} finally {
 for(const user of users){
  const rows=await admin.from('book_processing_jobs').select('id').eq('user_id',user);
  for(const job of rows.data||[]){const prefix=user+'/'+job.id;const files=await admin.storage.from('private-books').list(prefix);if(files.data?.length)await admin.storage.from('private-books').remove(files.data.map(file=>prefix+'/'+file.name));}
  assert.ifError((await admin.auth.admin.deleteUser(user)).error);
 }
}
