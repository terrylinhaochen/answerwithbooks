const {chromium}=require('playwright');const assert=require('node:assert/strict');
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const question='How do I find work worth doing?';
const books=[{id:'00000000-0000-4000-8000-000000000001',title:'Shoe Dog',author:'Phil Knight'},{id:'00000000-0000-4000-8000-000000000002',title:'Open',author:'Andre Agassi'}];
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:950}});const requests=[];let mode='ok',release,gate=Promise.resolve();
  await context.route('https://www.googletagmanager.com/**',r=>r.abort());
  await context.route('**/functions/v1/shared-library',r=>r.fulfill({json:{books,nextOffset:null}}));
  await context.route('**/functions/v1/reader-subscription',r=>r.fulfill({json:{active:false,used:0,limit:3}}));
  await context.route('**/functions/v1/reading-guides',async r=>{
   const input=r.request().postDataJSON();requests.push(input);
   if(['list','public-list'].includes(input.action))return r.fulfill({json:{guides:[]}});
   if(input.action==='suggest'){const currentMode=mode;await gate;return currentMode==='error'?r.fulfill({status:503,json:{error:'Please try again.'}}):r.fulfill({json:{books:currentMode==='gap'?[]:books,connection:'Different experiences of finding meaningful work.',gap:'No suitable books found.'}});}
   if(input.action==='create')return r.fulfill({json:{id:'fixture-guide'}});
   if(input.action==='get')return r.fulfill({json:{guide:{id:'fixture-guide',question,status:'composing'},books}});
   throw Error('Unexpected request '+input.action);
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/guides/');await page.locator('#guide-question').fill(question);await page.getByRole('button',{name:'Create guide',exact:true}).click();
  await page.locator('[data-guide-proposal]:visible').waitFor();assert.equal(await page.locator('[data-guide-question]').isVisible(),false);
  assert.equal(await page.locator('[data-guide-login]').isVisible(),false);assert.deepEqual(await page.locator('[data-proposal-books] strong').allTextContents(),books.map(b=>b.title));
  assert.equal(requests.filter(r=>r.action==='suggest').length,1);assert.equal(requests.some(r=>['create','propose','confirm'].includes(r.action)),false);
  await page.locator('[data-edit-guide-books]').click();await page.getByLabel('Open · Andre Agassi',{exact:true}).uncheck();await page.getByRole('button',{name:'Update books',exact:true}).click();
  await page.locator('[data-guide-proposal]:visible').waitFor();assert.equal(await page.locator('[data-proposal-books] li').count(),1);assert.equal(requests.filter(r=>r.action==='suggest').length,1);
  await page.getByLabel('~10 minutes',{exact:true}).check();await page.locator('[data-confirm-guide]').click();await page.waitForURL('**/login/?from=guides');
  const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('awb:guide-book-review')));assert.deepEqual(saved.bookIds,[books[0].id]);assert.equal(saved.length,'short');
  // Simulate returning from sign-in: restored review, no extra recommendation call.
  await context.addInitScript(()=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'owner',aud:'authenticated'}})));
  await page.goto(origin+'/guides/');await page.locator('[data-guide-proposal]:visible').waitFor();assert.equal(await page.getByLabel('~10 minutes',{exact:true}).isChecked(),true);
  assert.equal(await page.locator('[data-proposal-books] li').count(),1);assert.equal(requests.filter(r=>r.action==='suggest').length,1);
  await page.locator('[data-confirm-guide]').click();await page.locator('[data-guide-processing]:visible').waitFor();
  const created=requests.find(r=>r.action==='create');assert.deepEqual(created.bookIds,[books[0].id]);assert.equal(created.length,'short');assert.equal(created.question,question);assert.equal(requests.some(r=>r.action==='propose'),false);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('awb:guide-book-review')),null);
  // Editing a question updates suggestions; failures and gaps stay editable.
  await page.locator('[data-new-question]').click();await page.locator('#guide-modal-question').fill('A different question');mode='gap';await page.getByRole('button',{name:'Update suggestions',exact:true}).click();await page.getByText('No suitable books found.',{exact:true}).waitFor();
  mode='error';await page.getByRole('button',{name:'Update suggestions',exact:true}).click();await page.getByText('Please try again.',{exact:true}).waitFor();
  mode='ok';await page.getByRole('button',{name:'Update suggestions',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();
  await page.locator('[data-edit-suggested-question]').click();await page.locator('#guide-modal-question').fill('Updated question');await page.getByRole('button',{name:'Update suggestions',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();assert.equal(requests.filter(r=>r.action==='suggest').at(-1).question,'Updated question');
  await page.screenshot({path:`/tmp/awb-direct-suggestions-${width}.png`});assert.ok(await page.locator('[data-guide-dialog]').evaluate(e=>e.scrollWidth<=e.clientWidth+1));assert.deepEqual(errors,[]);
  console.log('PASS guest suggestions → review/edit → confirm/sign-in → restored selection → direct creation; gaps/errors and mobile fit',width);await context.close();
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exit(1)});
