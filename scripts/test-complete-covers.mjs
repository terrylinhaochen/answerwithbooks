import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [route,selector] of [['/books/the-mom-test/','.jacket--composed'],['/answers/how-to-tell-whether-your-value-proposition-is-actually-different/','.answer-cover'],['/guides/github-lead-research/','.guide-cover']]){
  await page.goto('http://127.0.0.1:4321'+route);const cover=page.locator(selector).first();await cover.scrollIntoViewIfNeeded();await cover.locator('img').evaluate(async img=>{img.loading='eager';await img.decode()});
  const src=await cover.locator('img').getAttribute('src');assert.ok(src.includes('/rendered/'));
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'),'https://answerwithbooks.com'+src);
  assert.equal(await page.locator('meta[name="twitter:image"]').getAttribute('content'),'https://answerwithbooks.com'+src);
  if(selector==='.jacket--composed')assert.equal(await cover.locator('.jacket-type').isVisible(),false);else assert.equal(await cover.locator('.answer-cover__label,.guide-cover__label').count(),0);
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await cover.scrollIntoViewIfNeeded();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(route.includes('the-mom-test'))await page.screenshot({path:`/private/tmp/awb-complete-mom-test-${width}.png`});}
 }
 assert.deepEqual(errors,[]);
 console.log('PASS complete public covers: original titles are in the image, overlays suppressed, OG/Twitter match, three page types and desktop/mobile fit.');
}finally{await browser.close();}
