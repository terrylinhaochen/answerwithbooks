import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const baseURL = process.env.AWB_BASE_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const routes = ['/','/books/','/books/the-mom-test/','/guides/','/guides/github-lead-research/','/answers/how-to-make-a-plan-that-survives-contact-with-reality/','/tools/','/topics/','/newsletter/','/login/','/signup/','/onboarding/start/','/your-book/','/upload/','/ask/','/community/','/billing/','/api-keys/','/privacy/','/terms/','/editorial/','/404/'];
const user = {id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',role:'authenticated',aud:'authenticated',user_metadata:{first_name:'Reader'},email_confirmed_at:'2026-10-01T00:00:00Z'};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = `${encode({alg:'none',typ:'JWT'})}.${encode({sub:user.id,aud:'authenticated',role:'authenticated',email:user.email,exp:Math.floor(Date.now()/1000)+3600})}.mock-signature`;
try {
 for (const width of [1440,390,320]) {
  const context = await browser.newContext({baseURL,viewport:{width,height:950}});
  await context.route('https://*.supabase.co/**', async route => {
   const url=new URL(route.request().url());
   const value=url.pathname==='/auth/v1/user'?user:[];
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  });
  await context.addInitScript(() => {
   window._copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window._copied=text;}}});
  });
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const route of routes) {
   const response=await page.goto(route,{waitUntil:'domcontentloaded'});assert.ok(response.status()<400||route==='/404/',`route exists ${route}`);
   if(route==='/ask/') await page.waitForURL('**/tools/');
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('body').getAttribute('data-theme'),'collector',route);
   const overflow=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(overflow.scroll<=overflow.width+1,`${width} ${route} overflow ${JSON.stringify(overflow)}`);
   if(width===1440||width===390) if(['/tools/','/books/','/guides/','/books/the-mom-test/','/login/'].includes(route)) await page.screenshot({path:`/private/tmp/awb-global-${route.replaceAll('/','-')}-${width}.png`,fullPage:route==='/tools/'});
   if(route==='/'){
    assert.equal(await page.locator('[data-shelf-lab]').getAttribute('data-direction'),'table');
    assert.ok(await page.locator('#home-intro').evaluate(el=>el.getBoundingClientRect().top>=innerHeight-2));
    assert.equal(await page.locator('#install a, #install button').count(),1);
    assert.equal(await page.locator('.library-book [data-copy-public-book]').count(),0);assert.equal(await page.locator('.library-book .library-cover[href^="/books/"]').count(),8);
   }
  }
  await page.goto('/tools/');
  assert.equal(await page.locator('[data-capability]').count(),0,'broader research directory removed from AWB page');
  for(let i=0;i<6;i++){
   await page.locator(`[data-example-tab="${i}"]`).click();
   const panel=page.locator(`[data-example-panel="${i}"]`);assert.equal(await panel.isVisible(),true);
   await panel.locator('[data-copy-example]').click();const copied=await page.evaluate(()=>window._copied);
   assert.ok(copied.length>1000);assert.match(copied,/BEGIN BOOK ARTIFACT/);assert.match(copied,/MY TASK/);assert.match(copied,/https:\/\/answerwithbooks.com\/books\//);assert.doesNotMatch(copied,/undefined/);
  }
  await page.locator('[data-example-tab="5"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-example-tab="0"]').getAttribute('aria-selected'),'true');
  await page.locator('[data-example-tab="0"]').focus();await page.keyboard.press('End');assert.equal(await page.locator('[data-example-tab="5"]').getAttribute('aria-selected'),'true');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('blocked')}}}));
  await page.locator('[data-example-panel="5"] [data-copy-example]').click();assert.equal(await page.locator('[data-example-panel="5"] [data-example-prompt]').isVisible(),true,'manual copy fallback');
  await page.locator('[data-open-book-request]').first().click();assert.equal(await page.locator('#book-upload-dialog').evaluate(el=>el.open),true);
  await page.keyboard.press('Escape');
  await page.goto('/books/');await page.locator('[data-filter-search]').fill('Mom Test');assert.match(await page.locator('[data-filter-count]').innerText(),/^1 book$/);assert.equal(await page.locator('[data-filter-item]:visible').count(),1);
  await page.goto('/books/the-mom-test/');await page.locator('[data-copy-book-agent]').click();assert.match(await page.evaluate(()=>window._copied),/BEGIN BOOK ARTIFACT/);
  assert.equal(await page.locator('.book-cover__overlay').count(),0,'old cover overlays removed');assert.ok(await page.locator('.book-cover .jacket-pages').count()>0,'shared dimensional jackets');
  await page.goto('/tools/?setup=try&agent=codex');await page.waitForURL('**/api-keys/?from=tools&agent=codex');
  await page.goto('/profile/');await page.waitForURL('**/login/');
  await page.evaluate(({token,user})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock-refresh-token',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user})),{token,user});
  await page.goto('/profile/');await page.locator('#library-content').waitFor({state:'visible'});
  assert.match(await page.locator('.profile-title').innerText(),/Reader/);await page.locator('[data-open-book-request]').click();assert.equal(await page.locator('#book-upload-dialog').evaluate(el=>el.open),true);await page.keyboard.press('Escape');
  await page.screenshot({path:`/private/tmp/awb-global-profile-${width}.png`,fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert.deepEqual(errors,[],`${width} browser errors`);
  console.log(`PASS ${width}px: ${routes.length} routes, consistent theme, shelf viewport, task copy, tab keyboard controls, clipboard fallback, upload dialog, library filter, public handoff, mocked profile and auth guard.`);
  await context.close();
 }
} finally {await browser.close();}
