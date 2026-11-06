// Independently gated endpoints prove the personal shelf has no public/billing dependency.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:'fixture-only',refresh_token:'fixture-only',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id:'fixture-owner',aud:'authenticated'}})));
  let release,fail=false,lists=0;const gate=new Promise(resolve=>release=resolve),started=new Set();
  await context.route('**/functions/v1/reader-subscription',async route=>{started.add('plan');await gate;await route.fulfill({status:503,json:{error:'Billing unavailable'}});});
  await context.route('**/functions/v1/reading-guides',async route=>{
   const body=route.request().postDataJSON();started.add(body.action);
   if(body.action==='public-list'){await gate;return route.fulfill({status:503,json:{error:'Public list unavailable'}});}
   assert.equal(body.action,'list');assert.equal(body.includeBooks,false);lists++;
   if(fail)return route.fulfill({status:503,json:{error:'Temporary shelf error'}});
   return route.fulfill({json:{guides:[{id:'saved',question:'My saved guide',status:'ready',cover:{status:'none'}}]}});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4321/guides/#your-guides');
  await page.locator('[data-saved-guides] h3').waitFor({timeout:5000});
  assert.equal(await page.locator('[data-saved-guides] h3').innerText(),'My saved guide');assert.equal(await page.locator('[data-open-saved-guides]').isVisible(),true);assert.equal(await page.locator('[data-open-saved-guides]').getAttribute('href'),'#your-guides');
  assert.equal(await page.locator('[data-your-guides]').getAttribute('aria-busy'),'false');
  assert.ok((await page.locator('[data-your-guides]').boundingBox()).y<200,'Saved-guides link scrolls after asynchronous shelf load');
  assert.ok(started.has('plan'));assert.ok(started.has('public-list'));
  release();
  fail=true;await page.reload();await page.getByText('Could not load your guides.',{exact:true}).waitFor();
  fail=false;await page.locator('[data-your-guides]').getByRole('button',{name:'Try again',exact:true}).click();await page.locator('[data-saved-guides] h3').waitFor();
  assert.equal(lists,3);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
  await context.close();
  const guest=await browser.newContext();let privateCalls=0;
  await guest.route('**/functions/v1/reading-guides',route=>{if(route.request().postDataJSON().action==='list')privateCalls++;return route.fulfill({json:{guides:[]}});});
  const guestPage=await guest.newPage();await guestPage.goto('http://127.0.0.1:4321/guides/');await guestPage.waitForTimeout(300);
  assert.equal(await guestPage.locator('[data-your-guides]').isVisible(),false);assert.equal(privateCalls,0);
  console.log('PASS personal shelf renders while public/billing requests remain blocked; visible failure/retry; mobile fit; no guest shelf or private fetch.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
