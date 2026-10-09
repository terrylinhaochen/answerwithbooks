// Opt-in Stripe TEST acceptance. Session arrives on stdin and is never persisted.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
if(process.env.AWB_STRIPE_TEST_ACCEPTANCE!=='true')throw Error('Explicit Stripe test acceptance opt-in required.');
let input='';for await(const chunk of process.stdin)input+=chunk;
const {session,api,origin}=JSON.parse(input);
assert.equal(api,'https://crowdlisten-skills-calls-test.vercel.app');assert.equal(origin,'http://127.0.0.1:4321');
const request=async path=>{const r=await fetch(api+path,{headers:{Authorization:'Bearer '+session.access_token}});assert.equal(r.status,200);return r.json();};
const before=await request('/account/billing');assert.equal(before.mode,'test');assert.equal(before.canTopUp,true);assert.equal(before.balanceCents,0);
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
 const context=await browser.newContext();await context.addInitScript(s=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(s)),session);
 const p=await context.newPage();p.setDefaultTimeout(20000);
 await p.goto(origin+'/billing/',{waitUntil:'networkidle'});await p.locator('[data-open-topup]:enabled').waitFor();
 assert.match(await p.locator('[data-billing-status]').innerText(),/Test mode/);
 await p.locator('[data-open-topup]').click();await p.locator('[data-topup-amount]').selectOption('100');
 assert.equal(await p.locator('[data-topup]').isDisabled(),true);await p.locator('[data-credit-consent]').check();
 await p.locator('[data-topup]').click();await p.waitForURL('https://checkout.stripe.com/**');
 await p.locator('input[name="email"]').fill('awb-checkout-fixture@example.com');
 console.log('Real Stripe test checkout opened; waiting for test card form.');
 // Stripe can require human verification. A timeout here is a failed acceptance, never a pass.
 await p.getByText('Card',{exact:true}).click();
 await p.locator('input[name="cardNumber"]').fill('4242424242424242');
 await p.locator('input[name="cardExpiry"]').fill('12/30');await p.locator('input[name="cardCvc"]').fill('123');
 await p.locator('input[name="billingName"]').fill('AWB Test Checkout');
 await p.locator('select[name="billingCountry"]').selectOption('US');
 await p.locator('input[name="billingAddressLine1"]').fill('123 Test Street');
 await p.locator('input[name="billingLocality"]').fill('San Francisco');
 await p.locator('input[name="billingPostalCode"]').fill('94105');
 const region=p.locator('[name="billingAdministrativeArea"]');if(await region.evaluate(e=>e.tagName)==='SELECT')await region.selectOption('CA');else await region.fill('CA');
 await p.locator('button[type="submit"]').click();await p.waitForURL(origin+'/billing/**',{timeout:60000});
 let after;for(let i=0;i<15;i++){after=await request('/account/billing');if(after.balanceCents===100)break;await new Promise(r=>setTimeout(r,2000));}
 assert.equal(after.balanceCents,100,'Stripe-confirmed test purchase reaches the shared wallet');assert.equal(after.receipts.length,1);
 await p.reload({waitUntil:'networkidle'});assert.equal(await p.locator('[data-billing-amount="availableCents"]').innerText(),'$1.00');
 const fresh=await browser.newContext();await fresh.addInitScript(s=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(s)),session);const readback=await fresh.newPage();await readback.goto(origin+'/billing/',{waitUntil:'networkidle'});assert.equal(await readback.locator('[data-billing-amount="availableCents"]').innerText(),'$1.00');
 console.log(JSON.stringify({mode:'test',realStripeCheckout:true,confirmedWalletCents:after.balanceCents,receipts:after.receipts.length,freshBrowserReadback:true,realMoneyCollected:0}));
}finally{await browser.close();}
