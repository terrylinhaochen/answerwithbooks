import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.AWB_TEST_ORIGIN || 'http://127.0.0.1:4321';
const defaults = ['the-mom-test', 'thinking-fast-and-slow', 'designing-your-life', 'atomic-habits', 'deep-work'];
const sharedUrl = ids => `${origin}/shelf/?books=${ids.join(',')}`;
const browser = await chromium.launch({ headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const errors = [], writes = [];
const user = { id:'00000000-0000-4000-8000-000000000011', email:'private-reader@example.test', aud:'authenticated', role:'authenticated', user_metadata:{ first_name:'Private Reader', answer_with_books_shelf:{ version:1, books:[...defaults] } } };
const enc = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const session = { access_token:`${enc({alg:'none',typ:'JWT'})}.${enc({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`, refresh_token:'mock', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, token_type:'bearer', user };
async function client(width, signedIn=false) {
 const context = await browser.newContext({viewport:{width,height:950}});
 if(signedIn) await context.addInitScript(value => localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(value)), session);
 await context.addInitScript(() => Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>{window.copied=value;}}}));
 await context.route('https://*.supabase.co/**', async route => {
  const url = new URL(route.request().url()); let result = [];
  if(url.pathname==='/auth/v1/user') {
   if(route.request().method()==='PUT') { const body=route.request().postDataJSON(); writes.push(body); Object.assign(user.user_metadata,body.data); }
   result=user;
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 return {page,context};
}
async function verifyLink(page,ids) {
 await page.locator('[data-shelf-share-dialog][open]').waitFor();
 assert.equal(await page.locator('[data-shelf-share-url]').inputValue(),sharedUrl(ids));
 assert.equal(await page.locator('[data-shelf-share-covers] > div').count(),ids.length);
 assert.doesNotMatch(await page.locator('[data-shelf-share-url]').inputValue(),/private|reader|email|user|token/i);
 await page.locator('[data-copy-shelf-link]').click();
 assert.equal(await page.evaluate(()=>window.copied),sharedUrl(ids));
 assert.match(await page.locator('[data-shelf-share-status]').innerText(),/Link copied/);
}
try {
 for(const width of [1440,390,320]) {
  const {page:p,context}=await client(width);
  await p.goto(origin);await p.locator('[data-share-shelf]:enabled').click();await verifyLink(p,defaults);
  await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`/private/tmp/awb-share-dialog-${width}.png`});
  assert.ok(await p.locator('[data-shelf-share-dialog]').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
  await p.locator('[data-copy-shelf-link]').click();assert.match(await p.locator('[data-shelf-share-status]').innerText(),/Select and copy/);
  assert.equal(await p.locator('[data-shelf-share-url]').evaluate(el=>el.selectionEnd-el.selectionStart),sharedUrl(defaults).length);
  await p.keyboard.press('Escape');assert.equal(await p.locator('[data-share-shelf]').evaluate(el=>el===document.activeElement),true);
  assert.equal(await p.evaluate(()=>document.body.style.overflow),'');
  const requested=[];p.on('request',r=>{if(r.url().includes('/book-prompts/'))requested.push(r.url());});
  await p.goto(sharedUrl(defaults));await p.locator('[data-shared-content]:visible').waitFor();
  assert.deepEqual(await p.locator('[data-shared-book]').evaluateAll(els=>els.map(el=>el.dataset.sharedBook)),defaults);
  assert.equal(await p.locator('[data-shared-book]').count(),5);assert.deepEqual(requested,[]);
  assert.equal(await p.locator('meta[name=robots]').getAttribute('content'),'noindex, follow');
  await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:`/private/tmp/awb-shared-shelf-${width}.png`,fullPage:true});
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const slug of defaults) {
   const card=p.locator(`[data-shared-book="${slug}"]`);await card.locator('[data-copy-shared-book]').click();
   await card.getByText('Copied. Paste into your agent to begin.',{exact:true}).waitFor();
   const copied=await p.evaluate(()=>window.copied);assert.match(copied,/BEGIN BOOK ARTIFACT/);assert.match(copied,/MY TASK/);assert.ok(copied.includes(`/books/${slug}/`));
  }
  assert.equal(requested.length,5);
  const first=p.locator('[data-shared-book]').first();await first.locator('[data-copy-shared-book]').click();assert.equal(requested.length,5,'Repeat copy uses cached prompt');
  await p.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('denied');}}}));
  await first.locator('[data-copy-shared-book]').click();await first.locator('[data-shared-prompt]:visible').waitFor();assert.match(await first.locator('[data-shared-prompt]').inputValue(),/customer interview/);
  await p.reload();await p.locator('[data-reshare-shelf]').click();await verifyLink(p,defaults);
  await context.close();console.log(`PASS ${width}: guest sharing, URL copy and manual fallback, exact public books, real task fetches, cached prompts, and responsive layout.`);
 }
 const {page:p,context}=await client(390,true);await p.goto(origin);await p.locator('[data-personalize-shelf]').click();await p.locator('[data-shelf-preferences]:visible').waitFor();
 await p.locator('[data-clear-shelf]').click();assert.equal(await p.locator('[data-shelf-option] input:checked').count(),0);assert.equal(await p.locator('[data-share-shelf-selection]').isDisabled(),true);assert.equal(await p.locator('[data-save-shelf]').isDisabled(),true);
 await p.locator('[data-shelf-search]').fill('no matching book');await p.locator('[data-shelf-empty]:visible').waitFor();await p.locator('[data-clear-shelf-search]').click();assert.equal(await p.locator('[data-shelf-option]:visible').count(),46);
 const draft=['accelerate','the-mom-test'];for(const id of draft)await p.locator(`[data-shelf-option] input[value="${id}"]`).check();
 await p.screenshot({path:'/private/tmp/awb-share-picker-390.png'});await p.locator('[data-share-shelf-selection]').click();await verifyLink(p,draft);
 await p.keyboard.press('Escape');assert.equal(await p.locator('#shelf-personalizer').evaluate(el=>el.open),true);assert.equal(await p.evaluate(()=>document.body.style.overflow),'hidden');assert.equal(await p.locator('[data-share-shelf-selection]').evaluate(el=>el===document.activeElement),true);
 await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#shelf-personalizer').open && document.body.style.overflow==='');assert.equal(writes.length,0);
 await p.locator('[data-share-shelf]').click();await verifyLink(p,defaults);await p.keyboard.press('Escape');
 await p.locator('[data-personalize-shelf]').click();await p.locator('[data-clear-shelf]').click();
 const saved=['accelerate','atomic-habits','continuous-discovery-habits','crucial-conversations','deep-work'];for(const id of saved)await p.locator(`[data-shelf-option] input[value="${id}"]`).check();
 await p.locator('[data-save-shelf]').click();await p.locator('#shelf-personalizer').waitFor({state:'hidden'});await p.locator('[data-share-shelf]').click();await verifyLink(p,saved);assert.equal(writes.length,1);await context.close();
 console.log('PASS clear selection/search, unsaved share snapshots, nested dialog focus/scroll restoration, no share writes, and sharing the newly saved shelf.');
 const guest=await client(390);const g=guest.page;
 await g.goto(sharedUrl(draft));await g.locator('[data-shared-content]:visible').waitFor();assert.deepEqual(await g.locator('[data-shared-book]').evaluateAll(els=>els.map(el=>el.dataset.sharedBook)),draft);
 await g.route('**/book-prompts/accelerate.json',route=>route.fulfill({status:503,body:'Unavailable'}));
 const card=g.locator('[data-shared-book=accelerate]');await card.locator('[data-copy-shared-book]').click();await card.getByText('The agent task couldn’t load. Please try again.',{exact:true}).waitFor();assert.equal(await card.locator('[data-copy-shared-book]').isEnabled(),true);
 await g.unroute('**/book-prompts/accelerate.json');await card.locator('[data-copy-shared-book]').click();await card.getByText('Copied. Paste into your agent to begin.',{exact:true}).waitFor();assert.match(await g.evaluate(()=>window.copied),/Accelerate/);
 for(const query of ['', '?books=', '?books=unknown-book', '?books=the-mom-test,the-mom-test', '?books=the-mom-test&books=deep-work', `?books=${defaults.join(',')},accelerate`, '?books=%3Cscript%3E']) {
  await g.goto(`${origin}/shelf/${query}`);await g.locator('[data-shared-error]:visible').waitFor();assert.equal(await g.locator('[data-shared-book]').count(),0);
 }
 await g.goto(sharedUrl(['deep-work']));await g.locator('[data-shared-content]:visible').waitFor();assert.equal(await g.locator('[data-shared-count]').textContent(),'1 book');
 assert.deepEqual(errors,[]);await guest.context.close();console.log('PASS fresh guest link, prompt failure/retry, malformed/unknown/duplicate links, one-book share, and no page errors. All auth writes were mocked.');
} finally { await browser.close(); }
