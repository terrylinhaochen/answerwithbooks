import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const key = 'awb:analytics-consent:v1';
try {
  for (const width of [1280,390]) {
    const context = await browser.newContext({viewport:{width,height:950}});
    const page = await context.newPage();
    let loads = 0;
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await context.route('https://www.googletagmanager.com/**', route => { loads++; return route.fulfill({status:200,contentType:'application/javascript',body:'/* test double: no data sent */'}); });
    await page.goto('http://127.0.0.1:4321/?email=never-send@example.com#private');
    assert.equal(loads,0,'No tracking before consent');
    await page.goto('http://127.0.0.1:4321/privacy/?email=never-send@example.com');
    const tagResponse = page.waitForResponse(response=>response.url().startsWith('https://www.googletagmanager.com/gtag/js'));
    await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
    await tagResponse;
    await page.waitForFunction(() => !!document.querySelector('[data-awb-analytics]'));
    assert.equal(loads,1);
    const config = await page.evaluate(() => Array.from(window.dataLayer).map(a=>Array.from(a)).find(a=>a[0]==='config'));
    assert.equal(config[2].page_location,'http://127.0.0.1:4321/privacy/');
    assert.equal(config[2].page_referrer,'');
    assert.equal(config[2].allow_google_signals,false);
    await page.reload();
    assert.equal(loads,2,'Consent persists');
    await context.addCookies([{name:'_ga',value:'test',url:'http://127.0.0.1:4321'}]);
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
const privateContext = await browser.newContext();
await privateContext.addInitScript(key=>localStorage.setItem(key,JSON.stringify({value:'on',at:Date.now()})),key);
let privateLoads = 0;
await privateContext.route('https://www.googletagmanager.com/**',r=>{privateLoads++;return r.abort();});
const privatePage = await privateContext.newPage();
for (const path of ['/login/','/signup/','/upload/','/profile/']) {
  await privatePage.goto(`http://127.0.0.1:4321${path}`);
  assert.equal(await privatePage.locator('[data-awb-analytics]').count(),0);
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
    await page.goto('http://127.0.0.1:4321/privacy/');
    assert.equal(loads,0);
    assert.ok(await page.getByRole('button',{name:'Allow analytics',exact:true}).isDisabled());
    await context.close();
  }
  console.log('PASS: desktop/mobile opt-in, persistence, withdrawal/cookie cleanup, expiry, private URL removal, sensitive-route exclusion, GPC/DNT. Google tag mocked; no analytics sent.');
} finally { await browser.close(); }
