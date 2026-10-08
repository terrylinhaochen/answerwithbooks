import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const origin = process.env.AWB_TEST_ORIGIN || 'http://127.0.0.1:4321';
const key = 'awb:analytics-consent:v1';
try {
  for (const width of [1280,390,320]) {
    const context = await browser.newContext({viewport:{width,height:950}});
    const page = await context.newPage();
    let loads = 0;
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await context.route('https://www.googletagmanager.com/**', route => { loads++; return route.fulfill({status:200,contentType:'application/javascript',body:'/* test double: no data sent */'}); });
    await page.goto(origin+'/?email=never-send@example.com#private');
    assert.equal(loads,0,'No tracking before consent');
    await page.locator('[data-analytics-notice]').waitFor({state:'visible'});
    await page.screenshot({path:`/private/tmp/awb-analytics-choice-${width}.png`});
    await page.getByRole('button',{name:'No thanks',exact:true}).click();
    assert.equal(await page.locator('[data-analytics-notice]').isVisible(),false);
    await page.reload();assert.equal(loads,0,'No thanks persists across visits');
    assert.equal(await page.locator('[data-analytics-notice]').isVisible(),false);
    await page.goto(origin+'/privacy/?email=never-send@example.com');
    const tagResponse = page.waitForResponse(response=>response.url().startsWith('https://www.googletagmanager.com/gtag/js'));
    await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
    await tagResponse;
    await page.waitForFunction(() => !!document.querySelector('[data-awb-analytics]'));
    assert.equal(loads,1);
    const config = await page.evaluate(() => Array.from(window.dataLayer).map(a=>Array.from(a)).find(a=>a[0]==='config'));
    assert.equal(config[2].page_location,origin+'/privacy/');
    assert.equal(config[1],'G-FNWRC3EMV4');
    assert.equal(config[2].page_referrer,'');
    assert.equal(config[2].send_page_view,true);
    assert.equal(await page.evaluate(()=>window.dataLayer.filter(a=>a[0]==='config'&&a[1]==='G-FNWRC3EMV4').length),1,'One config creates one automatic pageview');
    const consent = await page.evaluate(()=>window.dataLayer.filter(a=>a[0]==='consent').map(a=>[a[1],a[2].analytics_storage]));
    assert.deepEqual(consent,[['default','denied'],['update','granted']]);
    assert.equal(config[2].allow_google_signals,false);
    await page.reload();
    assert.equal(loads,2,'Consent persists');
    await page.getByRole('button',{name:'Allow analytics',exact:true}).click();assert.equal(loads,2,'Repeat allow does not load/configure again');
    await context.addCookies([{name:'_ga',value:'test',url:origin}]);
    await Promise.all([page.waitForNavigation(), page.getByRole('button',{name:'Keep analytics off',exact:true}).click()]);
    assert.equal(loads,2,'Withdrawal does not load tracking');
    assert.ok(!(await context.cookies()).some(c=>c.name==='_ga'));
    assert.match(await page.locator('[data-analytics-status]').innerText(),/is off/);
    await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({value:'on',at:Date.now()-181*24*60*60*1000})),key);
    await page.reload(); assert.equal(loads,2,'Expired choice defaults off');
    await page.screenshot({path:`/tmp/awb-privacy-reviewed-${width}.png`});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.deepEqual(errors,[]);
    await context.close();
  }
// First-visit consent must work directly on the landing page, not just Privacy.
const firstContext = await browser.newContext();
let firstLoads = 0;
await firstContext.route('https://www.googletagmanager.com/**', route => { firstLoads++; return route.fulfill({contentType:'application/javascript',body:'/* no data sent */'}); });
const firstPage = await firstContext.newPage();
await firstPage.goto(origin+'/?token=never-send#private');
const firstTag = firstPage.waitForResponse(response=>response.url().includes('googletagmanager.com/gtag/js'));
await firstPage.getByRole('button',{name:'Allow analytics',exact:true}).click();await firstTag;
assert.equal(firstLoads,1);
assert.equal(await firstPage.locator('[data-analytics-notice]').isVisible(),false);
assert.equal(await firstPage.evaluate(()=>window.dataLayer.find(a=>a[0]==='config')[2].page_location),origin+'/');
await firstPage.goto(origin+'/books/');assert.equal(firstLoads,2);
assert.equal(await firstPage.locator('[data-analytics-notice]').isVisible(),false);
await firstContext.close();
const privateContext = await browser.newContext();
await privateContext.addInitScript(key=>localStorage.setItem(key,JSON.stringify({value:'on',at:Date.now()})),key);
let privateLoads = 0;
await privateContext.route('https://www.googletagmanager.com/**',r=>{privateLoads++;return r.abort();});
const privatePage = await privateContext.newPage();
for (const path of ['/login/','/signup/','/upload/','/profile/','/processing/','/connect-agent/','/your-book/','/my-books/','/auth/confirm/','/reset-password/','/embed/book-upload/']) {
  await privatePage.goto(`${origin}${path}`);
  assert.equal(await privatePage.locator('[data-awb-analytics]').count(),0);
  assert.equal(await privatePage.locator('[data-analytics-notice]').isVisible(),false);
}
assert.equal(privateLoads,0,'No tag on account/login/submission routes even with consent');
await privateContext.close();
for (const signal of ['globalPrivacyControl','doNotTrack']) {

    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(({key,signal})=>{
      localStorage.setItem(key,JSON.stringify({value:'on',at:Date.now()}));
      Object.defineProperty(navigator,signal,{get:()=>signal==='doNotTrack'?'1':true});
    },{key,signal});
    let loads = 0;
    await page.route('https://www.googletagmanager.com/**',r=>{loads++;return r.abort();});
    await page.goto(origin+'/privacy/');
    assert.equal(loads,0);
    assert.ok(await page.getByRole('button',{name:'Allow analytics',exact:true}).isDisabled());
    await context.close();
  }
  console.log('PASS: desktop/mobile visible choice, opt-in/off persistence, single property configuration, basic consent mode, withdrawal/cookie cleanup, expiry, private URL removal, sensitive-route exclusion, GPC/DNT. Google tag mocked; no analytics sent.');
} finally { await browser.close(); }
