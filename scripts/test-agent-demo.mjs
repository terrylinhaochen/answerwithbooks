import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[],providerCalls=[];
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/functions/v1/book-process',async route=>{providerCalls.push(route.request().url());await route.fulfill({status:500,body:'Demo must not process a book'});});
  await page.route('https://api.openai.com/**',async route=>{providerCalls.push(route.request().url());await route.abort();});
  await page.goto(origin+'/');const demo=page.locator('[data-agent-demo]');await demo.locator('[data-demo-playback]').waitFor({state:'attached'});
  assert.equal(await demo.locator('textarea,input').count(),0,'the form has been removed');
  assert.match(await demo.innerText(),/Illustrated demo/);
  await demo.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('[data-agent-demo]').dataset.demoPhase==='reading');
  await demo.getByRole('button',{name:'Pause demo',exact:true}).click();
  assert.equal(await demo.locator('[data-demo-playback]').getAttribute('aria-label'),'Play demo');
  const phase=await demo.getAttribute('data-demo-phase');await page.waitForTimeout(700);assert.equal(await demo.getAttribute('data-demo-phase'),phase,'pause freezes the sequence');
  await demo.getByRole('button',{name:'Play demo',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-demo-run-state]').textContent==='Example complete');
  assert.equal(await demo.locator('[data-demo-scene-panel="0"] [data-demo-reveal][data-visible=true]').count(),8);
  assert.equal(await demo.locator('[data-demo-scene-panel="0"] .demo-answer li').count(),3);
  const sizes=await demo.evaluate(el=>({scroll:el.scrollWidth,width:el.clientWidth,doc:document.documentElement.scrollWidth,view:innerWidth}));assert.ok(sizes.scroll<=sizes.width);assert.ok(sizes.doc<=sizes.view);
  assert.equal(await page.locator('#home-intro').count(),1);assert.equal(await page.locator('#source-books').count(),1);assert.equal(await page.locator('#featured-answers').count(),1);
  await demo.screenshot({path:`/private/tmp/awb-skill-chat-${width}.png`});
  await demo.locator('[data-demo-scene-panel="0"] summary').click();assert.ok(await demo.getByText('Ask about specific past behavior.',{exact:true}).isVisible());
  await demo.getByRole('button',{name:/Find your focus/}).click();await demo.getByRole('button',{name:/Build a habit/}).click();
  await page.waitForFunction(()=>document.querySelector('[data-demo-run-state]').textContent==='Example complete');
  assert.equal(await demo.locator('[data-demo-scene-panel]:not([hidden])').getAttribute('data-demo-scene-panel'),'2');
  assert.equal(await demo.getByRole('button',{name:/Build a habit/}).getAttribute('aria-pressed'),'true');
  assert.ok(await demo.getByText('Make starting easier than skipping.',{exact:true}).isVisible());
  assert.equal(await demo.locator('.demo-skill-call[open]').count(),0,'changing examples resets the disclosure');
  await demo.getByRole('button',{name:'Replay demo',exact:true}).click();assert.equal(await demo.getAttribute('data-demo-phase'),'task');
  // Opening the tool keeps the example readable instead of animating under it.
  await page.waitForFunction(()=>document.querySelector('[data-agent-demo]').dataset.demoPhase==='reading');
  await demo.locator('[data-demo-scene-panel="2"] summary').click();await page.waitForFunction(()=>document.querySelector('[data-demo-run-state]').textContent==='Example complete');
  assert.ok(await demo.getByText('Shrink the start to two minutes.',{exact:true}).isVisible());
  assert.equal(await demo.getByRole('link',{name:/Explore skills/}).getAttribute('href'),'/tools/');
  await page.close();
 }
 for(const width of [320,768]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#question-first-reading');const demo=page.locator('[data-agent-demo]');await demo.locator('[data-demo-playback]').waitFor({state:'attached'});
  await page.waitForFunction(()=>document.querySelector('[data-demo-run-state]').textContent==='Example complete');
  await demo.getByRole('button',{name:/Find your focus/}).focus();await page.keyboard.press('Enter');
  assert.ok(await demo.getByText('One deliverable. One protected block.',{exact:true}).isVisible());
  assert.equal(await demo.getAttribute('data-demo-phase'),'answer');
  assert.equal(await demo.locator('[data-demo-scene-panel="1"]').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await demo.screenshot({path:`/private/tmp/awb-skill-chat-reduced-${width}.png`});await page.close();
 }
 const staticPage=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:1000}});
 await staticPage.goto(origin+'/#question-first-reading');assert.ok(await staticPage.getByText('Ask about what happened. Not what might.',{exact:true}).isVisible());
 await staticPage.locator('[data-demo-scene-panel="0"] summary').click();assert.ok(await staticPage.getByText('Ask about specific past behavior.',{exact:true}).isVisible());await staticPage.close();
 assert.deepEqual(providerCalls,[]);assert.deepEqual(errors,[]);
 console.log('PASS animated skill conversation: ordered tool and result reveals; pause/resume/replay; rapid scene switches; inspectable skill methods; desktop/mobile; keyboard; reduced motion; no-JS transcript; no provider or processing calls; surrounding homepage preserved.');
}finally{await browser.close();}
