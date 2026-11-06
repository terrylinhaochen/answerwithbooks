import assert from 'node:assert/strict';import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const id='9004d927-7785-4c3a-acf1-647f732485f7';
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[];
try{for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 const metrics=()=>page.evaluate(()=>{const article=document.querySelector('main article')||document.querySelector('article'),h=document.querySelector('h1'),panel=document.querySelector('[data-reading-content]'),prose=panel.querySelector('.prose-awb');return {articleWidth:article.getBoundingClientRect().width,titleFont:getComputedStyle(h).fontFamily,titleSize:getComputedStyle(h).fontSize,panelRadius:getComputedStyle(panel).borderRadius,panelPadding:getComputedStyle(panel).padding,proseSize:getComputedStyle(prose).fontSize,proseLine:getComputedStyle(prose).lineHeight};});
 await page.goto(origin+'/books/the-structure-of-scientific-revolutions/',{waitUntil:'domcontentloaded'});const original=await metrics();
 const faq=page.getByText('What is The Structure of Scientific Revolutions useful for?',{exact:true});await faq.click();assert.ok(await faq.locator('xpath=ancestor::details').getAttribute('open')!==null);
 await page.goto(`${origin}/books/read/?id=${id}`,{waitUntil:'domcontentloaded'});await page.locator('[data-book-body]').waitFor({state:'visible'});assert.deepEqual(await metrics(),original);
 assert.equal(await page.locator('[data-book-title]').innerText(),'Invention: A Life');assert.equal(await page.locator('[data-shared-excerpt]:enabled').count(),1);
 assert.equal(await page.locator('[data-content-feedback]').getAttribute('data-content-slug'),id);
 const cards=page.locator('[data-book-questions] > [data-question-item]');assert.equal(await cards.count(),3);assert.equal(await page.locator('[data-book-questions] a[href="#"]').count(),0);
 await page.locator('[data-book-questions]').scrollIntoViewIfNeeded();const consent=page.getByRole('button',{name:'No thanks',exact:true});if(await consent.isVisible())await consent.click();
 const first=cards.first(),question=await first.locator('h3').innerText();assert.equal(await first.locator('[data-question-context]').isVisible(),false);await first.locator('summary').click();assert.ok(await first.locator('[data-question-context]').isVisible());
 await page.locator('[data-book-questions]').screenshot({path:`/private/tmp/awb-book-questions-${width}.png`});
 await first.getByRole('button',{name:'Explore this question'}).click();await page.locator('[data-guide-dialog]').waitFor({state:'visible'});assert.equal(await page.locator('#guide-modal-question').inputValue(),question);assert.equal(await page.locator('[data-selected-books] strong').innerText(),'Invention: A Life');await page.keyboard.press('Escape');
 assert.equal(await page.locator('[data-more-questions]').count(),0);assert.equal(await page.locator('[data-book-questions] [data-question-item]').count(),3);
 await page.locator('[data-shared-book] header').scrollIntoViewIfNeeded();await page.locator('[data-book-cover] img').evaluate(img=>img.loading='eager');await page.waitForFunction(()=>document.querySelector('[data-book-cover] img').dataset.coverFitted==='true');
 await page.locator('[data-shared-book] header').screenshot({path:`/private/tmp/awb-book-header-${width}.png`});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.close();
}assert.deepEqual(errors,[]);console.log('PASS original/uploaded template parity, live Dyson content, three question disclosures without more, source-prefilled guide modal, feedback identity, and desktop/mobile layout. No guide generation or feedback submitted.');}finally{await browser.close()}
