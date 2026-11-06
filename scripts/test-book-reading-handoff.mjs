import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 for (const width of [390,1280]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{if(window.blockCopy)throw Error('Blocked');window.copiedPrompt=text;}}}));
  for (const [path,title,author] of [
   ['/books/the-structure-of-scientific-revolutions/','The Structure of Scientific Revolutions','Thomas S. Kuhn'],
   ['/books/read/?id=9004d927-7785-4c3a-acf1-647f732485f7','Invention: A Life','James Dyson']
  ]) {
   await page.goto('http://127.0.0.1:4321'+path);
   const button=page.getByRole('button',{name:'Copy prompt for your AI',exact:true});
   await button.waitFor({state:'visible'});
   await page.getByRole('heading',{name:'Put this book to work.',exact:true}).waitFor();
   assert.equal(await page.getByRole('button',{name:'Find an excerpt',exact:true}).count(),1);
   assert.equal(await page.getByText('Read further into this book.',{exact:true}).count(),0);
   const consent=page.getByRole('button',{name:'No thanks',exact:true});if(await consent.isVisible())await consent.click();
   await button.click();
   await page.waitForFunction(()=>!!window.copiedPrompt);
   const prompt=await page.evaluate(()=>window.copiedPrompt);
   assert.ok(prompt.includes(title));assert.ok(prompt.includes(author));
   assert.match(prompt,/skill\/answer-with-books\/SKILL.md/);
   assert.match(prompt,/retrieve relevant original passages/);
   assert.match(prompt,/not the original book/);
   const digest=await page.locator('[data-book-agent-prompt]').inputValue();assert.equal(prompt,digest);
   assert.ok(prompt.split('BEGIN BOOK EDITORIAL DIGEST')[1].length>500);
   assert.match(await page.locator('[data-book-agent-status]').innerText(),/^Copied/);
   await page.evaluate(()=>window.blockCopy=true);await button.click();
   assert.equal(await page.locator('[data-book-agent-prompt]').isVisible(),true);
   assert.match(await page.locator('[data-book-agent-status]').innerText(),/blocked/);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.locator('[data-book-agent]').screenshot({path:`/private/tmp/awb-book-handoff-${width}-${path.includes('?')?'uploaded':'static'}.png`});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS static and uploaded bottom CTA, correct digest and skill prompt, clipboard success/fallback, top excerpt action retained, desktop/mobile. No writes to hosted services.');
} finally {await browser.close();}
