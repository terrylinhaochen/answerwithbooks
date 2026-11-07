const {chromium}=require('playwright');const assert=require('node:assert/strict');
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const context=await browser.newContext({viewport:{width:1280,height:950}});
 await context.addInitScript(()=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'owner',aud:'authenticated'}})));
 let paymentMode='error',checkoutCalls=0,portalCalls=0;
 let release,gate=new Promise(resolve=>release=resolve),mode='subscription';
 await context.route('**/functions/v1/reader-subscription',r=>{
  const action=r.request().postDataJSON().action;if(action==='status')return r.fulfill({json:{active:false,used:3,limit:3}});
  if(action==='portal'){portalCalls++;return r.fulfill({json:{url:'https://billing.stripe.com/p/session/fixture'}});}
  assert.equal(action,'checkout');checkoutCalls++;
  if(paymentMode==='error')return r.fulfill({status:503,json:{error:'Checkout temporarily unavailable. Try again.'}});
  return r.fulfill({json:{url:paymentMode==='unsafe'?'https://untrusted.invalid/pay':'https://checkout.stripe.com/c/pay/fixture'}});
 });
 await context.route('https://checkout.stripe.com/**',r=>r.fulfill({contentType:'text/html',body:'Fixture checkout — no payment.'}));
 await context.route('https://billing.stripe.com/**',r=>r.fulfill({contentType:'text/html',body:'Fixture portal.'}));
 await context.route('**/functions/v1/reading-guides',async r=>{
  const input=r.request().postDataJSON();if(['list','public-list'].includes(input.action))return r.fulfill({json:{guides:[]}});
  if(input.action==='suggest')return r.fulfill({json:{books:[{id:'00000000-0000-4000-8000-000000000001',title:'Shoe Dog'}],connection:'A starting point.'}});
  if(input.action==='create'){await gate;return mode==='paid'?r.fulfill({status:429,json:{code:'GUIDE_LIMIT',error:'Monthly limit'}}):mode==='subscription'?r.fulfill({status:402,json:{code:'FREE_GUIDE_LIMIT',error:'You have used your 3 free guides this month.'}}):r.fulfill({json:{id:'fixture-guide'}});}
  if(input.action==='get')return r.fulfill({json:{guide:{id:'fixture-guide',question:'How do I find work worth doing?',status:'scanning'}}});
  throw Error('Unexpected request '+input.action);
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/guides/');await page.locator('#guide-question').fill('How do I find work worth doing?');await page.getByRole('button',{name:'Create guide',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();await page.locator('[data-confirm-guide]').click();
 await page.locator('[data-guide-checking]:visible').waitFor();assert.equal(await page.locator('[data-guide-processing]').isVisible(),false);
 await page.waitForTimeout(250);assert.equal(await page.locator('[data-guide-checking]').isVisible(),true);release();
 await page.locator('[data-guide-access]:visible').waitFor();assert.equal(await page.locator('[data-guide-processing]').isVisible(),false);assert.equal(await page.locator('[data-guide-question]').isVisible(),false);
 assert.equal(await page.locator('[data-guide-status]').innerText(),'');assert.equal(await page.locator('[data-guide-plan]').isVisible(),false);assert.match(await page.locator('[data-access-title]').innerText(),/3 free guides/);
 await page.locator('[data-guide-dialog]').screenshot({path:'/private/tmp/awb-guide-plan-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.locator('[data-guide-dialog]').screenshot({path:'/private/tmp/awb-guide-plan-mobile.png'});
 assert.ok(await page.locator('[data-guide-dialog]').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 await page.locator('[data-edit-question]').click();assert.equal(await page.locator('[data-guide-question] textarea').inputValue(),'How do I find work worth doing?');assert.equal(await page.locator('[data-selected-source]').isVisible(),false);
 mode='accepted';gate=new Promise(resolve=>release=resolve);await page.getByRole('button',{name:'Update suggestions',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();await page.locator('[data-confirm-guide]').click();await page.locator('[data-guide-checking]:visible').waitFor();assert.equal(await page.locator('[data-guide-processing]').isVisible(),false);release();
 await page.locator('[data-guide-processing]:visible').waitFor();assert.equal(await page.locator('[data-processing-cover]').isVisible(),true);assert.match(await page.locator('[data-processing-cover]').innerText(),/taking shape/);
 await page.waitForTimeout(250);assert.equal(await page.locator('[data-guide-processing]').isVisible(),true);
 await page.locator('[data-guide-dialog]').screenshot({path:'/private/tmp/awb-guide-processing-mobile.png'});
 // Upgrade creates checkout directly, with visible retry and no Billing-page detour.
 mode='subscription';gate=Promise.resolve();await page.goto(origin+'/guides/');await page.locator('#guide-question').fill('Keep this question through checkout');await page.getByRole('button',{name:'Create guide',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();await page.locator('[data-confirm-guide]').click();await page.locator('[data-guide-access]:visible').waitFor();
 const pay=page.getByRole('button',{name:'Subscribe · $24/month →',exact:true});await pay.click();await page.getByText('Checkout temporarily unavailable. Try again.',{exact:true}).waitFor();assert.equal(await pay.isDisabled(),false);assert.equal(new URL(page.url()).pathname,'/guides/');
 paymentMode='unsafe';await pay.click();await page.getByText('Could not open the payment page. Please try again.',{exact:true}).waitFor();assert.equal(new URL(page.url()).hostname,'127.0.0.1');
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('awb:guide-question-draft')),'Keep this question through checkout');
 paymentMode='valid';await pay.click();await page.waitForURL('https://checkout.stripe.com/**');assert.equal(checkoutCalls,3);
 mode='paid';await page.goto(origin+'/guides/');await page.getByRole('button',{name:'Create guide',exact:true}).click();await page.locator('[data-guide-proposal]:visible').waitFor();await page.locator('[data-confirm-guide]').click();await page.getByRole('button',{name:'Manage subscription →',exact:true}).click();await page.waitForURL('https://billing.stripe.com/**');assert.equal(portalCalls,1);assert.equal(checkoutCalls,3);
 console.log('PASS upgrade opens Stripe checkout directly; failed checkout retries; unsafe redirect rejected; question preserved; paid quota opens management without another checkout. No live payment sessions.');
 assert.deepEqual(errors,[]);console.log('PASS delayed acceptance has no fake processing; rejected request has a single plan card; edit preserves question; accepted processing persists with mobile cover.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
