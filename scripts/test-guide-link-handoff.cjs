const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4321/guides/read/?id=f4d44ec6-118a-4ec7-8b1b-17824b2e243e');
  await page.locator('.original').first().waitFor({timeout:30000});
  const prompt=await page.locator('[data-personalize-prompt]').inputValue();
  const url='https://yozeqanibszoxnowmvsm.supabase.co/functions/v1/reading-guides/f4d44ec6-118a-4ec7-8b1b-17824b2e243e.md';
  assert.equal(prompt,`Read this guide: ${url}. Use https://answerwithbooks.com/SKILL.md to help me connect it to my experience. Start by asking what interests me about the question.`);
  assert.ok(prompt.length<400);assert.ok(!prompt.includes('BEGIN GUIDE'));
  const excerpts=(await page.locator('.original').allTextContents()).join('\n');
  for(const word of ['intensifies','qualified','significant'])assert.ok(excerpts.includes(word),word);
  for(const broken of ['intensi es','quali ed','signi cant'])assert.ok(!excerpts.includes(broken),broken);
  const response=await fetch(url);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/^text\/markdown/);
  const md=await response.text();assert.equal((md.match(/### Original passage/g)||[]).length,8);for(const word of ['intensifies','qualified','significant'])assert.ok(md.includes(word));
  const missing=await fetch(url.replace('f4d44ec6-118a-4ec7-8b1b-17824b2e243e','00000000-0000-4000-8000-000000000000'));assert.equal(missing.status,404);
  await page.evaluate(()=>{window.__opened=[];window.__copied='';window.open=url=>{window.__opened.push(url);return null};Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text}}})});
  for(const provider of ['chatgpt','claude','gemini','grok']){
   await page.locator(`[data-ai-provider=${provider}]`).click();await page.locator('[data-personalize-button]').click();
   await page.waitForFunction(()=>document.querySelector('[data-personalize-button]').dataset.promptCopied==='true');
   assert.equal(await page.evaluate(()=>window.__copied),prompt);
  }
  await page.reload();await page.locator('.original').first().waitFor();assert.equal(await page.locator('[data-ai-provider=grok]').getAttribute('aria-pressed'),'true');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Blocked')}}}));
  await page.locator('[data-personalize-button]').click();assert.ok(await page.locator('[data-personalize-fallback]').isVisible());
  assert.equal(await page.locator('[data-personalize-prompt]').inputValue(),prompt);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,promptCharacters:prompt.length,markdownBytes:Buffer.byteLength(md),passages:8,anonymousFetch:response.status,missing:missing.status,providers:4,sourceRepairs:true}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
