import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:900}});
 await page.goto('http://127.0.0.1:4321/tools/');
 assert.deepEqual((await page.locator('nav[aria-label=Main] a').allTextContents()).map(s=>s.trim()),['Books','Guides','Skills']);
 assert.equal(await page.getByRole('link',{name:'Try an example'}).count(),0);
 assert.ok(await page.locator('footer a[href="https://docs.answerwithbooks.com"]').count());
 await page.locator('#install-skill').click();await page.locator('#skill-install-dialog[open]').waitFor();
 const prompt=await page.locator('#skill-install-dialog [data-command-text]').first().innerText();
 assert.ok(prompt.includes('https://docs.answerwithbooks.com/guide/quickstart-skill'));assert.ok(prompt.includes('https://answerwithbooks.com/SKILL.md'));
 await page.screenshot({path:'/private/tmp/awb-docs-install-mobile.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.addInitScript(()=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'fixture',email:'fixture@example.test',aud:'authenticated',user_metadata:{}}})));
 await page.route('https://*.supabase.co/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify(route.request().url().includes('book-process')?{books:[]}:[])}));
 await page.goto('http://127.0.0.1:4321/profile/');await page.locator('#library-content:visible').waitFor();
 assert.deepEqual((await page.locator('nav[aria-label="Account settings"] a').allTextContents()).map(s=>s.trim()),['Your guides','Billing']);
 assert.equal(await page.getByRole('link',{name:'Processing queue',exact:true}).count(),0);
 assert.equal(await page.getByRole('link',{name:'Manage Skills',exact:true}).count(),0);
 assert.equal(await page.getByRole('link',{name:'Manage existing API keys'}).isVisible(),false);
 await page.screenshot({path:'/private/tmp/awb-simple-profile-mobile.png'});
 console.log('PASS simple navigation, docs in footer, docs-first install prompt, mobile dialog, and simplified authenticated profile (fixture).');
}finally{await browser.close()}
