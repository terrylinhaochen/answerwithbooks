import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage();
const endpoint='**/functions/v1/newsletter-signup';
try {
 for(const width of [1280,390]) {
  await page.setViewportSize({width,height:950});
  await page.goto('http://127.0.0.1:4321/');
  await page.evaluate(()=>sessionStorage.clear());
  await page.reload();
  const form=page.locator('.newsletter-signup form');
  const input=form.getByRole('textbox',{name:'Email address'});
  const button=form.getByRole('button',{name:'Subscribe'});
  await button.waitFor();
  assert.equal(await page.locator('iframe[data-substack-embed]').count(),0);
  assert.equal(await page.getByText('CS@Northwestern, GenAI Product@Tiktok',{exact:false}).count(),0);
  assert.equal(await form.locator('.newsletter-email__note').innerText(),'By subscribing, you agree to receive emails from AWB. You can unsubscribe at any time. View our Terms and Privacy Policy.');
  await input.fill('invalid');await button.click();
  assert.equal(await input.evaluate(e=>e.checkValidity()),false);
  await page.route(endpoint, route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'}));
  await input.fill('reader@example.com');await button.click();
  await form.getByRole('status').filter({hasText:'We could not save'}).waitFor();
  assert.equal(await input.inputValue(),'reader@example.com');assert.equal(await button.isEnabled(),true);
  await page.unroute(endpoint);
  await page.route(endpoint,route=>route.fulfill({status:429,contentType:'application/json',body:'{}'}));
  await button.click();await form.getByRole('status').filter({hasText:'Too many attempts'}).waitFor();
  await page.unroute(endpoint);
  let payload;
  await page.route(endpoint,async route=>{payload=route.request().postDataJSON();await route.fulfill({status:202,contentType:'application/json',body:'{"accepted":true}'});});
  await button.click();await form.getByRole('status').filter({hasText:'your email has been saved'}).waitFor();
  assert.equal(payload.email,'reader@example.com');assert.equal(payload.consent,true);assert.equal(payload.consentVersion,'awb-newsletter-v1');
  assert.equal(await form.locator('input[type=email]').isDisabled(),true);
  await page.unroute(endpoint);
  await page.evaluate(()=>sessionStorage.clear());
  await page.goto('http://127.0.0.1:4321/');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`/tmp/arda-native-signup-${width}.png`});
 }
 if(process.env.AWB_LIVE_NEWSLETTER_TEST) {
  await page.setViewportSize({width:1280,height:950});
  await page.goto('http://127.0.0.1:4321/');
  const form=page.locator('.newsletter-signup form');
  await form.getByRole('textbox',{name:'Email address'}).fill(process.env.AWB_LIVE_NEWSLETTER_TEST);
  const response=page.waitForResponse(r=>r.url().includes('/functions/v1/newsletter-signup')&&r.request().method()==='POST');
  await form.getByRole('button',{name:'Subscribe'}).click();
  assert.equal((await response).status(),202);
  await form.getByRole('status').filter({hasText:'your email has been saved'}).waitFor();
  console.log('LIVE: browser → deployed signup endpoint returned 202; verify and delete synthetic record separately.');
 }
 const noJs=await browser.newPage({javaScriptEnabled:false});await noJs.goto('http://127.0.0.1:4321/');
 assert.equal(await noJs.getByRole('link',{name:'subscribe on Substack',exact:true}).getAttribute('href'),'https://terrychen.substack.com/subscribe');
 assert.equal(await noJs.locator('.newsletter-signup button[type=submit]').isDisabled(),true);
 await noJs.close();
 console.log('PASS: native signup desktop/mobile, validation, retry, rate limit, success, no iframe/old bio, no-JS fallback. UI states mocked except explicitly enabled live check.');
} finally {await browser.close();}
