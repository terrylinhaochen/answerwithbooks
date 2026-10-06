import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.AWB_TEST_URL||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:960}});const page=await context.newPage();let authCalls=[],subscriptions=[];const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://*.supabase.co/**',async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   if(path.includes('/functions/v1/newsletter-signup')){subscriptions.push(req.postDataJSON());return route.fulfill({status:202,json:{accepted:true}});}
   if(path.includes('/auth/v1/')){authCalls.push({path,body:req.postData()?req.postDataJSON():null});return route.fulfill({status:200,json:path.endsWith('/signup')?{user:{id:'sample'},session:null}:{}});}
   return route.fulfill({status:200,json:[]});
  });
  await page.goto(base+'/login/');assert.match(await page.locator('[data-signup-link]').getAttribute('href'),/^\/signup\//);
  await page.locator('[data-signup-link]').click();await page.waitForURL('**/signup/');
  await page.locator('#email').fill('reader+alias@example.com');await page.locator('#password').fill('test-password-only');await page.locator('#submit-btn').click();
  await page.getByText('Account request accepted',{exact:true}).waitFor();assert.equal(subscriptions.length,0);assert.equal(authCalls.filter(x=>x.path.endsWith('/signup')).length,1);
  assert.equal(authCalls.find(x=>x.path.endsWith('/signup')).body.email,'reader+alias@example.com');
  assert.equal(await page.locator('[data-resend-signup]').isDisabled(),true);assert.match(await page.locator('[data-signup-delivery]').innerText(),/does not confirm inbox delivery/);
  authCalls=[];await page.goto(base+'/newsletter/');await page.locator('[data-newsletter-email-form]:visible input[name=email]').fill('reader@example.com');await page.locator('[data-newsletter-email-form]:visible button[type=submit]').click();
  await page.getByText(/Your newsletter request is saved/).waitFor();assert.equal(subscriptions.length,1);assert.equal(authCalls.filter(x=>/otp|signup|resend/.test(x.path)).length,0);
  await page.goto(base+'/reset-password/');await page.locator('[data-recovery-request] input').fill('reader@example.com');await page.locator('[data-recovery-request] button').click();await page.getByText(/a recovery link has been requested/).waitFor();assert.equal(authCalls.filter(x=>x.path.endsWith('/recover')).length,1);
  await page.goto(base+'/tools/');await page.locator('[data-open-book-request]').first().click();await page.locator('[data-upload-submit]').click();assert.equal(await page.locator('[data-upload-status]').innerText(),'Choose a source file first.');await page.keyboard.press('Escape');
  await page.goto(base+'/books/the-mom-test/');assert.ok(await page.getByRole('link',{name:'Speed read this book'}).isVisible());assert.match(await page.getByRole('link',{name:'Speed read this book'}).innerText(),/Speed read/);assert.doesNotMatch(await page.locator('[data-copy-public-book]').innerText(),/↗/);
  await page.goto(base+'/onboarding/start/');await page.locator('input[name=focus][value=business]').check();await page.locator('[data-step-next]').click();await page.locator('[data-onboarding-step="1"]:visible').waitFor();assert.equal(await page.evaluate(()=>document.activeElement?.getAttribute('data-onboarding-step')),'1');await page.getByText('Use books I already care about',{exact:true}).click();assert.equal(await page.locator('input[name=shelf][value=owned]').isChecked(),true);assert.ok(await page.locator('[data-onboarding-step="1"]').evaluate(el=>el.getBoundingClientRect().top>=90));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);await context.close();
  console.log('PASS account/newsletter separation, alias preservation, cooldown, recovery, empty upload, copy and speed-read UI at '+width+'px (Auth and email mocked).');
 }
 const sitemap=await (await fetch(base+'/sitemap-0.xml')).text();assert.doesNotMatch(sitemap,/\/auth\/confirm\/|\/reset-password\//);
 console.log('PASS auth routes excluded from sitemap.');
} finally {await browser.close();}
