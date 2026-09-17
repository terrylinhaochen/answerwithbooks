// Real browser interaction; Auth, account API, and Stripe responses are fixtures.
// No real signup, payment, credit mutation, or provider task is performed.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base=process.env.TEST_BASE_URL || 'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext();const page=await context.newPage();const errors=[], checkouts=[];
page.on('pageerror',err=>errors.push(err.message));
const user={id:'11111111-1111-4111-8111-111111111111',email:'reader@example.com',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{provider:'email'}};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test`;
let signedIn=true, failCheckout=false, pendingCheckout=null, delayCheckout=false;
const run={id:'22222222-2222-4222-8222-222222222222',capability:'github-leads',status:'completed',createdAt:new Date().toISOString(),billing:{mode:'live',chargedCents:500},result:{answer:{title:'Research result',summary:'A reviewable shortlist.',findings:[],limitations:['Public evidence only.']},sources:[]}};
let billing={mode:'metering-only',canTopUp:false,availableCents:0,heldCents:0,spentThisMonthCents:0,runs:[],transactions:[],receipts:[]};
const json=(route,body,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
await context.route('https://*.supabase.co/**',route=>json(route,new URL(route.request().url()).pathname.endsWith('/user')?(signedIn?user:{message:'signed out'}):[],signedIn?200:401));
await context.route('**/account/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/account/billing')return json(route,billing);
  if(path==='/account/billing/checkout') {
    checkouts.push({body:route.request().postDataJSON(),key:route.request().headers()['idempotency-key']});
    if(delayCheckout) {await new Promise(resolve=>pendingCheckout=resolve);return json(route,{url:'https://checkout.stripe.com/c/pay/fixture'});}
    return failCheckout?json(route,{error:{code:'CHECKOUT_UNAVAILABLE'}},503):json(route,{url:'https://checkout.stripe.com/c/pay/fixture'});
  }
  if(path.startsWith('/account/runs/'))return json(route,run);
  return json(route,{access:'approved',keys:[]});
});
await context.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Stripe checkout fixture</h1>'}));
await context.addInitScript(({user,token})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{user,token});
async function ready(){await page.goto(base+'/billing/');await page.locator('[data-open-topup]:not([disabled])').waitFor();}
try {
  for(const width of [1280,390]) {
    await page.setViewportSize({width,height:960});await ready();
    assert.deepEqual(await page.getByRole('tab').allTextContents(),['Balance','Usage','Transactions','Receipts']);
    await page.getByRole('button',{name:'Add credits',exact:true}).click();
    assert.ok(await page.locator('[data-topup-unavailable]').isVisible());
    assert.ok(await page.locator('[data-topup-controls]').isHidden());
    assert.match(await page.locator('[data-topup-dialog]').innerText(),/not available during the private preview/);
    await page.getByRole('button',{name:'Close add credits'}).click();assert.equal(checkouts.length,0);
    await page.getByRole('tab',{name:'Usage',exact:true}).click();assert.ok(await page.locator('[data-billing-panel="usage"]').isVisible());
    assert.match(await page.locator('[data-billing-empty="usage"]').innerText(),/No tasks yet/);
    await page.getByRole('tab',{name:'Balance',exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:`/tmp/awb-billing-preview-${width}.png`,fullPage:true});
  }
  billing={...billing,mode:'live',canTopUp:true,availableCents:2277,heldCents:500,spentThisMonthCents:500,topUps:[1000,2500],policyVersion:'test-policy-v1',policyUrl:'https://answerwithbooks.com/terms/',runs:[run,{...run,id:'33333333-3333-4333-8333-333333333333',capability:'x-discourse',status:'running',billing:{mode:'live',chargedCents:0}}],transactions:[{note:'Credits added',amountCents:2500,createdAt:new Date().toISOString()}],receipts:[{id:'fixture',url:'https://pay.stripe.com/receipts/fixture',amountCents:2500}]};
  await page.setViewportSize({width:1280,height:960});await ready();assert.equal(await page.locator('[data-billing-amount="availableCents"]').innerText(),'$22.77');
  await page.screenshot({path:'/tmp/awb-billing-funded-fixture.png',fullPage:true});
  await page.getByRole('tab',{name:'Usage',exact:true}).click();assert.equal(await page.locator('[data-billing-list="usage"] li').count(),2);
  await page.locator('[data-usage-status]').selectOption('completed');assert.equal(await page.locator('[data-billing-list="usage"] li').count(),1);
  await page.locator('[data-usage-skill]').selectOption('x-discourse');assert.ok(await page.getByText('No tasks match these filters.').isVisible());
  await page.locator('[data-usage-skill]').selectOption('all');await page.getByRole('button',{name:'View result'}).click();await page.getByRole('heading',{name:'Research result'}).waitFor();await page.getByRole('button',{name:'Close task result'}).click();
  await page.reload();await page.locator('[data-billing-list="usage"] li').first().waitFor();assert.ok(await page.locator('[data-billing-panel="usage"]').isVisible());
  await page.getByRole('tab',{name:'Receipts',exact:true}).click();assert.equal(await page.getByRole('link',{name:'Open receipt'}).getAttribute('href'),'https://pay.stripe.com/receipts/fixture');
  await page.getByRole('tab',{name:'Balance',exact:true}).click();await page.getByRole('button',{name:'Add credits',exact:true}).click();assert.ok(await page.locator('[data-topup]').isDisabled());
  await page.locator('[data-credit-consent]').check();failCheckout=true;await page.locator('[data-topup]').click();await page.getByText('The request did not finish. Please refresh and try again.').waitFor();assert.equal(checkouts.length,1);
  failCheckout=false;await page.locator('[data-topup]').click();await page.waitForURL('https://checkout.stripe.com/**');assert.equal(checkouts[0].key,checkouts[1].key);assert.equal(checkouts[0].body.acceptedPolicyVersion,'test-policy-v1');
  billing={...billing,mode:'test',topUps:[2500]};await ready();await page.getByRole('button',{name:'Add test credits',exact:true}).click();assert.match(await page.locator('[data-topup-help]').innerText(),/no real money/i);assert.equal(await page.locator('[data-topup-amount] option').count(),1);
  billing={...billing,paymentReview:true};await ready();await page.getByRole('button',{name:'Add test credits',exact:true}).click();assert.ok(await page.locator('[data-topup-controls]').isHidden());
  billing={...billing,paymentReview:false};await ready();await page.getByRole('button',{name:'Add test credits',exact:true}).click();await page.locator('[data-credit-consent]').check();delayCheckout=true;await page.locator('[data-topup]').click();await page.waitForFunction(()=>document.querySelector('[data-checkout-status]').textContent.includes('Opening'));
  for(let i=0;!pendingCheckout && i<100;i++)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(pendingCheckout,'checkout request reached the fixture');
  signedIn=false;await page.evaluate(()=>localStorage.clear());await page.getByRole('button',{name:'Close add credits'}).click();await page.getByRole('button',{name:'Refresh',exact:true}).click();await page.getByRole('link',{name:'Sign in to view billing'}).waitFor();pendingCheckout();await page.waitForTimeout(200);assert.ok(page.url().startsWith(base));assert.ok(await page.locator('[data-topup-dialog]').isHidden());assert.equal(await page.locator('[data-billing-amount="availableCents"]').innerText(),'—');
  assert.deepEqual(errors,[]);console.log('PASS: billing tabs, desktop/mobile layout, preview gating, usage filters/results, receipt links, consent, idempotent retry, sandbox labels, payment review, and stale-session safety. Auth/API/Stripe are mocked; no payment taken.');
} finally {await browser.close();}
