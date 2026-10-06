import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const defaults=['the-mom-test','thinking-fast-and-slow','designing-your-life','atomic-habits','deep-work'];
const selected=[...defaults.slice(1),'accelerate'];
const makeUser=(id,email)=>({id,email,aud:'authenticated',role:'authenticated',email_confirmed_at:'2026-10-01T00:00:00Z',user_metadata:{first_name:'Terry',preserve_this:'unchanged'}});
const users={a:makeUser('00000000-0000-4000-8000-000000000001','reader@example.test'),b:makeUser('00000000-0000-4000-8000-000000000002','another@example.test')};
const session=user=>{const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');return {access_token:`${enc({alg:'none',typ:'JWT'})}.${enc({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`,refresh_token:'mock',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};};
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
let failSave=false;const writes=[];const otp=[];
async function client(key,width=1440,staleMetadata=false){
 const context=await browser.newContext({viewport:{width,height:950}});let active=key;
 if(key)await context.addInitScript(value=>{if(!sessionStorage.getItem('test-auth-seeded')){localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(value));sessionStorage.setItem('test-auth-seeded','1');}},session(staleMetadata?{...users[key],user_metadata:{first_name:'Reader'}}:users[key]));
 await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}}));
 await context.route('https://*.supabase.co/**',async route=>{
  const url=new URL(route.request().url()),method=route.request().method();let body;try{body=route.request().postDataJSON();}catch{}
  let result=[],status=200;
  if(url.pathname==='/auth/v1/user'){
   if(!active){status=401;result={msg:'Missing session'};}
   else if(method==='PUT'){
    writes.push(body);
    if(failSave){status=500;result={msg:'Simulated save failure'};}
    else {users[active].user_metadata={...users[active].user_metadata,...body.data};result=users[active];}
   }else result=users[active];
  }else if(url.pathname==='/auth/v1/otp'){otp.push(url);result={};}
  else if(url.pathname==='/auth/v1/token'){active='a';result=session(users.a);}
  else if(url.pathname==='/auth/v1/logout'){active=null;result={};}
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
 });
 const page=await context.newPage();page.setDefaultTimeout(30000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {context,page,errors};
}
const slugs=page=>page.locator('[data-pick-book]').evaluateAll(els=>els.map(el=>el.dataset.bookSlug));
const waitShelf=async(page,ids)=>page.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('[data-pick-book]')].map(el=>el.dataset.bookSlug))===JSON.stringify(expected),ids);
try{
 const guest=await client(null,390),g=guest.page;await g.goto(origin);await g.locator('[data-personalize-shelf]').click();await g.locator('[data-shelf-signin]:visible').waitFor();
 assert.equal(await g.getByRole('link',{name:'Sign in to personalize'}).getAttribute('href'),'/login/?from=shelf');assert.equal(await g.getByRole('link',{name:'Create an account',exact:true}).getAttribute('href'),'/signup/?from=shelf');
 await g.getByRole('link',{name:'Sign in to personalize'}).click();await g.locator('#email').fill('reader@example.test');await g.locator('#submit-btn').click();await g.getByText(/If this email has an Answer with Books account/).waitFor().catch(async error=>{console.log({url:g.url(),email:await g.locator('#email').inputValue(),message:await g.locator('#form-message').textContent(),otpRequests:otp.length,errors:guest.errors});throw error;});assert.equal(new URL(otp.at(-1).searchParams.get('redirect_to')).search,'?from=shelf');
 await g.locator('[data-login-mode]').click();await g.locator('#password').fill('local-test-password');await g.locator('#submit-btn').click();await g.waitForURL(url=>url.pathname==='/'&&(!url.search||url.search.includes('personalize')));await g.locator('#shelf-personalizer[open] [data-shelf-preferences]:visible').waitFor();
 await g.goto(origin+'/auth/confirm/?from=shelf');await g.waitForURL(url=>url.pathname==='/');await g.locator('#shelf-personalizer[open] [data-shelf-preferences]:visible').waitFor();
 console.log('PASS guest sign-in gate, email return destination, confirmed-session callback, and password sign-in return to open shelf picker.');await guest.context.close();
 const first=await client('a'),p=first.page;await p.goto(origin);await waitShelf(p,defaults);await p.locator('[data-personal-shelf-heading]:visible').waitFor();assert.equal(await p.locator('[data-shelf-owner]').innerText(),'Terry’s');assert.match(await p.locator('[data-shelf-description]').innerText(),/Start with these five/);assert.doesNotMatch(await p.locator('body').innerText(),/—/);
 await p.locator('[data-personalize-shelf]').click();await p.locator('[data-shelf-preferences]:visible').waitFor();assert.equal(await p.locator('[data-shelf-option]').count(),46);
 assert.equal(await p.locator('[data-shelf-option] input[value=accelerate]').isDisabled(),true);
 await p.getByRole('button',{name:'Remove The Mom Test',exact:true}).click();assert.equal(await p.locator('[data-save-shelf]').isDisabled(),true);await p.locator('[data-shelf-search]').fill('Accelerate');await p.locator('[data-shelf-option] input[value=accelerate]').check();await p.locator('[data-save-shelf]').click();await p.locator('#shelf-personalizer').waitFor({state:'hidden'});await waitShelf(p,selected);
 assert.equal(await p.locator('[data-personalize-label]').innerText(),'Edit shelf');assert.match(await p.locator('[data-shelf-description]').innerText(),/Your collection/);assert.equal(users.a.user_metadata.preserve_this,'unchanged');assert.deepEqual(Object.keys(writes.at(-1).data),['answer_with_books_shelf']);
 await p.reload();await waitShelf(p,selected);
 await p.locator('[data-book-slug=accelerate]').focus();await p.keyboard.press('Enter');await p.locator('[data-detail-copy]:enabled').waitFor();await p.locator('[data-detail-copy]').click();assert.match(await p.evaluate(()=>window.copied),/Accelerate/);assert.match(await p.evaluate(()=>window.copied),/BEGIN BOOK ARTIFACT/);assert.match(await p.evaluate(()=>window.copied),/MY TASK/);await p.keyboard.press('Escape');
 await p.locator('[data-pick-book="0"]').focus();await p.keyboard.press('ArrowRight');assert.notEqual(await p.locator('[data-book-place]').first().evaluate(el=>el.style.getPropertyValue('--drag-x')),'');
 failSave=true;await p.locator('[data-personalize-shelf]').click();await p.locator('[data-shelf-defaults]').click();await p.locator('[data-save-shelf]').click();await p.getByText(/We couldn’t save your shelf/).waitFor();assert.deepEqual(await slugs(p),selected);await p.locator('[data-close-shelf-picker]').click();failSave=false;
 await p.locator('[data-personalize-shelf]').click();assert.equal(await p.getByRole('button',{name:'Remove Accelerate',exact:true}).count(),1);await p.keyboard.press('Escape');
 console.log('PASS account persistence, unchanged unrelated metadata, reload, personalized book prompt, keyboard movement, and failed-save rollback.');
 const fresh=await client('a',320,true);await fresh.page.goto(origin);await waitShelf(fresh.page,selected);assert.equal(await fresh.page.locator('[data-shelf-owner]').innerText(),'Terry’s');await fresh.page.evaluate(()=>document.fonts.ready);await fresh.page.screenshot({path:'/private/tmp/awb-terrys-shelf-mobile.png'});assert.ok(await fresh.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await fresh.page.locator('[data-personalize-shelf]').click();await fresh.page.locator('[data-shelf-preferences]:visible').waitFor();await fresh.page.screenshot({path:'/private/tmp/awb-personalize-mobile.png'});assert.ok(await fresh.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await fresh.context.close();
 users.b.user_metadata={full_name:'Avery Chen'};const other=await client('b');await other.page.goto(origin);await other.page.locator('[data-personal-shelf-heading]:visible').waitFor();await waitShelf(other.page,defaults);assert.equal(await other.page.locator('[data-shelf-owner]').innerText(),'Avery’s');await other.context.close();
 await p.goto(origin+'/profile/');await p.locator('#signout-btn').click();await p.waitForURL(origin+'/');await waitShelf(p,defaults);await p.locator('[data-personalize-shelf]').click();await p.locator('[data-shelf-signin]:visible').waitFor();assert.equal(await p.locator('[data-public-shelf-heading]').isVisible(),true);assert.equal(await p.locator('[data-personal-shelf-heading]').isVisible(),false);
 assert.deepEqual(first.errors,[]);assert.deepEqual(guest.errors,[]);assert.deepEqual(fresh.errors,[]);assert.deepEqual(other.errors,[]);
 console.log('PASS fresh browser readback, mobile picker, account isolation, sign-out reset, and no page errors. All auth writes were mocked.');await first.context.close();
}finally{await browser.close();}
