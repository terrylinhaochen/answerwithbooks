const {chromium}=require('playwright');const assert=require('node:assert/strict');
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4325';
const books=[{id:'00000000-0000-4000-8000-000000000001',title:'Shoe Dog',author:'Phil Knight'}];
const question='How do I find work worth doing?';
const user={id:'00000000-0000-4000-8000-000000000002',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',email_confirmed_at:'2026-01-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
const token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.fixture';
const session={access_token:token,refresh_token:'fixture',token_type:'bearer',expires_in:3600,user};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const method of ['email','signup','password']){
  const context=await browser.newContext();let callback;const actions=[];
  await context.route('https://www.googletagmanager.com/**',r=>r.abort());
  await context.route('**/auth/v1/**',r=>{const u=new URL(r.request().url());
   if(u.pathname.endsWith('/user'))return r.fulfill({json:user});
   if(u.pathname.endsWith('/otp')||u.pathname.endsWith('/signup')){callback=u.searchParams.get('redirect_to');return r.fulfill({json:u.pathname.endsWith('/signup')?{user,session:null}:{}});}
   if(u.pathname.endsWith('/token'))return r.fulfill({json:session});
   throw Error('Unexpected auth '+u.pathname);
  });
  await context.route('**/functions/v1/shared-library',r=>r.fulfill({json:{books,nextOffset:null}}));
  await context.route('**/functions/v1/reader-subscription',r=>r.fulfill({json:{active:false,limit:3,used:0}}));
  await context.route('**/functions/v1/reading-guides',r=>{const a=r.request().postDataJSON().action;actions.push(a);if(['list','public-list'].includes(a))return r.fulfill({json:{guides:[]}});if(a==='suggest')return r.fulfill({json:{books,connection:'A life worth exploring.'}});throw Error('Unexpected guide action '+a)});
  const page=await context.newPage();const errors=[];context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/guides/');await page.locator('#guide-question').fill(question);await page.getByRole('button',{name:'Create guide',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();await page.getByLabel('~10 minutes',{exact:true}).check();await page.locator('[data-confirm-guide]').click();await page.waitForURL('**/login/?from=guides&resume=*');
  const resume=new URL(page.url()).searchParams.get('resume');assert.ok(resume);
  if(method==='signup'){await page.locator('[data-signup-link]').click();await page.waitForURL('**/signup/?from=guides&resume=*');await page.locator('#email').fill(user.email);await page.locator('#password').fill('fixture-not-a-real-password');await page.locator('#submit-btn').click();}
  else{await page.locator('#email').fill(user.email);if(method==='password'){await page.locator('[data-login-mode]').click();await page.locator('#password').fill('fixture-not-a-real-password');}await page.locator('#submit-btn').click();}
  let returned=page;
  if(method!=='password'){
   await page.waitForFunction(()=>document.querySelector('#form-message')?.textContent?.includes('link')||document.querySelector('#form-message')?.textContent?.includes('Almost there'));
   assert.ok(callback);assert.equal(new URL(callback).searchParams.get('resume'),resume);
   // No opener and no sessionStorage: just like opening an email in a new tab.
   returned=await context.newPage();await returned.goto(origin+'/privacy/');assert.equal(await returned.evaluate(()=>sessionStorage.getItem('awb:guide-book-review')),null);
   await returned.goto(callback+'#'+new URLSearchParams({...session,user:undefined,type:'magiclink'}));
  }
  await returned.waitForURL(`**/guides/?resume=${resume}`);await returned.locator('[data-guide-proposal]:visible').waitFor();
  assert.equal(await returned.locator('[data-proposal-question]').innerText(),question);assert.deepEqual(await returned.locator('[data-proposal-books] strong').allTextContents(),['Shoe Dog']);assert.equal(await returned.getByLabel('~10 minutes',{exact:true}).isChecked(),true);
  assert.equal(actions.filter(a=>a==='suggest').length,1);assert.equal(actions.some(a=>['create','propose','confirm'].includes(a)),false);assert.deepEqual(errors,[]);
  await returned.locator('[data-close-guide]').click();await returned.waitForURL(url=>!url.searchParams.has('resume'));
  assert.equal(new URL(returned.url()).searchParams.has('resume'),false,'closing consumes the resume URL');
  if(method==='password')await returned.setViewportSize({width:390,height:844});
  for(const path of ['/','/books/','/books/read/?id='+books[0].id,'/tools/','/guides/']){
   await returned.goto(origin+path);
   if(!await returned.locator('[data-guide-composer]').count())continue;
   await returned.waitForFunction(()=>document.querySelector('[data-guide-plan]')?.textContent?.includes('remaining')).catch(async error=>{console.log({url:returned.url(),plan:await returned.locator('[data-guide-plan]').allTextContents(),errors});throw error;});
   assert.equal(await returned.locator('[data-guide-dialog]').evaluate(dialog=>dialog.open),false,`ordinary navigation to ${path} must not reopen the saved draft`);
  }
  const resumeLink=returned.locator('[data-saved-guides] a').filter({hasText:'Resume book selection'});
  assert.equal(await resumeLink.count(),1,'draft remains available in Your Guides');await resumeLink.click();
  await returned.locator('[data-guide-proposal]:visible').waitFor();
  assert.equal(await returned.locator('[data-proposal-question]').innerText(),question);
  await returned.locator('[data-close-guide]').click();await returned.waitForURL(url=>!url.searchParams.has('resume'));await returned.reload();
  await returned.waitForFunction(()=>document.querySelector('[data-guide-plan]')?.textContent?.includes('remaining')).catch(async error=>{console.log({url:returned.url(),plan:await returned.locator('[data-guide-plan]').allTextContents(),errors});throw error;});
  assert.equal(await returned.locator('[data-guide-dialog]').evaluate(dialog=>dialog.open),false,'refresh after closing stays closed');
  await returned.getByRole('button',{name:'Discard draft',exact:true}).click();
  await returned.waitForFunction(()=>!document.querySelector('[data-saved-guides]')?.textContent?.includes('Resume book selection'));
  assert.equal(await returned.evaluate(()=>localStorage.getItem('awb:pending-guide-review')),null);
  assert.equal(actions.some(a=>['create','propose','confirm'].includes(a)),false);assert.deepEqual(errors,[]);
  console.log('PASS '+method+' auth return, close, cross-page navigation, manual resume and discard; no guide created');await context.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
