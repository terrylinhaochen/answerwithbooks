import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4323';
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[];const results=[];
try {
 for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000},permissions:['clipboard-read','clipboard-write']});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');await page.waitForSelector('[data-agent-demo][data-demo-enhanced]');const no=page.getByRole('button',{name:'No thanks',exact:true});if(await no.isVisible())await no.click();
 assert.equal(await page.locator('meta[name=robots]').getAttribute('content').then(s=>s.includes('noindex')),false);
 await page.locator('[data-agent-demo]').scrollIntoViewIfNeeded();
 const initial=await page.locator('[data-demo-reveal][data-visible=true]').count();const total=await page.locator('[data-demo-reveal]').count();assert.ok(initial<total);
 await page.locator('[data-demo-scroll]').evaluate(e=>{e.scrollTop=e.scrollHeight;e.dispatchEvent(new WheelEvent('wheel',{deltaY:100,bubbles:true}));});
 assert.ok(await page.locator('[data-demo-reveal][data-visible=true]').count()<total,'scroll must not reveal every step');
 await page.waitForFunction(()=>document.querySelector('[data-demo-run-state]').textContent==='Ready to read',{},{timeout:30000});
 assert.equal(await page.locator('[data-demo-reveal][data-visible=true]').count(),total);
 for(const path of ['/books/','/tools/','/guides/']){const r=await page.goto(origin+path);assert.equal(r.status(),200);await page.waitForTimeout(1400);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,path+' fits');const logos=await page.locator('img.brand-mark').evaluateAll(xs=>xs.map(i=>i.complete&&i.naturalWidth>0));assert.ok(logos.length>=2&&logos.every(Boolean));
 if(path==='/books/'){assert.equal(await page.locator('[data-filter-item]').count(),13);assert.equal(await page.getByText('The Mom Test',{exact:true}).count(),0);await page.locator('[data-filter-search]').fill('Shoe Dog');await page.locator('[data-filter-item]:visible .library-cover').click();assert.equal(await page.locator('dialog[open]').count(),1);await page.keyboard.press('Escape');}
 if(path==='/tools/'){await page.getByRole('button',{name:'Install skill',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-copy-status]').textContent==='Copied.');assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/https:\/\/answerwithbooks.com\/SKILL.md/);}
 }
 results.push({width,autoplaySteps:total,logos:true,books:13,copy:true});await page.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({origin,results,errors}));
}finally{await browser.close();}
