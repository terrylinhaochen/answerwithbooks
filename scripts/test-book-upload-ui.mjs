import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[];
try {
 for(const width of [390,1280]) {
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/books/zero-to-one/');
  assert.equal(await page.getByRole('button',{name:'Copy to agent',exact:true}).count(),1);
  const prompt=await page.getByLabel('Book agent prompt').inputValue();assert.ok(prompt.length>2000);assert.match(prompt,/question or complete a task/);
  await page.evaluate(()=>{navigator.clipboard.writeText=async text=>{window.copied=text;};});await page.getByRole('button',{name:'Copy to agent',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.copied),prompt);
  await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('denied');};});await page.getByRole('button',{name:'Copy to agent',exact:true}).click();assert.ok(await page.getByLabel('Book agent prompt').isVisible());
  await page.goto(origin+'/books/');await page.locator('[data-open-book-request]').click();
  assert.equal(await page.getByText('Is this the right book?',{exact:true}).count(),0);assert.equal(await page.getByText('Find a book',{exact:true}).count(),0);
  assert.match(await page.getByLabel('Book file').getAttribute('accept'),/\.epub,\.docx/);
  await page.getByLabel('Book file').setInputFiles({name:'example.txt',mimeType:'text/plain',buffer:Buffer.from('Example original source. '.repeat(40))});
  await page.getByRole('button',{name:'Create book & skill'}).click();await page.getByText('Sign in first to keep your book private.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/awb-upload-release-${width}.png`});await context.close();
 }
 assert.deepEqual(errors,[]);console.log('PASS: desktop/mobile upload-only UI, full agent prompt copy, denied-copy fallback, sign-in guard, no overflow. No provider calls or authentication mocked in this test.');
}finally{await browser.close();}
