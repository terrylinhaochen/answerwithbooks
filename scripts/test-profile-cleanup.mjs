import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const base='http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context=await browser.newContext();
const page=await context.newPage();
const errors=[], requests=[];
page.on('pageerror',error=>errors.push(error.message));
const user={id:'11111111-1111-4111-8111-111111111111',email:'reader@example.com',email_confirmed_at:new Date().toISOString(),aud:'authenticated',role:'authenticated',user_metadata:{answer_with_books_onboarding:{focus:['Career'],shelf:'Business',goal:'Learn better',chatgpt:{intent:'skip'}}},app_metadata:{provider:'email'}};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=`${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.test`;
await context.route('https://*.supabase.co/**',route=>{
 const path=new URL(route.request().url()).pathname;requests.push(path);
 return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(path.endsWith('/user')?user:[])});
});
try {
 for(const width of [1280,390]) {
  await page.setViewportSize({width,height:950});
  await page.goto(base);await page.evaluate(()=>localStorage.clear());await page.reload();
  assert.ok(await page.locator('header [data-open-newsletter]').isVisible());
  await page.goto(base+'/profile/');await page.waitForURL('**/login/');
  await page.evaluate(({token,user})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock-refresh',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
  await page.goto(base+'/my-books/');await page.waitForURL('**/profile/');
  await page.locator('#library-content').waitFor();
  assert.ok(await page.getByRole('heading',{name:'Saved books',exact:true}).isVisible());
  assert.ok(await page.getByRole('heading',{name:'Your preferences',exact:true}).isVisible());
  assert.match(await page.locator('#profile-preferences').textContent(),/Learn better/);
  assert.equal(await page.locator('a[href="/upload/"], a[href="/community/"]').count(),0);
  assert.doesNotMatch(await page.locator('#library-content').innerText(),/Your mapped content|Collected maps|Open dashboard/);
  assert.equal(await page.locator('header [data-open-newsletter]').isVisible(),false);
  assert.ok(await page.locator('header [data-auth-link]').isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  for(const selector of ['#library-content h1','[data-activity-panel]']) {
   const bounds=await page.locator(selector).boundingBox();
   assert.ok(bounds.x>=0 && bounds.x+bounds.width<=width+1, selector+' stays inside viewport');
  }
  await page.screenshot({path:`/tmp/awb-profile-${width}.png`,fullPage:true});
  await page.goto(base);
  assert.equal(await page.locator('header [data-open-newsletter]').isVisible(),false);
  assert.equal(await page.locator('[data-hide-when-signed-in]').isVisible(),false);
  await page.goto(base+'/profile/');await page.locator('#signout-btn').click();await page.waitForURL(base+'/');
  assert.ok(await page.locator('header [data-open-newsletter]').isVisible());
 }
 assert.ok(!requests.some(path=>/content_maps|content_map_collections/.test(path)), 'Removed feature makes no data requests');
 for(const name of ['confirmation','magic-link']) {
  const html=readFileSync(`supabase/templates/${name}.html`,'utf8');
  assert.equal((html.match(/\{\{ \.ConfirmationURL \}\}/g)||[]).length,1);
  assert.ok(!html.includes('token='));
  await page.setContent(html.replace('{{ .ConfirmationURL }}','#preview-only'));
  for(const width of [600,390]) {
   await page.setViewportSize({width,height:950});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   const box=await page.getByRole('link',{name:name==='confirmation'?'Confirm email address':'Sign in to AWB',exact:true}).boundingBox();
   assert.ok(Math.abs(box.x+box.width/2-width/2)<3,'Email button centered');
   await page.screenshot({path:`/tmp/awb-email-${name}-${width}.png`});
  }
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: single profile, legacy redirect, preferences, signed-out guard, signed-in CTA hiding, signout, no map queries, desktop/mobile and centered email previews. Auth mocked; email templates not applied or sent.');
} finally {await browser.close();}
