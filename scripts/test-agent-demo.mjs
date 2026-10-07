import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[],providerCalls=[];
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/functions/v1/book-process',async route=>{providerCalls.push(route.request().url());await route.abort();});
  await page.route('https://api.openai.com/**',async route=>{providerCalls.push(route.request().url());await route.abort();});
  await page.goto(origin+'/');const demo=page.locator('[data-agent-demo]');await page.waitForFunction(()=>document.querySelector('[data-agent-demo]').hasAttribute('data-demo-enhanced'));
  assert.equal(await demo.locator('[data-demo-scene],textarea,input').count(),0,'no tabs or forms');
  await demo.scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('[data-agent-demo]').dataset.demoPhase==='reading');
  await demo.getByRole('button',{name:'Pause demo',exact:true}).click();const phase=await demo.getAttribute('data-demo-phase');await page.waitForTimeout(600);assert.equal(await demo.getAttribute('data-demo-phase'),phase);
  await demo.getByRole('button',{name:'Play demo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-demo-run-state]').textContent==='Example complete');
  const height=await demo.locator('.demo-window').evaluate(el=>el.getBoundingClientRect().height);
  assert.equal(await demo.locator('[data-demo-scene-panel="0"] [data-demo-reveal][data-visible=true]').count(),8);
  await demo.screenshot({path:`/private/tmp/awb-skill-loop-${width}.png`});
  await page.waitForTimeout(1500);assert.equal(await demo.locator('[data-demo-scene-panel][data-demo-active=true]').getAttribute('data-demo-scene-panel'),'0','finished answer stays long enough to read');
  await page.waitForFunction(()=>document.querySelector('[data-demo-scene-panel="1"]').dataset.demoActive==='true',{},{timeout:18000});
  assert.ok(Math.abs(await demo.locator('.demo-window').evaluate(el=>el.getBoundingClientRect().height)-height)<1,'loop does not shift the page');
  await page.waitForFunction(()=>document.querySelector('[data-agent-demo]').dataset.demoPhase==='reading');
  await demo.locator('[data-demo-scene-panel="1"] summary').click();await page.waitForFunction(()=>document.querySelector('[data-demo-run-state]').textContent==='Paused');
  assert.ok(await demo.getByText('Give each focus block a concrete output.',{exact:true}).isVisible());
  assert.equal(await demo.locator('[data-demo-scene-panel="0"]').getAttribute('aria-hidden'),'true');
  assert.ok(await demo.locator('[data-demo-scene-panel="0"]').evaluate(el=>el.inert));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===1280){
   await demo.getByRole('button',{name:'Play demo',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-demo-scene-panel="2"]').dataset.demoActive==='true',{},{timeout:15000});
   await page.waitForFunction(()=>document.querySelector('[data-demo-scene-panel="0"]').dataset.demoActive==='true',{},{timeout:16000});
   // Leaving the viewport must suspend the clock, rather than cycling unseen.
   await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(500);const pausedPhase=await demo.getAttribute('data-demo-phase');await page.waitForTimeout(1800);assert.equal(await demo.getAttribute('data-demo-phase'),pausedPhase);
  }
  assert.equal(await page.locator('#home-intro').count(),1);assert.equal(await page.locator('#source-books').count(),1);
  await page.close();
 }
 const reduced=await browser.newPage({viewport:{width:320,height:1000},reducedMotion:'reduce'});reduced.on('pageerror',e=>errors.push(e.message));
 await reduced.goto(origin+'/#question-first-reading');const demo=reduced.locator('[data-agent-demo]');await demo.getByRole('button',{name:'Next example',exact:true}).waitFor();
 assert.equal(await demo.getAttribute('data-demo-phase'),'answer');await demo.getByRole('button',{name:'Next example',exact:true}).focus();await reduced.keyboard.press('Enter');
 assert.ok(await demo.getByText('One deliverable. One protected block.',{exact:true}).isVisible());
 assert.equal(await demo.evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.playState==='running').length),0);
 assert.equal(await reduced.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await reduced.close();
 const staticPage=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:1000}});await staticPage.goto(origin+'/#question-first-reading');
 assert.ok(await staticPage.getByText('Ask about what happened. Not what might.',{exact:true}).isVisible());assert.equal(await staticPage.getByText('One deliverable. One protected block.',{exact:true}).isVisible(),false);await staticPage.close();
 assert.deepEqual(providerCalls,[]);assert.deepEqual(errors,[]);
 console.log('PASS no tabs; three-scene autoplay and wraparound; reading hold; pause/resume; inspect-to-pause; inactive-scene accessibility; stable layout; offscreen suspension; reduced motion; no JS; no provider calls.');
}finally{await browser.close();}
