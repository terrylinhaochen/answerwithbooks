import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://api.openai.com/**',()=>{throw Error('Demo must not call a provider');});
  await page.goto(origin+'/');await page.locator('[data-agent-demo]').scrollIntoViewIfNeeded();
  await page.locator('[data-demo-task]').fill('Help me interview a customer about the last time they booked a train.');
  await page.locator('[data-demo-step="1"]').click();
  const prompt=await page.locator('[data-demo-prompt]').inputValue();
  assert.match(prompt,/BEGIN BOOK ARTIFACT/);assert.match(prompt,/MY TASK\nHelp me interview/);assert.ok(prompt.length>2000);
  await page.evaluate(()=>{navigator.clipboard.writeText=async text=>{window.copiedPrompt=text;};});
  await page.locator('[data-demo-copy]').click();assert.equal(await page.evaluate(()=>window.copiedPrompt),prompt);
  assert.equal(await page.locator('[data-demo-panel="2"]').isVisible(),true);assert.match(await page.locator('[data-demo-status]').textContent(),/Open your AI chat, paste the prompt, and send it/);
  assert.match(await page.locator('[data-demo-panel="2"]').textContent(),/not a live AI response/);
  await page.locator('.demo-install summary').click();assert.match(await page.locator('.demo-install').textContent(),/Installing the downloaded skill/);
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('blocked');};});await page.locator('[data-demo-copy]').click();assert.ok(await page.locator('[data-demo-prompt]').isVisible());assert.match(await page.locator('[data-demo-status]').textContent(),/Select and copy/);
  await page.locator('[data-demo-step="0"]').click();await page.locator('[data-demo-task]').fill('I’m interviewing people about a meal-planning app. Help me learn how they planned dinner last week. Draft five questions about what they actually did, and flag leading questions.');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('[data-agent-demo]').screenshot({path:`/private/tmp/answerwithbooks-agent-demo-${width}.png`});assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: real copyable book context + editable task, three demo steps, explicit illustrative response, clipboard fallback, reusable-skill explanation, and responsive layout.');
}finally{await browser.close();}
