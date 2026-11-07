import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const key='awb:analytics-consent:v1';
const property='G-FNWRC3EMV4';
async function fixture(options={}) {
 const context=await browser.newContext(options);let loads=0;
 await context.route('https://www.googletagmanager.com/**',r=>{loads++;return r.fulfill({contentType:'application/javascript',body:'/* isolated test: no analytics sent */'})});
 return {context,page:await context.newPage(),loads:()=>loads};
}
try {
 for(const width of [1280,390,320]) {
  const {context,page,loads}=await fixture({viewport:{width,height:950}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?email=never-send@example.com#private');
  assert.equal(loads(),1,'New public-page visits load analytics by default');
  assert.equal(await page.locator('[data-analytics-notice]').count(),0,'No banner markup');
  const config=await page.evaluate(()=>Array.from(window.dataLayer).map(a=>Array.from(a)).filter(a=>a[0]==='config'));
  assert.equal(config.filter(a=>a[1]===property).length,1,'One automatic pageview per property');
  assert.equal(config[0][2].page_location,origin+'/');assert.equal(config[0][2].page_referrer,'');
  assert.equal(config[0][2].send_page_view,true);assert.equal(config[0][2].allow_google_signals,false);assert.equal(config[0][2].allow_ad_personalization_signals,false);
  await page.goto(origin+'/privacy/');assert.equal(loads(),2);
  assert.match(await page.locator('[data-analytics-status]').innerText(),/is on/);
  await page.getByRole('button',{name:'Turn analytics on',exact:true}).click();assert.equal(loads(),2,'No duplicate initialization');
  await context.addCookies([{name:'_ga',value:'test',url:origin}]);
  await Promise.all([page.waitForNavigation(),page.getByRole('button',{name:'Turn analytics off',exact:true}).click()]);
  assert.equal(loads(),2);assert.ok(!(await context.cookies()).some(c=>c.name==='_ga'));
  assert.match(await page.locator('[data-analytics-status]').innerText(),/is off/);
  await page.goto(origin+'/books/');assert.equal(loads(),2,'Opt-out persists across public pages');
  await page.goto(origin+'/privacy/');assert.equal(loads(),2);
  const response=page.waitForResponse(r=>r.url().includes('googletagmanager.com/gtag/js'));
  await page.getByRole('button',{name:'Turn analytics on',exact:true}).click();await response;assert.equal(loads(),3);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  await context.close();
 }
 // Prior opt-outs remain effective, including those saved before the old expiry.
 for(const age of [0,181*86400000]) {
  const {context,page,loads}=await fixture();
  await context.addInitScript(({key,age})=>localStorage.setItem(key,JSON.stringify({value:'off',at:Date.now()-age})),{key,age});
  await page.goto(origin+'/');assert.equal(loads(),0);await context.close();
 }
 for(const signal of ['globalPrivacyControl','doNotTrack']) {
  const {context,page,loads}=await fixture();
  await context.addInitScript(signal=>Object.defineProperty(navigator,signal,{get:()=>signal==='doNotTrack'?'1':true}),signal);
  await page.goto(origin+'/privacy/');assert.equal(loads(),0);
  assert.ok(await page.getByRole('button',{name:'Turn analytics on',exact:true}).isDisabled());await context.close();
 }
 const {context,page,loads}=await fixture();
 for(const path of ['/guides/','/guides/read/','/login/','/signup/','/upload/','/profile/','/processing/','/connect-agent/','/your-book/','/my-books/','/manage-skills/','/billing/','/api-keys/','/auth/confirm/','/reset-password/','/embed/book-upload/']) {
  await page.goto(origin+path);assert.equal(await page.locator('[data-awb-analytics]').count(),0,path);assert.equal(await page.locator('[data-analytics-notice]').count(),0);
 }
 assert.equal(loads(),0,'Account, guide, and private routes stay excluded');await context.close();
 console.log('PASS default analytics, no banner, single configuration, sanitized URL, persistent old/new opt-outs, cookie cleanup, privacy controls, GPC/DNT and private-route exclusion at desktop/mobile widths. Google mocked; no data sent.');
} finally {await browser.close();}
