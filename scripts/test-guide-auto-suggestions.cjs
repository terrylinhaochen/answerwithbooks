const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const question='How do I find work worth doing?';
const books=[{id:'00000000-0000-4000-8000-000000000001',title:'Shoe Dog',author:'Phil Knight'},{id:'00000000-0000-4000-8000-000000000002',title:'Open',author:'Andre Agassi'}];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:950}});
  await context.route('https://www.googletagmanager.com/**',r=>r.abort());
  await context.route('**/functions/v1/shared-library',r=>r.fulfill({json:{books,nextOffset:null}}));
  await context.route('**/functions/v1/reader-subscription',r=>r.fulfill({json:{active:false,used:0,limit:3}}));
  const requests=[];let confirms=0;
  await context.route('**/functions/v1/reading-guides',r=>{
   const input=r.request().postDataJSON();
   if(['list','public-list'].includes(input.action))return r.fulfill({json:{guides:[]}});
   if(input.action==='propose'){requests.push(input);return r.fulfill({json:{id:'fixture-guide'}});}
   if(input.action==='get')return r.fulfill({json:{guide:{id:'fixture-guide',question,status:'awaiting_confirmation',proposal:{books,connection:'Two different experiences of finding meaningful work.'}},books}});
   if(input.action==='confirm'){confirms++;return r.fulfill({status:400,json:{error:'Unexpected confirmation'}});}
   throw Error('Unexpected request '+input.action);
  });
  const page=await context.newPage();
  await page.goto(origin+'/guides/');await page.locator('#guide-question').fill(question);await page.getByRole('button',{name:'Create guide',exact:true}).click();
  await page.getByRole('link',{name:'Sign in to get suggested books →',exact:true}).waitFor();
  assert.equal(requests.length,0);assert.match(await page.locator('[data-guide-status]').innerText(),/automatically/);
  assert.equal(await page.locator('[data-add-guide-books]').getAttribute('open'),null);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('awb:guide-question-draft')),question);
  // Mock authentication and model responses: no live guide or model usage.
  await context.addInitScript(()=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'owner',aud:'authenticated'}})));
  await page.reload();assert.equal(await page.locator('#guide-question').inputValue(),question);
  await page.getByRole('button',{name:'Create guide',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();
  assert.equal(requests.length,1);assert.equal(requests[0].question,question);assert.equal('bookIds' in requests[0],false);
  assert.deepEqual(await page.locator('[data-proposal-books] strong').allTextContents(),books.map(b=>b.title));assert.equal(confirms,0);
  // Explicit choices constrain the next request, but switching back removes the constraint.
  await page.locator('[data-edit-guide-books]').click();await page.getByRole('button',{name:'Find passages',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();
  assert.deepEqual(requests[1].bookIds,books.map(b=>b.id));
  await page.locator('[data-edit-guide-books]').click();await page.getByRole('button',{name:'Suggest books for me instead',exact:true}).click();
  assert.equal(await page.locator('[data-selected-source]').isVisible(),false);assert.equal(await page.locator('[data-add-guide-books]').getAttribute('open'),null);
  await page.getByRole('button',{name:'Suggest books',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();
  assert.equal('bookIds' in requests[2],false);assert.equal(confirms,0);
  assert.ok(await page.locator('[data-guide-dialog]').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
  console.log('PASS automatic suggestions, optional manual scope, return to automatic, signed-out draft, and confirmation at',width);
  await context.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1)});
