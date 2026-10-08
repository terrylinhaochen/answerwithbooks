import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';

const base = process.env.AWB_TEST_URL || 'http://127.0.0.1:4321';
const root = new URL('../', import.meta.url);
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const entries = readdirSync(new URL('src/content/books/', root)).filter(name => name.endsWith('.md'));
const verified = JSON.parse(readFileSync(new URL('docs/book-purchase-catalog.json', root), 'utf8'));
const expectedUrl = 'https://www.amazon.com/dp/1492180742';
const bookUrl = `${base}/books/the-mom-test/#buy-the-book`;
try {
 const page = await browser.newPage();
 for (const file of entries) {
  const slug = file.slice(0,-3);
  const html = readFileSync(new URL(`dist/books/${slug}/index.html`, root), 'utf8');
  const state = await page.evaluate(html => {
   const doc = new DOMParser().parseFromString(html, 'text/html');
   const link = doc.querySelector('[data-book-purchase]');
   const card = doc.querySelector('#buy-the-book');
   const digest = doc.querySelector('[data-reading-content]');
   const agent = doc.querySelector('[data-book-agent]');
   return { count: doc.querySelectorAll('[data-book-purchase]').length, href: link?.getAttribute('href'), slug: link?.dataset.bookSlug, target: link?.target, rel: link?.rel, afterDigest: Boolean(digest?.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING), beforeAgent: Boolean(card?.compareDocumentPosition(agent) & Node.DOCUMENT_POSITION_FOLLOWING) };
  }, html);
  const record = verified.find(record => record.slug === slug);
  assert.ok(record, `${slug}: verified catalog record`);
  assert.equal(state.href, `https://www.amazon.com/dp/${record.asin}`, slug);
  assert.equal(state.slug, slug);assert.equal(state.count, 1);
  assert.equal(state.target, '_blank');assert.match(state.rel, /noopener/);assert.match(state.rel, /noreferrer/);
  assert.ok(state.afterDigest && state.beforeAgent, `${slug}: purchase card between digest and agent`);
 }
 console.log(`PASS ${entries.length} books: verified destinations, one card each, correct placement, no affiliate tags.`);
 await page.close();
 const cases = [
  {name:'default off'},
  {name:'consent on',value:'on',events:1},
  {name:'consent off',value:'off'},
  {name:'expired consent',value:'on',age:181*86400000},
  {name:'future consent',value:'on',age:-86400000},
  {name:'Do Not Track',value:'on',dnt:true},
  {name:'Global Privacy Control',value:'on',gpc:true},
  {name:'JavaScript disabled',javaScriptEnabled:false},
 ];
 for (const test of cases) {
  const context = await browser.newContext({javaScriptEnabled:test.javaScriptEnabled !== false});
  let analyticsLoads = 0;
  await context.route('https://www.googletagmanager.com/**', route => { analyticsLoads++; return route.fulfill({contentType:'application/javascript',body:'/* isolated analytics acceptance test */'}); });
  await context.route('https://www.amazon.com/**', route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>Outbound destination test</title>'}));
  await context.addInitScript(test => {
   if(test.value && !localStorage.getItem('awb:test:consent-seeded')) { localStorage.setItem('awb:analytics-consent:v1',JSON.stringify({value:test.value,at:Date.now()-(test.age||0)}));localStorage.setItem('awb:test:consent-seeded','yes'); }
   if(test.dnt) Object.defineProperty(navigator,'doNotTrack',{get:()=> '1'});
   if(test.gpc) Object.defineProperty(navigator,'globalPrivacyControl',{get:()=>true});
  }, test);
  const page = await context.newPage();await page.goto(bookUrl);
  const outbound = async (kind='click') => {
   const popupPromise = context.waitForEvent('page');
   const link = page.locator('[data-book-purchase]');
   if (kind === 'keyboard') { await link.focus();await page.keyboard.press('Enter'); }
   else await link.click(kind === 'middle' ? {button:'middle'} : {});
   const popup = await popupPromise;await popup.waitForURL(expectedUrl);
   assert.equal(await popup.evaluate(()=>window.opener===null), true);
   await popup.close();
  };
  await outbound();
  const getEvents = () => page.evaluate(()=>(window.dataLayer||[]).filter(args=>args[0]==='event'&&args[1]==='book_purchase_click').map(args=>args[2]));
  const events = await getEvents();assert.equal(events.length,test.events||0,test.name);
  assert.equal(analyticsLoads,test.events||0,test.name);
  if(test.events){
   assert.equal(events[0].book_slug,'the-mom-test');assert.equal(events[0].product_id,'1492180742');assert.equal(events[0].marketplace,'US');assert.equal(events[0].placement,'digest_end');assert.equal(events[0].link_url,expectedUrl);
   await outbound('middle');await outbound('keyboard');assert.equal((await getEvents()).length,3,'exactly one event per mouse, middle, keyboard action');
   await page.evaluate(()=>{window.gtag=()=>{throw new Error('simulated unavailable analytics');};});
   await outbound(); // Analytics failure cannot block the native link.
   await page.goto(`${base}/privacy/`);
   await page.getByRole('button',{name:'Keep analytics off',exact:true}).click();await page.waitForTimeout(300);
   await page.goto(bookUrl);await outbound();assert.equal((await getEvents()).length,0,'withdrawal persists');
  }
  console.log(`PASS ${test.name}: outbound link works; ${test.events?'consented event and withdrawal verified':'no purchase event'}.`);
  await context.close();
 }
 for (const width of [1280,390,320]) {
  const page = await browser.newPage({viewport:{width,height:900}});await page.goto(bookUrl);await page.evaluate(()=>document.fonts.ready);
  await page.locator('#buy-the-book').evaluate(el=>el.scrollIntoView());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`/private/tmp/book-purchase-${width}.png`});await page.close();
 }
 console.log('PASS responsive purchase card at 1280, 390, and 320px.');
} finally { await browser.close(); }
