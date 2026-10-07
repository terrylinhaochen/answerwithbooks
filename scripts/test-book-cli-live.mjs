import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';
import {unzipSync,strFromU8} from 'fflate';
import {execFileSync,execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import {mkdtemp,writeFile,readFile,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
if(process.env.AWB_LIVE_CLI_TEST!=='1')throw new Error('Set AWB_LIVE_CLI_TEST=1 for temporary-account production acceptance. No emails are sent.');
process.loadEnvFile('.env');
if(!process.env.AWB_TEST_CLI)throw new Error('Set AWB_TEST_CLI to the built or unpacked CLI executable.');
const cli=resolve(process.env.AWB_TEST_CLI);
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const connectOnly=process.env.AWB_CLI_CONNECT_ONLY==='1';
const url=process.env.PUBLIC_SUPABASE_URL,anon=process.env.PUBLIC_SUPABASE_ANON_KEY,project='yozeqanibszoxnowmvsm';
assert.equal(new URL(url).hostname,project+'.supabase.co');
const service=execFileSync('python3',['-c',`import importlib.util,json,urllib.request
s=importlib.util.spec_from_file_location('setup','scripts/sync-auth-email-templates.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=urllib.request.Request('https://api.supabase.com/v1/projects/'+m.PROJECT+'/api-keys',headers={'Authorization':'Bearer '+m.access_token()})
with urllib.request.urlopen(r,timeout=30) as f:keys=json.load(f)
print(next(k['api_key'] for k in keys if k['name']=='service_role'))`],{encoding:'utf8'}).trim();
const opts={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,service,opts),owner=createClient(url,anon,opts),outsider=createClient(url,anon,opts);
const area=await mkdtemp(join(tmpdir(),'book-cli-live-')),env={...process.env,ANSWER_WITH_BOOKS_CONFIG_DIR:join(area,'session'),ANSWER_WITH_BOOKS_API_URL:''};
const users=[],jobs=[],receipt={emailsSent:0,cliVersion:'0.2.0',origin,productionBackend:true};let browser,loginProcess;
const run=async args=>{try{return await promisify(execFile)(process.execPath,[cli,...args],{env,cwd:area,timeout:240000,maxBuffer:4000000});}catch(e){throw new Error(`CLI ${args[0]} failed: ${e.stderr||e.message}`);}};
const jsonRun=async args=>JSON.parse((await run([...args,'--json'])).stdout);
const originalA='# Small Reversible Decisions\nBy Release Verification\n\n'+`Classify decisions by how easily you can reverse them. For a reversible decision, try a small bounded experiment. Write down your prediction and the signal you will observe before starting. At the end, compare the result to the prediction and decide whether to continue. A single result is evidence, not proof of causation. Keep uncertainty visible.\n\nRecord the reason for your choice in a decision log. Review it weekly to identify patterns, without confusing good luck with a sound process. For a costly irreversible choice, seek stronger evidence and appropriate expert advice.\n\nFor example, a team could try a shorter planning meeting for one week, track whether important decisions were captured, then restore the longer meeting if issues were missed. Use the test to learn rather than to defend the original plan.\n\nThis is an original release-test source, not medical, financial, or legal advice. Its framework applies to bounded reversible work decisions.\n`;
const originalB='# Specific Feedback Conversations\nBy Release Verification\n\n'+`Ask people to describe a recent example of the activity you want to understand. Find out what happened first, what happened next, and what they tried when something went wrong. Questions about specific past behavior are more informative than praise for an imagined product.\n\nKeep the person's words separate from your interpretation. When a statement is unclear, ask for a concrete example. A few conversations suggest hypotheses; they do not establish how common a problem is across a population. Keep contradictions in your notes.\n\nFor example, ask someone to describe the last time they planned dinner. Ask what they did when the plan changed, which workaround they chose, and what it cost them. Avoid steering them toward your meal-planning idea.\n\nChoose a small follow-up that tests the most uncertain assumption. Explain participation clearly and respect requests not to record a conversation. This original release-test source is a limited learning framework, not a substitute for rigorous research.\n`;
try{
 let session;
 for(const client of [owner,outsider]){
  const email=`cli-release-${randomUUID()}@example.invalid`,password=randomUUID()+randomUUID();
  const created=await admin.auth.admin.createUser({email,password,email_confirm:true});assert.ifError(created.error);users.push(created.data.user.id);
  const signed=await client.auth.signInWithPassword({email,password});assert.ifError(signed.error);if(client===owner)session=signed.data.session;
 }
 loginProcess=spawn(process.execPath,[cli,'login','--no-browser'],{env,cwd:area,stdio:['ignore','pipe','pipe']});
 let stdout='',stderr='';loginProcess.stdout.on('data',chunk=>stdout+=chunk);loginProcess.stderr.on('data',chunk=>stderr+=chunk);
 const loginDone=new Promise((resolve,reject)=>{loginProcess.on('exit',code=>code===0?resolve():reject(Error('CLI login failed: '+stderr)));loginProcess.on('error',reject);});loginDone.catch(()=>{});
 let code;const deadline=Date.now()+30000;while(Date.now()<deadline&&!code){code=stdout.match(/Code: ([A-F0-9-]+)/)?.[1];if(!code)await new Promise(r=>setTimeout(r,250));}
 assert.ok(code,'CLI did not print a pairing code');
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:390,height:900}});await context.addInitScript(({session,project})=>localStorage.setItem('sb-'+project+'-auth-token',JSON.stringify(session)),{session,project});
 const page=await context.newPage();await page.goto(origin+'/connect-agent/?code='+code);
 await page.getByRole('button',{name:'Connect agent',exact:true}).click();await page.getByText('Connected. Return to your agent to use your books.').waitFor({timeout:30000});await loginDone;loginProcess=null;receipt.browserPairing=true;
 const stored=JSON.parse(await readFile(join(area,'session/session.json'),'utf8'));
 assert.equal((await jsonRun(['books','--private'])).count,0);
 if(!connectOnly){
 const sources=[['Decision Trial Manual.md',originalA],['Feedback Conversation Manual.md',originalB]];
 for(const [name,text] of sources)await writeFile(join(area,name),text);
 const uploaded=await jsonRun(['upload',...sources.map(([name])=>join(area,name))]);assert.equal(uploaded.results.length,2);
 for(const result of uploaded.results){assert.equal(result.status,'queued');jobs.push(result.id);}assert.equal(new Set(jobs).size,2);receipt.separateBatch=2;
 console.log('PASS real CLI/browser pairing and two separate staged uploads; waiting for server-only processing.');
 await browser.close();browser=null;
 for(const id of jobs){const denied=await outsider.functions.invoke('book-process',{body:{action:'status',id}});assert.ok(denied.error);assert.equal(denied.error.context.status,404);}
 receipt.accountIsolation=true;
 const cached=await jsonRun(['upload',join(area,sources[0][0])]);assert.equal(cached.results[0].id,jobs[0]);assert.equal(cached.results[0].reused,true);receipt.cacheReuse=true;
 const finishBy=Date.now()+600000;let previous='';let states=[];
 while(Date.now()<finishBy){
  states=(await jsonRun(['status'])).books.filter(book=>jobs.includes(book.id));
  const progress=states.map(book=>`${book.status}/${book.run_state}`).join(', ');if(progress!==previous){console.log(progress);previous=progress;}
  assert.ok(!states.some(book=>book.run_state==='failed'),'A processing job failed');
  if(states.length===2&&states.every(book=>book.status==='ready'))break;
  await new Promise(r=>setTimeout(r,5000));
 }
 assert.ok(states.every(book=>book.status==='ready'),'Timed out waiting for generation');receipt.backgroundCompletion=true;
 const asked=await jsonRun(['ask','How should I test a reversible decision?','--book',jobs[0]]);assert.equal(asked.status,'book_selected');assert.ok(asked.objects.books[0].files['skill/SKILL.md']);assert.ok(asked.objects.books[0].citations.length);receipt.privateBookEvidence=true;
 const archive=join(area,'book.zip');await run(['download',jobs[0],'--output',archive]);const files=unzipSync(new Uint8Array(await readFile(archive)));assert.ok(files['skill/SKILL.md']);assert.match(strFromU8(files['skill/source.txt']),/Small Reversible Decisions/);receipt.citationBundle=true;
 }
 await run(['logout']);const revoked=await fetch(url+'/functions/v1/book-process',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+stored.token},body:JSON.stringify({action:'list'})});assert.equal(revoked.status,401);receipt.revocation=true;
 await mkdir('docs/verification/agent-commands-2026-10-07',{recursive:true});await writeFile(connectOnly?join(tmpdir(),'answerwithbooks-production-connection.json'):'docs/verification/agent-commands-2026-10-07/acceptance.json',JSON.stringify({...receipt,passed:true},null,2)+'\n');
 console.log(connectOnly?'PASS published CLI and production website pairing, private catalog, and revocation.':'PASS live CLI books/upload/status/ask/download/logout, real generated artifacts, cache and account isolation.');
}finally{
 loginProcess?.kill();await browser?.close();
 // Only temporary test users and their objects are removed.
 for(const user of users){const rows=await admin.from('book_processing_jobs').select('id').eq('user_id',user);for(const job of rows.data||[]){const prefix=user+'/'+job.id;const files=await admin.storage.from('private-books').list(prefix);if(files.data?.length)await admin.storage.from('private-books').remove(files.data.map(file=>prefix+'/'+file.name));}await admin.auth.admin.deleteUser(user);}
 await rm(area,{recursive:true,force:true});
}
