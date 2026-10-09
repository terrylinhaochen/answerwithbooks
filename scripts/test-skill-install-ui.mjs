import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {bookSkillPlatforms,bookSkillSetupPrompt} from '../src/lib/book-skill-install.mjs';
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
  await root.getByRole('button',{name:'Copy setup message',exact:true}).click();
  assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),bookSkillSetupPrompt);
  assert.equal(await root.locator('[data-terminal-setup]').getAttribute('open'),null);
  assert.equal(await root.getByRole('button',{name:'Next',exact:true}).count(),0);
  const guide=await context.request.get(origin+'/SKILL.md');
  assert.equal(guide.status(),200);
  assert.match(guide.headers()['content-type'],/text\/markdown/);
  const instructions=await guide.text();
  assert.match(instructions,/install --skill/);
  assert.match(instructions,/v0\.5\.0/);
  assert.doesNotMatch(instructions,/install --skill --api/);
  await root.getByRole('button',{name:'Copy example',exact:true}).click();
  assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/organizational structure/);
  await root.getByText('Prefer the terminal?',{exact:true}).click();
  const terminal=root.locator('[data-terminal-command]');
  for(const platform of bookSkillPlatforms){
   await root.locator('select').selectOption(platform.id);
   await terminal.getByRole('button',{name:'Copy command',exact:true}).click();
   assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),platform.command);
   if(platform.id==='codex')assert.ok(!platform.command.includes('--api'));
  }
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('Clipboard denied for test');};});
  await root.getByRole('button',{name:'Copy setup message',exact:true}).click();
  assert.equal(await root.getByRole('textbox',{name:'Text to copy manually'}).inputValue(),bookSkillSetupPrompt);
  await root.locator('select').selectOption('claude-code');
  await terminal.getByRole('button',{name:'Copy command',exact:true}).click();
  assert.ok((await terminal.getByRole('textbox',{name:'Text to copy manually'}).inputValue()).endsWith('--agent claude-code'));
  await root.locator('select').selectOption('cursor');
  assert.equal(await terminal.locator('[data-copy-fallback]').isVisible(),false);
  await root.dispatchEvent('book-install-reset');
  for(const width of [1280,390,320]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   assert.ok(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
   if(surface==='dialog'){
    await root.locator('[data-terminal-setup]').evaluate(el=>el.open=false);
    await page.locator('#skill-install-dialog').screenshot({path:`/private/tmp/awb-simple-install-${width}.png`});
   }
  }
  if(surface==='dialog'){
   await page.keyboard.press('Escape');
   await page.locator('[data-open-skill-install]').first().click();
   assert.equal(await root.locator('[data-terminal-setup]').getAttribute('open'),null);
   assert.equal(await root.locator('[data-copy-fallback]:visible').count(),0);
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
