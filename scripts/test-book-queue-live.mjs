import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
// Opt-in real-provider acceptance. Creates and removes two temporary accounts and sources.
if(process.env.AWB_LIVE_QUEUE_TEST!=='1')throw new Error('Set AWB_LIVE_QUEUE_TEST=1 to run real book and cover generation.');
const require=createRequire(process.cwd()+'/package.json');
const {chromium}=require('playwright'),{createClient}=require('@supabase/supabase-js'),{unzipSync,strFromU8}=require('fflate');
process.loadEnvFile('.env');
const project='yozeqanibszoxnowmvsm',url=process.env.PUBLIC_SUPABASE_URL,key=process.env.PUBLIC_SUPABASE_ANON_KEY;
assert.equal(new URL(url).hostname,project+'.supabase.co');
const service=execFileSync('python3',['-c',`import importlib.util,json,urllib.request
s=importlib.util.spec_from_file_location('setup','scripts/sync-auth-email-templates.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
r=urllib.request.Request('https://api.supabase.com/v1/projects/'+m.PROJECT+'/api-keys',headers={'Authorization':'Bearer '+m.access_token()})
with urllib.request.urlopen(r,timeout=30) as f:keys=json.load(f)
print(next(k['api_key'] for k in keys if k['name']=='service_role'))`],{encoding:'utf8'}).trim();
const opts={auth:{persistSession:false,autoRefreshToken:false}},admin=createClient(url,service,opts),owner=createClient(url,key,opts),outsider=createClient(url,key,opts);
const users=[],jobs=[],errors=[],receipt={emailsSent:0,source:'Two short original acceptance fixtures',productionWorker:true,origin:process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321'};
let browser,session;
const call=async(client,body)=>{const r=await client.functions.invoke('book-process',{body});assert.equal(r.error,null,`${body.action} request failed`);assert.ok(!r.data.error,r.data.error);return r.data;};
const sources=[{name:'Small Decision Manual.md',text:`# Small Decision Manual\nBy Release Verification\n\nClassify a decision by whether you can reverse it cheaply. When reversal is easy, choose a small trial instead of waiting for certainty. Set a time limit and define the signal that would make you stop. For an irreversible decision, seek more evidence and review its cost before acting. This framework does not make dangerous experiments safe.\n\nBefore a trial, write the expectation and observable result. Record what you chose, why you expected it to help, and when you will review it. Compare the observed result with the original prediction. Change one variable at a time when possible. A log can reveal patterns, but one result is not proof of causation.\n\nReview open decisions once a week. Keep trials that provide useful evidence, stop ones that harm the objective, and name the next question. Judge the process separately from luck. For example, a team can trial a shorter meeting for one week, measure whether decisions are recorded, and restore the old meeting if important issues go unresolved.\n\nThis manual is an original acceptance fixture. It does not offer medical, financial, or legal advice. Safety-critical and irreversible decisions need appropriate expert review. Choose bounded, reversible applications.\n`},{name:'Small Feedback Manual.md',text:`# Small Feedback Manual\nBy Release Verification\n\nWhen learning about a routine, ask the person to describe a recent example. Ask what happened first, what happened next, and what they did when the routine failed. Avoid suggesting your preferred answer. A concrete memory is evidence about that person's experience, not proof about a whole market.\n\nRecord the person's own words separately from your interpretation. Note the context, the problem, and the workaround. If you are unsure what a statement means, ask for a specific example rather than silently converting it into a product requirement. Respect requests not to record or quote a conversation.\n\nAfter several conversations, group similar observations. Keep contradictions visible. A small sample can suggest a next question but cannot establish how common a problem is. For example, three people may report late dinners for very different reasons. Compare the situations before treating them as one need.\n\nChoose a small follow-up that tests the most uncertain assumption. Write down what result would change your mind. Review observations with a colleague to catch unsupported leaps. Stop a test if participation becomes burdensome or the person withdraws permission.\n\nThis short manual is an original acceptance fixture used to verify source processing. Its examples are bounded illustrations, not validated research findings or universal rules.\n`}];
try{
 for(let i=0;i<2;i++){
  const email=`queue-release-${randomUUID()}@example.invalid`,password=randomUUID()+randomUUID();
  const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:'Release verification'}});assert.ifError(r.error);users.push(r.data.user.id);
  const signed=await [owner,outsider][i].auth.signInWithPassword({email,password});assert.ifError(signed.error);if(i===0)session=signed.data.session;
 }
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 let ctx=await browser.newContext({viewport:{width:390,height:1000},permissions:['clipboard-read','clipboard-write']});
 const setup=async(context)=>context.addInitScript(({session,project})=>localStorage.setItem('sb-'+project+'-auth-token',JSON.stringify(session)),{session,project});
 await setup(ctx);let page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(receipt.origin+'/tools/');await page.locator('[data-open-book-request]').first().click();
 await page.getByLabel('Source file').setInputFiles(sources.map(s=>({name:s.name,mimeType:'text/markdown',buffer:Buffer.from(s.text)})));
 await page.locator('[data-upload-submit]').click();
 await page.waitForURL('**/processing/',{timeout:90000});
 await page.locator('[data-queue-list] article').nth(1).waitFor();
 const saved=await owner.from('book_processing_jobs').select('id,source_name');assert.ifError(saved.error);
 for(const source of sources)jobs.push(saved.data.find(j=>j.source_name===source.name)?.id);
 assert.equal(new Set(jobs).size,2);assert.ok(jobs.every(Boolean));receipt.batchUploads=2;
 await ctx.close();console.log('Two real uploads saved from the browser; browser closed. Checking server-only progress.');
 for(const id of jobs){
  const denied=await outsider.functions.invoke('book-process',{body:{action:'status',id}});assert.ok(denied.error);assert.equal(denied.error.context.status,404);
  assert.deepEqual((await outsider.from('book_processing_jobs').select('id').eq('id',id)).data,[]);
  assert.ok((await outsider.storage.from('private-books').download(`${users[0]}/${id}/source`)).error);
 }
 receipt.crossAccountIsolation=true;
 const limit=Date.now()+600000;let last='';let states=[];
 while(Date.now()<limit){
  states=await Promise.all(jobs.map(async id=>(await call(owner,{action:'status',id})).job));
  const progress=states.map(j=>`${j.status} ${j.cursor}/${j.total_sections} ${j.run_state}`).join(' | ');
  if(progress!==last){console.log(progress);last=progress;}
  assert.ok(!states.some(j=>j.run_state==='failed'),states.find(j=>j.run_state==='failed')?.error);
  if(states.every(j=>j.status==='ready'))break;
  await new Promise(r=>setTimeout(r,5000));
 }
 assert.ok(states.every(j=>j.status==='ready'),'Background batch did not finish');receipt.backgroundCompletion=true;
 for(const [i,id] of jobs.entries()){
  const files=(await call(owner,{action:'export',id})).files;
  assert.ok(files['skill/SKILL.md']);assert.ok(files['skill/source.txt'].includes(sources[i].text.split('\n')[0]));assert.ok(files['INSTALL.md']);
  assert.ok(Object.keys(files).some(p=>p.startsWith('skill/chapters/')));
  const image=await owner.storage.from('private-books').download(states[i].cover_path);assert.ifError(image.error);assert.ok(image.data.size>1000);
 }
 receipt.generatedBooksSkillsCovers=2;receipt.citationSourcesBundled=true;
 ctx=await browser.newContext({viewport:{width:390,height:1000},permissions:['clipboard-read','clipboard-write']});await setup(ctx);page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(receipt.origin+'/your-book/?id='+jobs[0]);await page.getByText('Book, skill, and cover ready.',{exact:true}).waitFor({timeout:30000});
 await page.waitForFunction(()=>{const img=document.querySelector('[data-job-cover]');return img?.complete&&img.naturalWidth>0});
 await page.waitForFunction(()=>!document.querySelector('[data-job-copy]').disabled,null,{timeout:90000});
 await page.getByRole('button',{name:'Copy prompt for your AI',exact:true}).click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/BEGIN BOOK ARTIFACT/);
 const dl=page.waitForEvent('download');await page.getByRole('button',{name:'Download book & skill',exact:true}).click();const download=await dl;
 const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const zip=unzipSync(Buffer.concat(chunks));assert.ok(strFromU8(zip['skill/source.txt']).includes('Small Decision Manual'));
 await page.screenshot({path:'/private/tmp/awb-live-batch-ready.png',fullPage:true});receipt.freshBrowserCopyAndZip=true;
 const sha=createHash('sha256').update(sources[0].text).digest('hex');
 const cached=await call(owner,{action:'lookup',sha});assert.equal(cached.reused,true);assert.equal(cached.job.id,jobs[0]);
 const requests=[];page.on('request',r=>{if(r.url().endsWith('/book-process'))requests.push(r.postDataJSON()?.action);if(r.url().includes('/storage/v1/object/upload/'))requests.push('upload');});
 await page.goto(receipt.origin+'/tools/');await page.locator('[data-open-book-request]').first().click();await page.getByLabel('Source file').setInputFiles({name:'Renamed Decision Manual.md',mimeType:'text/markdown',buffer:Buffer.from(sources[0].text)});
 await page.locator('[data-upload-submit]').click();await page.waitForURL('**/your-book/?id='+jobs[0],{timeout:30000});
 assert.deepEqual(requests.filter(a=>!['lookup','status','revisions'].includes(a)),[]);receipt.privateCacheNoUploadOrGeneration=true;
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await ctx.close();
 console.log('PASS live batch after browser closed, two covers and skill packages, isolation, fresh browser copy/ZIP, cache reuse.');
}finally{
 if(browser)await browser.close();
 // Discover partially created jobs too, so a browser failure does not leave work queued.
 if(users[0]){const r=await owner.from('book_processing_jobs').select('id');assert.ifError(r.error);for(const j of r.data||[])if(!jobs.includes(j.id))jobs.push(j.id);}
 for(const id of jobs){
  await owner.functions.invoke('book-process',{body:{action:'pause',id}});
  let removed=false;
  for(let n=0;n<36;n++){const r=await owner.functions.invoke('book-process',{body:{action:'delete',id}});if(!r.error){removed=true;break;}await new Promise(r=>setTimeout(r,5000));}
  assert.ok(removed,'Temporary source cleanup failed');
 }
 for(const id of users){const r=await admin.auth.admin.deleteUser(id);assert.ifError(r.error);}
 receipt.temporaryAccountsAndFilesRemoved=true;receipt.checkedAt=new Date().toISOString();
 await writeFile('/private/tmp/awb-production-queue-receipt.json',JSON.stringify(receipt,null,2)+'\n');
 console.log(JSON.stringify(receipt));
}
