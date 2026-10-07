import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {bookSkillPlatforms} from '../src/lib/book-skill-install.mjs';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],viewport:{width:1280,height:1000}});
const page=await context.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try {
 for(const surface of ['dialog','page']) {
  await page.goto(surface==='dialog'?'http://127.0.0.1:4321/':'http://127.0.0.1:4321/tools/#public-shelf-install');
  if(surface==='dialog')await page.locator('[data-open-skill-install]').first().click();
  const root=page.locator('[data-book-install-options]'),select=root.getByRole('combobox',{name:'Choose your agent'});
  for(const platform of bookSkillPlatforms){
   await select.selectOption(platform.id);
   await root.getByRole('button',{name:'Copy install command'}).click();
   const copied=await page.evaluate(()=>navigator.clipboard.readText());
   assert.equal(copied,platform.command);
   if(!['codex','choose'].includes(platform.id))assert.ok(copied.endsWith(`--agent ${platform.id}`));
   if(platform.id==='choose')assert.ok(!copied.includes('--agent'),'Let the user select agents; do not install to every agent automatically');
   assert.equal(await root.locator('[data-book-install-next]').innerText(),platform.next);
   await select.selectOption(platform.id==='codex'?'cursor':'codex');
   assert.equal(await root.locator('[data-copy-status]').innerText(),'','Switching agents clears stale copied confirmation');
  }
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('Clipboard denied for test');};});
  await select.selectOption('claude-code');
  await root.getByRole('button',{name:'Copy install command'}).click();
  assert.ok((await root.getByRole('textbox',{name:'Text to copy manually'}).inputValue()).endsWith('--agent claude-code'));
  await select.selectOption('cursor');
  assert.equal(await root.locator('[data-copy-fallback]').isVisible(),false);
  await root.getByRole('button',{name:'Copy install command'}).click();
  assert.ok((await root.getByRole('textbox',{name:'Text to copy manually'}).inputValue()).endsWith('--agent cursor'));
  await select.selectOption('claude-code');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.ok(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   if(surface==='dialog'){
    const dialog=page.locator('#skill-install-dialog');
    assert.ok(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await dialog.screenshot({path:`/private/tmp/awb-platform-install-${width}.png`});
   }
  }
 }
 // Opening must not depend on deferred modules loading successfully.
 const unbundled=await context.newPage();
 await unbundled.route('http://127.0.0.1:4321/',async route=>{
  const response=await route.fetch();
  const html=(await response.text()).replace(/<script\b(?=[^>]*type=["']module["'])[^>]*>[\s\S]*?<\/script>/gi,'');
  await route.fulfill({response,body:html});
 });
 await unbundled.goto('http://127.0.0.1:4321/');
 for(const trigger of await unbundled.locator('[data-open-skill-install]').all()){
  await trigger.click();
  assert.equal(unbundled.url(),'http://127.0.0.1:4321/');
  assert.equal(await unbundled.locator('#skill-install-dialog').isVisible(),true);
  await unbundled.keyboard.press('Escape');
 }
 await unbundled.close();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,platforms:bookSkillPlatforms.map(p=>p.name),surfaces:['homepage dialog','Skills FAQ'],clipboard:true,fallback:true,mobile:true}));
} finally {await browser.close();}
