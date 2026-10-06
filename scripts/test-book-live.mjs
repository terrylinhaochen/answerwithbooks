import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createClient} from '@supabase/supabase-js';
const qa=process.env.AWB_QA_DIR;
if(!qa)throw new Error('Set AWB_QA_DIR to a private directory containing temporary acceptance accounts.');
const accounts=JSON.parse(await fs.readFile(qa+'/accounts.json','utf8'));
const env=Object.fromEntries((await fs.readFile('.env','utf8')).trim().split('\n').map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1)];}));
const clients=accounts.map(()=>createClient(env.PUBLIC_SUPABASE_URL,env.PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}}));
const sessions=[];
for(let i=0;i<2;i++) { const {data,error}=await clients[i].auth.signInWithPassword({email:accounts[i].email,password:accounts[i].password});assert.equal(error,null,'Test account authentication');sessions.push(data.session); }
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[];let id;
try {
 const context=await browser.newContext({viewport:{width:390,height:900},permissions:['clipboard-read','clipboard-write']});
 await context.addInitScript(({session})=>{localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(session));},{session:sessions[0]});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321')+'/books/');await page.locator('[data-open-book-request]').click();
 const source=`# Small Decision Manual\nBy AWB Release Test\n\n## Reversible decisions\nClassify a decision by whether you can reverse it cheaply. When reversal is easy, choose a small trial instead of waiting for certainty. Set a time limit and define the signal that would make you stop. For an irreversible decision, seek more evidence and review its cost before acting. This framework does not make dangerous experiments safe.\n\n## Decision logs\nBefore a trial, write the expectation and observable result. Record what you chose, why you expected it to help, and when you will review it. Compare the observed result with the original prediction. Change one variable at a time when possible. A log can reveal patterns, but one result is not proof of causation.\n\n## A weekly review\nReview open decisions once a week. Keep trials that provide useful evidence, stop ones that harm the objective, and name the next question. Judge the process separately from luck. For example, a team can trial a shorter meeting for one week, measure whether decisions are recorded, and restore the old meeting if important issues go unresolved.\n\n## Limits\nThis manual is an original acceptance fixture. It does not offer medical, financial, or legal advice. Safety-critical and irreversible decisions need appropriate expert review. Choose bounded, reversible applications.\n`;
 await page.getByLabel('Source file').setInputFiles(process.env.AWB_TEST_SOURCE||{name:'Small Decision Manual.md',mimeType:'text/markdown',buffer:Buffer.from(source)});
 await page.getByRole('button',{name:'Review sources'}).click();await page.getByText(/Sources reviewed\./).waitFor({timeout:90000});await page.getByRole('button',{name:'Create books & skills'}).click();
 try { await page.waitForURL(/\/your-book\/\?id=/,{timeout:90000}); } catch { await page.screenshot({path:'/private/tmp/awb-live-upload-error.png'}); throw new Error('Upload did not advance: '+await page.locator('[data-upload-status]').textContent()); }id=new URL(page.url()).searchParams.get('id');await fs.writeFile(qa+'/job.json',JSON.stringify({id,user:accounts[0].id}),{mode:0o600});
 console.log('Authenticated browser upload saved; processing real source with the deployed worker.');
 const other=await clients[1].functions.invoke('book-process',{body:{action:'status',id}});assert.ok(other.error,'Other account cannot read job through worker');
 const rows=await clients[1].from('book_processing_jobs').select('id').eq('id',id);assert.deepEqual(rows.data,[],'Other account cannot read job through RLS');
 const file=await clients[1].storage.from('private-books').download(`${accounts[0].id}/${id}/source`);assert.ok(file.error,'Other account cannot download original source');
 console.log('Cross-account worker, database, and source-file isolation passed.');
 const waitReady=async()=>{
  const end=Date.now()+360000;let last='';
  while(Date.now()<end) {
   const status=await page.locator('[data-job-status]').textContent();if(status!==last){console.log(status);last=status;}
   if(status==='Book, skill, and cover ready.')return;
   if(await page.locator('[data-job-retry]').isVisible())throw new Error('Worker stopped: '+status);
   await new Promise(r=>setTimeout(r,4000));
  }throw new Error('Timed out waiting for real generation.');
 };
 await waitReady();
 await page.reload();await page.getByText('Book, skill, and cover ready.',{exact:true}).waitFor({timeout:15000});
 assert.ok((await page.locator('[data-job-reading]').textContent()).includes('Central argument'));
 await page.locator('[data-job-cover]').waitFor({state:'visible'});await page.waitForFunction(()=>{const img=document.querySelector('[data-job-cover]');return img.complete&&img.naturalWidth>0;},{},{timeout:20000});
 await page.waitForFunction(()=>!document.querySelector('[data-job-copy]').disabled,{},{timeout:90000});assert.match(await page.locator('[data-job-audit]').textContent(),/Skill structure/);
 await page.getByRole('button',{name:'Copy to agent',exact:true}).click();const clipboard=await page.evaluate(()=>navigator.clipboard.readText());assert.match(clipboard,/BEGIN BOOK ARTIFACT/);assert.match(clipboard,/skill\/SKILL.md/);assert.match(clipboard,/patterns.md/);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download book & skill'}).click();await (await download).saveAs('/private/tmp/awb-live-test-bundle.zip');
 await page.screenshot({path:'/private/tmp/awb-live-private-book-390.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 const fresh=createClient(env.PUBLIC_SUPABASE_URL,env.PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});await fresh.auth.setSession({access_token:sessions[0].access_token,refresh_token:sessions[0].refresh_token});
 const readback=await fresh.functions.invoke('book-process',{body:{action:'status',id}});assert.equal(readback.data.job.status,'ready');assert.ok(readback.data.job.artifacts['skill/SKILL.md']);
 console.log('PASS: real authenticated upload → persisted book/skill/cover → fresh-page/fresh-client readback → clipboard → ZIP. Synthetic source; not a full-length quality evaluation.');
 await fs.writeFile(qa+'/sessions.json',JSON.stringify(sessions),{mode:0o600});
}finally {await browser.close();}
