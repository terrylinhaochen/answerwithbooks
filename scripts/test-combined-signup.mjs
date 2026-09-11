import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage();
const base='http://127.0.0.1:4321',key='awb:signup-flow:v2';
const calls=[],errors=[];
let newsletterStatus=202,otpStatus=200;
const user={id:'11111111-1111-4111-8111-111111111111',email:'reader@example.com',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',user_metadata:{},app_metadata:{provider:'email'}};
page.on('pageerror',e=>errors.push(e.message));
await page.route('https://*.supabase.co/**',route=>{
 const path=new URL(route.request().url()).pathname;
 calls.push({path,body:route.request().postDataJSON(),url:route.request().url()});
 const status=path.endsWith('/newsletter-signup')?newsletterStatus:path.endsWith('/otp')?otpStatus:200;
 const data=path.endsWith('/newsletter-signup')?{accepted:status===202}:path.endsWith('/user')?user:status===429?{msg:'Test rate limit'}:[];
 return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
});
const root=()=>page.locator('.newsletter-signup [data-newsletter-email]');
async function reset(){await page.goto(base);await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await page.reload();calls.length=0;newsletterStatus=202;otpStatus=200;}
async function submit(){await root().getByRole('textbox',{name:'Email address'}).fill('reader@example.com');await root().getByRole('button',{name:'Subscribe',exact:true}).click();}
try {
 for(const width of [1280,390]) {
  await page.setViewportSize({width,height:950});await reset();
  assert.match(await root().locator('form .newsletter-email__note').innerText(),/AWB account and newsletter/);
  await submit();
  await page.waitForFunction(()=>document.querySelector('[data-newsletter-email]').dataset.signupStage==='sent');
  assert.equal(calls.filter(c=>c.path.endsWith('/newsletter-signup')).length,1);
  const otp=calls.filter(c=>c.path.endsWith('/otp'));assert.equal(otp.length,1,'One click also requests Auth verification');
  assert.equal(otp[0].body.email,'reader@example.com');assert.equal(otp[0].body.create_user,true);
  assert.equal(new URL(otp[0].url).searchParams.get('redirect_to'),base+'/auth/confirm/');
  assert.equal(await page.locator('[data-activate-account],[data-skip-account],[data-account-resume]').count(),0);
  await page.locator('header [data-open-newsletter]').click();
  assert.equal(await page.locator('[data-newsletter-modal] [data-newsletter-email]').getAttribute('data-signup-stage'),'sent');
  await page.keyboard.press('Escape');await page.reload();
  assert.equal(calls.filter(c=>c.path.endsWith('/otp')).length,1,'Reload does not send again');
  await page.screenshot({path:`/tmp/awb-combined-signup-${width}.png`});
  await reset();otpStatus=429;await submit();
  await root().locator('[data-account-status]').filter({hasText:'Too many'}).waitFor();
  assert.equal(await root().locator('[data-resend-verification]').isDisabled(),true);
  await page.evaluate(key=>{const s=JSON.parse(sessionStorage.getItem(key));s.resendAt=0;sessionStorage.setItem(key,JSON.stringify(s));},key);
  otpStatus=200;await page.reload();await root().locator('[data-resend-verification]').click();
  await page.waitForFunction(()=>document.querySelector('[data-newsletter-email]').dataset.signupStage==='sent');
  assert.equal(calls.filter(c=>c.path.endsWith('/newsletter-signup')).length,1,'Retry never repeats newsletter submission');
  await reset();newsletterStatus=503;await submit();
  await root().locator('[data-newsletter-status]').filter({hasText:'could not save'}).waitFor();
  assert.equal(calls.filter(c=>c.path.endsWith('/otp')).length,0);
 }
 await reset();
 const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test`;
 await page.goto(`${base}/auth/confirm/#access_token=${token}&refresh_token=mock-refresh&type=signup`);
 await page.waitForURL(base+'/profile/');await page.locator('#library-content').waitFor();
 assert.equal(await page.evaluate(key=>sessionStorage.getItem(key),key),null);
 assert.equal(await page.getByText('Your account is ready.',{exact:true}).count(),0);
 assert.equal(await page.getByRole('link',{name:'Open my shelf',exact:true}).count(),0);
 assert.ok(calls.some(c=>c.path.endsWith('/user')),'Verification is checked with Auth server');
 await page.goto(base+'/auth/confirm/#error=access_denied&error_description=Expired');
 await page.getByRole('heading',{name:'Let’s try a fresh link.'}).waitFor();
 assert.equal(page.url(),base+'/auth/confirm/');
 assert.deepEqual(errors,[]);
 console.log('PASS: one-click newsletter + account signup, combined consent, modal sync, cooldown/retry without duplicate signup, no automatic resend on reload, verified email goes directly to Profile, expired link handling; desktop/mobile. All services mocked, no emails sent.');
} finally {await browser.close();}
