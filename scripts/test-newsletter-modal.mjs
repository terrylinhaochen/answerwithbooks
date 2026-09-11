import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const base=process.env.AWB_TEST_URL||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const page=await browser.newPage();const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
 for(const width of [1280,390]) {
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/skills/','/newsletter/']) {
   await page.goto(base+route);
   const modal=page.locator('[data-newsletter-modal]');
   assert.equal(await modal.count(),1);
   assert.equal(await modal.evaluate(d=>d.open),false,'Never auto-open a popup');
   const triggers=page.locator('[data-open-newsletter]');
   for(let i=0;i<await triggers.count();i++) {
    const trigger=triggers.nth(i);await trigger.click();
    assert.equal(await modal.evaluate(d=>d.open),true);
    assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    const close=modal.getByRole('button',{name:'Close newsletter signup'});
    await close.focus();await page.keyboard.press('Shift+Tab');
    assert.ok(await modal.evaluate(d=>d.contains(document.activeElement)),'Focus remains in modal');
    await page.keyboard.press('Escape');
    assert.equal(await modal.evaluate(d=>d.open),false);
    assert.equal(await trigger.evaluate(e=>document.activeElement===e),true,'Restore trigger focus');
    assert.notEqual(await page.evaluate(()=>document.body.style.overflow),'hidden');
   }
   await triggers.first().click();await modal.getByRole('button',{name:'Close newsletter signup'}).click();
   assert.equal(await modal.evaluate(d=>d.open),false);
   if(route==='/') {
    await page.screenshot({path:`/tmp/newsletter-home-${width}.png`});
    await triggers.last().click();
    await page.screenshot({path:`/tmp/newsletter-modal-${width}.png`});
    // Signup uses the native form with no Substack iframe.
    assert.equal(await modal.locator('[data-substack-embed]').count(),0);
    assert.equal(await modal.locator('[data-newsletter-email-form]').count(),1);
    await page.mouse.click(2,2);assert.equal(await modal.evaluate(d=>d.open),false,'Backdrop closes');
   }
  }
 }
 const noJs=await browser.newPage({javaScriptEnabled:false});
 await noJs.goto(base+'/');
 assert.equal(await noJs.locator('[data-open-newsletter]').first().getAttribute('href'),'https://terrychen.substack.com/subscribe');
 await noJs.close();assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,viewports:[1280,390],routes:3,closeButton:true,escape:true,backdrop:true,focusRestored:true,noJsFallback:true,emailSignup:'Native email form; no emails submitted',errors},null,2));
} finally {await browser.close();}
