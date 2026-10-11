// Browser authorization UX with synthetic sessions and mocked approval responses.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const session={access_token:'synthetic-browser-test',refresh_token:'synthetic',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id:'10000000-0000-4000-8000-000000000001',email:'fixture@example.test',email_confirmed_at:new Date().toISOString(),user_metadata:{}}};
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900}}),errors=[],approvals=[];
  await context.addInitScript(s=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(s)),session);
  let rejectApproval=false,releaseApproval;
  await context.route('https://*.supabase.co/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/book-cli-auth')){
    approvals.push(route.request().postDataJSON());
    await new Promise(resolve=>{releaseApproval=resolve;});
    return route.fulfill({status:rejectApproval?400:200,json:rejectApproval?{error:'Connection expired. Ask your agent to start a new connection.'}:{connected:true}});
   }
   return route.fulfill({json:path.endsWith('/auth/v1/user')?session.user:[]});
  });
  const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/connect-agent/');
  await page.locator('[data-agent-account]').filter({hasText:'Signed in as'}).waitFor();
  assert.equal(await page.locator('#agent-code').isVisible(),false);
  assert.equal(await page.locator('[data-agent-start]').isVisible(),true);
  assert.equal(await page.locator('[data-agent-connect]').isDisabled(),true);
  assert.equal(approvals.length,0);
  await page.locator('[data-agent-details] summary').click();
  await page.locator('#agent-code').fill('bad');
  assert.equal(await page.locator('[data-agent-connect]').isDisabled(),true);
  await page.locator('#agent-code').fill('ABCD-1234-EF56');
  assert.equal(await page.locator('[data-agent-connect]').isEnabled(),true);
  assert.equal(await page.locator('[data-agent-start]').isVisible(),false);
  // Same-tab navigation through sign-in preserves the request without exposing the input.
  await page.goto(origin+'/connect-agent/');
  assert.equal(await page.locator('#agent-code').inputValue(),'ABCD-1234-EF56');
  assert.equal(await page.locator('#agent-code').isVisible(),false);
  // An invalid new link cannot silently approve a previously remembered request.
  await page.goto(origin+'/connect-agent/?code=invalid');
  await page.locator('[data-agent-account]').filter({hasText:'Signed in as'}).waitFor();
  assert.equal(await page.locator('[data-agent-connect]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('answerwithbooks-agent-code')),null);
  await page.goto(origin+'/connect-agent/?code=FEDC-9876-5432');
  await page.locator('[data-agent-connect]:enabled').waitFor();
  assert.equal(await page.locator('#agent-code').isVisible(),false);
  assert.equal(approvals.length,0,'opening a link must not approve it');
  await page.screenshot({path:`/private/tmp/awb-connect-${width}.png`});
  await page.locator('[data-agent-connect]').click();
  await page.waitForFunction(()=>document.querySelector('[data-agent-status]').textContent==='Connecting…');
  assert.equal(await page.locator('[data-agent-connect]').isDisabled(),true);
  await page.locator('form[data-connect-agent]').evaluate(form=>form.requestSubmit());
  await page.waitForTimeout(100);
  assert.deepEqual(approvals,[{action:'approve',code:'FEDC-9876-5432'}]);
  releaseApproval();
  await page.getByText('Connected. Return to your agent to use your books.').waitFor();
  assert.equal(await page.locator('[data-agent-connect]').isVisible(),false);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('answerwithbooks-agent-code')),null);
  assert.equal(new URL(page.url()).searchParams.has('code'),false);
  await page.locator('form[data-connect-agent]').evaluate(form=>form.requestSubmit());
  assert.equal(approvals.length,1);
  // An expired request produces guidance and allows a fresh link/manual correction.
  rejectApproval=true;
  await page.goto(origin+'/connect-agent/?code=AAAA-BBBB-CCCC');
  await page.locator('[data-agent-connect]').click();
  for(let i=0;i<100&&approvals.length<2;i++)await page.waitForTimeout(20);
  assert.equal(approvals.length,2);
  releaseApproval();
  await page.getByText('Connection expired. Ask your agent to start a new connection.').waitFor();
  assert.equal(await page.locator('[data-agent-connect]').isEnabled(),true);
  rejectApproval=false;await page.locator('[data-agent-connect]').click();
  for(let i=0;i<100&&approvals.length<3;i++)await page.waitForTimeout(20);
  assert.equal(approvals.length,3);releaseApproval();
  await page.getByText('Connected. Return to your agent to use your books.').waitFor();
  assert.equal(await page.locator('#agent-code').isDisabled(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[]);await context.close();
  console.log(`PASS ${width}px: hidden automatic code, manual fallback, missing/invalid/expired request, explicit approval only, duplicate-submit guard, cleanup.`);
 }
 const context=await browser.newContext(),page=await context.newPage();
 await context.route('https://*.supabase.co/**',route=>route.fulfill({json:[]}));
 await page.goto(origin+'/connect-agent/?code=ABCD-1234-EF56');
 await page.locator('[data-agent-login]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-agent-connect]').isVisible(),false);
 assert.equal(await page.locator('#agent-code').isVisible(),false);
 assert.equal(await page.locator('[data-agent-login]').getAttribute('href'),'/login/?from=agent');
 await page.locator('[data-agent-login]').click();await page.locator('[data-signup-link][href="/signup/?from=agent"]').waitFor();assert.equal(await page.locator('[data-signup-link]').getAttribute('href'),'/signup/?from=agent');
 await context.close();console.log('PASS signed-out request requires sign-in; no automatic connection.');
}catch(error){console.error(error);process.exitCode=1;}finally{
 let timer;await Promise.race([browser.close(),new Promise(resolve=>{timer=setTimeout(resolve,10000);})]);clearTimeout(timer);
}
process.exit(process.exitCode||0);
