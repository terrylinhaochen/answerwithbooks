import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 for(const width of [1440,390,320]) {
  const p=await browser.newPage({viewport:{width,height:950}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}}));
  await p.goto(origin);await p.evaluate(()=>document.fonts.ready);
  assert.equal(await p.locator('#install a,#install button').count(),1);
  assert.equal(await p.locator('#install a').getAttribute('href'),'/tools/');
  assert.equal(await p.locator('#install [data-copy-install]').count(),0);
  assert.deepEqual((await p.locator('nav[aria-label=Main] a').allTextContents()).map(t=>t.trim()),['Books','Guides','Skills']);
  await p.locator('#install').scrollIntoViewIfNeeded();await p.screenshot({path:`/private/tmp/awb-one-cta-${width}.png`});
  for(let i=0;i<5;i++) {
   await p.evaluate(()=>scrollTo(0,0));
   const pick=p.locator(`[data-pick-book="${i}"]`);
   if(width<700){await pick.focus();await pick.press('Enter');}else await pick.click();
   const title=await p.locator('#shelf-detail-title').innerText();
   await p.locator('[data-detail-copy]').click();const copied=await p.evaluate(()=>window.copied);
   assert.ok(copied.includes(title));assert.match(copied,/BEGIN BOOK ARTIFACT/);assert.match(copied,/MY TASK/);assert.ok(copied.length>1500);
   assert.equal(await p.locator('[data-detail-link]').innerText(),'Open the book');
   assert.match(await p.locator('[data-detail-copy-status]').innerText(),/Copied/);
   if(i===0){await p.screenshot({path:`/private/tmp/awb-agent-book-${width}.png`});}
   if(i===1){await p.locator('[data-next-book]').click();assert.doesNotMatch(await p.locator('[data-detail-copy-status]').innerText(),/Copied/);await p.locator('[data-detail-copy]').click();assert.match(await p.evaluate(()=>window.copied),/Designing Your Life/);}
   await p.keyboard.press('Escape');
  }
  await p.locator('[data-pick-book="0"]').focus();await p.keyboard.press('Enter');
  await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied')}}}));
  await p.locator('[data-detail-copy]').click();assert.equal(await p.locator('[data-detail-prompt]').isVisible(),true);await p.keyboard.press('ArrowLeft');assert.match(await p.locator('#shelf-detail-title').innerText(),/The Mom Test/);await p.keyboard.press('Escape');
  await p.goto(origin+'/books/');await p.locator('[data-filter-search]').fill('Mom Test');
  assert.equal(await p.locator('[data-filter-item] button').count(),0);
  assert.equal(await p.locator('[data-filter-item]').getByText('Open the book',{exact:true}).count(),0);
  await p.screenshot({path:`/private/tmp/awb-agent-card-${width}.png`});
  await p.locator('[data-filter-item]:visible .library-cover').click();
  await p.waitForURL(origin+'/books/the-mom-test/');await p.locator('header [data-copy-public-book]').click();const top=await p.evaluate(()=>window.copied);await p.locator('[data-copy-book-agent]').click();assert.equal(await p.evaluate(()=>window.copied),top,'top and end copy one identical book/task prompt');
  await p.goto(origin+'/tools/');await p.locator('[data-open-book-request]').first().click();assert.equal(await p.locator('#book-upload-dialog h2').innerText(),'Upload sources');
  const input=p.getByLabel('Source file');const formats=await input.getAttribute('accept');for(const ext of ['.pdf','.epub','.docx','.md','.html','.rtf','.txt']) assert.ok(formats.split(',').includes(ext));
  assert.match(await p.locator('#book-upload-dialog').innerText(),/paper, or document/);
  await p.screenshot({path:`/private/tmp/awb-source-upload-${width}.png`});
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  console.log(`PASS ${width}: single homepage CTA, Skills label, five task prompts, switching books, manual copy, whole-card book navigation, matching book-page prompts, source upload formats.`);await p.close();
 }
} finally {await browser.close();}
