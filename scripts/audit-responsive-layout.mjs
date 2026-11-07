import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
const output=process.env.AWB_LAYOUT_OUTPUT||'/tmp/awb-responsive-layout';
mkdirSync(output,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const origin=process.env.AWB_TEST_ORIGIN||'https://answerwithbooks.com';
const sizes=JSON.parse(process.env.AWB_LAYOUT_SIZES||'[[320,568],[390,844],[430,932],[768,1024],[844,390],[1024,768],[1280,800],[1920,1080]]');
const routes=[['home','/'],['books','/books/'],['skills','/tools/'],['guides','/guides/'],['billing','/billing/'],['book','/books/read/?id=3570e47e-0e64-4c62-87da-cdc08484302c'],['guide','/guides/read/?id=f4d44ec6-118a-4ec7-8b1b-17824b2e243e']];
const results=[];
const measure=()=>{
 const visible=e=>{const r=e.getBoundingClientRect();return !e.closest('[aria-hidden="true"]')&&r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'};
 const out=[...document.querySelectorAll('h1,h2,h3,p,button,input,textarea,nav,a')].filter(visible).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+2||r.left< -2}).map(e=>({tag:e.tagName,text:e.textContent.slice(0,65),class:e.className}));
 const dialogs=[...document.querySelectorAll('dialog[open]')].map(e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,scrollable:e.scrollHeight>e.clientHeight,overflowX:e.scrollWidth>e.clientWidth+2}});
 return {overflow:document.documentElement.scrollWidth>innerWidth+1,dialogs,out:out.slice(0,12),heading:document.querySelector('h1')?.innerText};
};
for(const [width,height] of sizes){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
 for(const [name,path] of routes.filter(([name])=>!process.env.AWB_LAYOUT_ROUTES||process.env.AWB_LAYOUT_ROUTES.split(',').includes(name))){const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));const res=await page.goto(origin+path,{waitUntil:'domcontentloaded'});await page.waitForTimeout(name==='book'||name==='guide'?1400:550);await page.evaluate(()=>document.fonts.ready);
 if(name==='guide')await page.locator('[data-reader]:not([hidden])').waitFor({timeout:30000});
 if(name==='book')await page.getByRole('heading',{name:'How to Be Rich',exact:true}).first().waitFor({timeout:30000});
 const no=page.getByRole('button',{name:'No thanks',exact:true});if(await no.isVisible())await no.click();
 const result={name,width,height,status:res.status(),...await page.evaluate(measure),errors};results.push(result);
 await page.screenshot({path:`${output}/${name}-${width}.png`});
 if(name==='home'){for(const [part,selector] of [['demo','[data-agent-demo]'],['install','#install'],['footer','#site-footer']]){await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(120);await page.screenshot({path:`${output}/${part}-${width}.png`});}}
 if(name==='books'){
 await page.locator('[data-filter-search]').fill('Shoe Dog');await page.locator('[data-filter-item]:visible .library-cover').click();await page.waitForTimeout(100);results.push({name:'book-dialog',width,height,...await page.evaluate(measure)});await page.screenshot({path:`${output}/book-dialog-${width}.png`});await page.keyboard.press('Escape');}
 if(name==='guides'){
 await page.locator('[data-open-skill-install]').first().click();results.push({name:'install-dialog',width,height,...await page.evaluate(measure)});await page.screenshot({path:`${output}/install-dialog-${width}.png`});await page.keyboard.press('Escape');}
 if(name==='book'){
 const excerpt=page.locator('[data-find-excerpt]').first();if(await excerpt.isVisible()){await excerpt.click();await page.waitForTimeout(200);results.push({name:'guide-dialog',width,height,...await page.evaluate(measure)});await page.screenshot({path:`${output}/guide-dialog-${width}.png`});}}
 await page.close();
 }
 await context.close();console.log('finished width',width);writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));
}
await browser.close();console.log(JSON.stringify(results.filter(r=>r.overflow||r.out.length||r.errors?.length||r.dialogs.some(d=>d.top<0||d.bottom>r.height+2||d.overflowX)),null,2));

const failures=results.filter(r=>r.status&&r.status!==200||r.overflow||r.out.length||r.errors?.length||r.dialogs.some(d=>d.top<0||d.bottom>r.height+2||d.overflowX));
assert.deepEqual(failures,[], 'Responsive layout must fit without runtime errors');
console.log(`${results.length} page/dialog layouts passed`);
