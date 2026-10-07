import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {bookSkillPlatforms} from '../src/lib/book-skill-install.mjs';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:1280,height:1000}});
const page=await context.newPage(),errors=[];
page.setDefaultTimeout(120000);page.setDefaultNavigationTimeout(120000);
page.on('pageerror',error=>errors.push(error.message));
try {
 for(const surface of ['dialog','page']) {
  await page.goto(origin+(surface==='dialog'?'/':'/tools/#public-shelf-install'));
  if(surface==='dialog')await page.locator('[data-open-skill-install]').first().click();
  const root=page.locator('[data-book-install-options]');
  const pick=async id=>root.locator(`[data-book-install-agent][value="${id}"]`).check();
  const next=async()=>root.getByRole('button',{name:'Next',exact:true}).click();
  const back=async()=>root.locator('[data-book-install-back]').click();
  assert.equal(await root.locator('select').count(),0);
  assert.equal(await root.locator('[data-book-install-agent]').count(),bookSkillPlatforms.length);
  assert.equal(await root.locator('blockquote,[data-book-install-next]').count(),0);
  assert.equal(await page.getByRole('link',{name:'More setup details'}).count(),0);
  await root.locator('[data-book-install-agent]:checked').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await root.locator('[data-book-install-agent]:checked').inputValue(),'claude-code');
  for(const platform of bookSkillPlatforms){
   await pick(platform.id);await next();
   await root.getByRole('button',{name:'Copy command',exact:true}).click();
   const copied=await page.evaluate(()=>navigator.clipboard.readText());
   assert.equal(copied,platform.command);
   if(!['codex','choose'].includes(platform.id))assert.ok(copied.endsWith(`--agent ${platform.id}`));
   if(platform.id==='choose')assert.ok(!copied.includes('--agent'),'Let the user select agents; do not install to every agent automatically');
   await back();
   assert.equal(await root.locator('[data-copy-status]').innerText(),'','Back clears stale copied confirmation');
  }
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('Clipboard denied for test');};});
  await pick('claude-code');await next();
  await root.getByRole('button',{name:'Copy command',exact:true}).click();
  assert.ok((await root.getByRole('textbox',{name:'Text to copy manually'}).inputValue()).endsWith('--agent claude-code'));
  await back();await pick('cursor');await next();
  assert.equal(await root.locator('[data-copy-fallback]').isVisible(),false);
  await root.getByRole('button',{name:'Copy command',exact:true}).click();
  assert.ok((await root.getByRole('textbox',{name:'Text to copy manually'}).inputValue()).endsWith('--agent cursor'));
  await back();await pick('codex');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.ok(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   for(const step of ['choose','copy']){
    if(step==='copy')await next();
    assert.ok(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    if(surface==='dialog'){
     const dialog=page.locator('#skill-install-dialog');
     assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
     await dialog.screenshot({path:`/private/tmp/awb-agent-cards-${step}-${width}.png`});
    }
   }
   await back();
  }
  if(surface==='dialog'){
   await next();await page.keyboard.press('Escape');
   await page.locator('[data-open-skill-install]').first().click();
   assert.equal(await root.locator('[data-book-install-step="choose"]').isVisible(),true);
   assert.equal(await root.locator('[data-book-install-step="copy"]').isVisible(),false);
  }
 }
 // Opening must not depend on deferred modules loading successfully.
 const unbundled=await context.newPage();
 await unbundled.route(origin+'/',async route=>{
  const response=await route.fetch();
  const html=(await response.text()).replace(/<script\b(?=[^>]*type=["']module["'])[^>]*>[\s\S]*?<\/script>/gi,'');
  await route.fulfill({response,body:html});
 });
 await unbundled.goto(origin+'/');
 for(const trigger of await unbundled.locator('[data-open-skill-install]').all()){
  await trigger.click();
  assert.equal(unbundled.url(),origin+'/');
  assert.equal(await unbundled.locator('#skill-install-dialog').isVisible(),true);
  await unbundled.keyboard.press('Escape');
 }
 await unbundled.close();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,platforms:bookSkillPlatforms.map(p=>p.name),surfaces:['homepage dialog','Skills FAQ'],clipboard:true,fallback:true,mobile:true}));
} finally {await browser.close();}
