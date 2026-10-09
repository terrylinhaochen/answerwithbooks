import assert from 'node:assert/strict';import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321',id='20000000-0000-4000-8000-000000000001',uid='10000000-0000-4000-8000-000000000001',quote='30000000-0000-4000-8000-000000000001';
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:1280,height:900}});const errors=[];let accepted=0,quoted=0;const calls=[];
 const session={access_token:'synthetic-browser-test',refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:uid,email:'fixture@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{}}};
 await ctx.addInitScript(s=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(s)),session);
 let job={id,book_id:id,user_id:uid,revision:1,is_current:true,title:'Private source fixture',author:'Fixture author',status:'processing',run_state:'staging',billing_required:true,billing:null,cursor:0,total_sections:3,completed_sections:0,source_import:{state:'complete'},source_manifest:[]};
 await ctx.route('**/yozeqanibszoxnowmvsm.supabase.co/**',async route=>{
  const url=route.request().url();let body={};try{body=route.request().postDataJSON()||{};}catch{}
  let result=[];
  if(url.includes('/auth/v1/user'))result=session.user;
  else if(url.includes('/functions/v1/book-process')){calls.push(body.action);if(body.action==='status')result={job};else if(body.action==='revisions')result={revisions:[job]};else if(body.action==='quote'){quoted++;result={billing:{state:'quoted',quoteId:quote,priceCents:100,expiresAt:new Date(Date.now()+86400000).toISOString()},job};}else if(body.action==='accept-price'){assert.equal(body.quoteId,quote);assert.equal(body.acceptedPriceCents,100);accepted++;job={...job,run_state:'queued',billing:{state:'held',priceCents:100,chargedCents:0}};result={billing:job.billing,job};}else if(body.action==='cancel'){job={...job,run_state:'failed',billing:{state:'released',priceCents:100,chargedCents:0}};result={job};}else result={books:[]};}
  await route.fulfill({json:result});
 });
 const p=await ctx.newPage();p.setDefaultTimeout(15000);p.setDefaultNavigationTimeout(20000);p.on('pageerror',error=>errors.push(error.message));
 console.log('Checking route choice');await p.goto(origin+'/tools/',{waitUntil:'networkidle'});await p.locator('[data-open-book-request]').first().click();
 const dialog=p.locator('#book-upload-dialog');await dialog.locator('[value="agent"]').check();assert.equal(await dialog.locator('form').isVisible(),false);assert.equal(await dialog.locator('[data-local-processing]').isVisible(),true);assert.equal(accepted,0);await p.screenshot({path:'/private/tmp/awb-own-agent-desktop.png'});
 await dialog.locator('[value="hosted"]').check();assert.equal(await dialog.locator('form').isVisible(),true);await dialog.locator('[data-close-book-upload]').click();
 console.log('Checking price approval');await p.goto(origin+'/your-book/?id='+id,{waitUntil:'networkidle'});await p.locator('[data-job-payment]').waitFor({state:'visible'});assert.equal(quoted,0);assert.equal(accepted,0);assert.equal(calls.includes('enqueue'),false);assert.equal(await p.locator('[data-job-pay]').isVisible(),false);
 await p.locator('[data-job-quote]').click();await p.locator('[data-job-pay]').waitFor({state:'visible'});assert.equal(accepted,0);assert.match(await p.locator('[data-job-pay]').innerText(),/Accept \$1\.00/);await p.screenshot({path:'/private/tmp/awb-quote-desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:'/private/tmp/awb-quote-mobile.png',fullPage:true});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 await p.locator('[data-job-pay]').click();await p.locator('[data-job-payment]').waitFor({state:'hidden'});assert.equal(accepted,1);await p.locator('[data-job-cancel]').click();await p.locator('[data-job-payment]').waitFor({state:'visible'});assert.equal(calls.filter(action=>action==='cancel').length,1);
 await p.goto(origin+'/profile/',{waitUntil:'networkidle'});assert.equal(await p.locator('nav[aria-label="Account settings"] a[href="/billing/"]').isVisible(),true);assert.equal(await p.locator('nav[aria-label="Account settings"] a[href="/api-keys/"]').isVisible(),true);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ownAgentChoice:true,hostedChoice:true,noAutomaticPriceAcceptance:true,exactPriceAcceptedOnce:true,accountLinks:true,mobileNoOverflow:true,errors,testBoundary:'Fresh browser build with mocked auth/API responses; PostgreSQL billing behavior tested separately.'}));
}finally{await browser.close();}
