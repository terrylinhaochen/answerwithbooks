import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const user='00000000-0000-4000-8000-000000000001',book='00000000-0000-4000-8000-000000000002',guide='00000000-0000-4000-8000-000000000003';
const books=[{id:book,title:'Source for a meaningful question',author:'Example author'}];
const q='How do I become easier to help?';
async function context(signedIn=false,draft=null){
 const ctx=await browser.newContext({viewport:{width:390,height:844}});const actions=[];
 await ctx.addInitScript(({signedIn,user,draft})=>{
  if(signedIn){const exp=Math.floor(Date.now()/1000)+3600;const b=x=>btoa(JSON.stringify(x)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:b({alg:'HS256',typ:'JWT'})+'.'+b({sub:user,exp,role:'authenticated'})+'.synthetic',refresh_token:'synthetic',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id:user,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid'}}));}
  if(draft){localStorage.setItem('awb:guide-review:v1:'+draft.id,JSON.stringify({...draft,savedAt:Date.now()}));localStorage.setItem('awb:pending-guide-review',draft.id);}
 },{signedIn,user,draft});
 await ctx.route('https://yozeqanibszoxnowmvsm.supabase.co/**',async route=>{
  const request=route.request(),url=request.url();let body={};try{body=request.postDataJSON()||{};}catch{}
  let result={};
  if(url.includes('/auth/'))result={id:user,email:'fixture@example.invalid'};
  else if(url.includes('shared-library'))result={books,nextOffset:null};
  else if(url.includes('reader-subscription'))result={active:false,used:0,limit:3};
  else if(url.includes('reading-guides')){
   actions.push(body);
   if(body.action==='list'||body.action==='public-list')result={guides:[]};
   else if(body.action==='propose'||body.action==='create'||body.action==='confirm')result={id:guide};
   else if(body.action==='get')result={guide:{id:guide,status:'awaiting_confirmation',question:q,proposal:{books,connection:'An example worth inspecting.',matches:[{bookId:book,title:books[0].title,reason:'A concrete scene shows how to invite candid advice.'}]}},books};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result),headers:{'access-control-allow-origin':'*'}});
 });
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {ctx,page,actions,errors};
}
try{
 const a=await context();await a.page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:4327')+'/guides/');
 await a.page.locator('[data-guide-launcher] textarea').fill(q);await a.page.locator('[data-guide-launcher] button[type=submit]').click();
 await a.page.locator('[data-guide-login]').waitFor({state:'visible'});assert.match(await a.page.locator('[data-guide-login]').getAttribute('href'),/resume=/);assert.equal(a.actions.some(x=>['propose','create','confirm'].includes(x.action)),false);
 await a.page.locator('[data-close-guide]').click();await a.page.locator('[data-choose-guide-books]').click();
 await a.page.locator('[data-guide-book-choices] input').first().check();await a.page.locator('[data-guide-question] button[type=submit]').click();
 await a.page.locator('[data-guide-proposal]').waitFor({state:'visible'});assert.equal(await a.page.locator('[data-proposal-label]').textContent(),'Your selected books');assert.equal(a.actions.some(x=>['propose','create','confirm'].includes(x.action)),false);
 assert.equal(await a.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(a.errors,[]);await a.ctx.close();
 const b=await context(true);await b.page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:4327')+'/guides/');await b.page.locator('[data-guide-launcher] textarea').fill(q);await b.page.locator('[data-guide-launcher] button[type=submit]').click();
 await b.page.locator('[data-proposal-evidence]').waitFor({state:'visible'});assert.equal(b.actions.filter(x=>x.action==='propose').length,1);assert.equal(b.actions.some(x=>['create','confirm','suggest'].includes(x.action)),false);assert.match(await b.page.locator('[data-proposal-evidence]').textContent(),/candid advice/);
 await b.page.screenshot({path:'/private/tmp/awb-passage-review-mobile.png',fullPage:true});
 await b.page.locator('[data-confirm-guide]').click();await b.page.waitForTimeout(200);assert.equal(b.actions.filter(x=>x.action==='confirm').length,1);
 await b.page.locator('[data-edit-guide-books]').click();await b.page.locator('[data-guide-question] button[type=submit]').click();await b.page.locator('[data-confirm-guide]').click();await b.page.waitForTimeout(200);assert.deepEqual(b.actions.find(x=>x.action==='create').bookIds,[book]);assert.deepEqual(b.errors,[]);await b.ctx.close();
 const draft={id:'00000000-0000-4000-8000-000000000004',question:q,bookIds:[],mode:'automatic',length:'short'};
 const c=await context(true,draft);await c.page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:4327')+'/guides/?resume='+draft.id);await c.page.locator('[data-proposal-evidence]').waitFor({state:'visible'});assert.ok(c.actions.some(x=>x.action==='propose'));assert.ok(c.actions.filter(x=>x.action==='propose').every(x=>x.requestKey===draft.id));assert.deepEqual(c.errors,[]);await c.ctx.close();
 console.log('PASS UI: signed-out draft, manual selection, automatic passage evidence, explicit confirmation, edits, mobile overflow, and auth-return request identity. API responses mocked; no live guide created.');
}finally{await browser.close();}
