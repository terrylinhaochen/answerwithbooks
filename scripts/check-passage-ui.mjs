import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome'});
const origin=process.env.TEST_BASE_URL||'http://127.0.0.1:4327';
const user='00000000-0000-4000-8000-000000000001',book='00000000-0000-4000-8000-000000000002',guide='00000000-0000-4000-8000-000000000003',otherBook='00000000-0000-4000-8000-000000000005';
const books=[{id:book,title:'Source for a meaningful question',author:'Example author'},{id:otherBook,title:'Another life to learn from',author:'Another author'}];
const q='How do I become easier to help?',internalReason='Internal passage analysis: a concrete scene shows how to invite candid advice.',internalConnection='Internal synthesis across the matched passages.';
const mutations=actions=>actions.filter(x=>['propose','create','confirm','suggest'].includes(x.action));
async function context({signedIn=false,draft=null,width=390,catalogBooks=books,saved=false,initialStage='awaiting_confirmation',pendingCount=1}={}){
 const ctx=await browser.newContext({viewport:{width,height:900}});const actions=[];let stage=initialStage,existing=saved;
 await ctx.addInitScript(({signedIn,user,draft})=>{
  if(signedIn){const exp=Math.floor(Date.now()/1000)+3600;const b=x=>btoa(JSON.stringify(x)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:b({alg:'HS256',typ:'JWT'})+'.'+b({sub:user,exp,role:'authenticated'})+'.synthetic',refresh_token:'synthetic',expires_at:exp,expires_in:3600,token_type:'bearer',user:{id:user,aud:'authenticated',role:'authenticated',email:'fixture@example.invalid'}}));}
  if(draft){localStorage.setItem('awb:guide-review:v1:'+draft.id,JSON.stringify({...draft,savedAt:Date.now()}));localStorage.setItem('awb:pending-guide-review',draft.id);}
 },{signedIn,user,draft});
 await ctx.route('https://yozeqanibszoxnowmvsm.supabase.co/**',async route=>{
  const request=route.request(),url=request.url();let body={};try{body=request.postDataJSON()||{};}catch{}
  let result={};
  if(url.includes('/auth/'))result={id:user,email:'fixture@example.invalid'};
  else if(url.includes('shared-library'))result={books:catalogBooks,nextOffset:null};
  else if(url.includes('reader-subscription'))result={active:false,used:0,limit:3};
  else if(url.includes('reading-guides')){
   actions.push(body);
   if(body.action==='input-status')result={count:existing&&stage==='awaiting_confirmation'?pendingCount:0,guideId:existing&&stage==='awaiting_confirmation'?guide:null};
   else if(body.action==='list')result={guides:existing?[{id:guide,status:stage,question:q,created_at:'2026-11-09T12:00:00Z',cover:{status:'none'}}]:[]};
   else if(body.action==='public-list')result={guides:[{id:'00000000-0000-4000-8000-000000000099',question:'An existing public reading',created_at:'2026-11-09T12:00:00Z',cover:{status:'pending'}}]};
   else if(['propose','create','confirm'].includes(body.action)){existing=true;if(body.action!=='propose')stage='composing';result={id:guide};}
   else if(body.action==='get')result={guide:{id:guide,status:stage,question:q,proposal:{books:[books[0]],connection:internalConnection,matches:[{bookId:book,title:books[0].title,reason:internalReason}]}},books:[books[0]]};
  }
  await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(result),headers:{'access-control-allow-origin':'*'}});
 });
 const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 return {ctx,page,actions,errors,setStage:value=>{stage=value;}};
}
async function launch(test){
 const {page,actions}=test;
 await page.goto(origin+'/guides/');await page.locator('[data-public-guide-list] a').waitFor();await page.locator('[data-guide-launcher] textarea').fill(q);
 await page.locator('[data-guide-launcher] button[type=submit]').click();
 await page.locator('[data-guide-question]').waitFor({state:'visible'});
 assert.equal(await page.locator('input[name=book-mode]:checked').count(),0);
 assert.equal(await page.locator('[data-guide-question] button[type=submit]').isDisabled(),true);
 assert.equal(await page.locator('[data-guide-processing]').isVisible(),false);
 assert.equal(await page.locator('[data-guide-question] textarea').inputValue(),q);
 // Enter/programmatic form submission cannot bypass the explicit mode choice.
 await page.locator('[data-guide-question]').evaluate(form=>form.requestSubmit());
 assert.deepEqual(mutations(actions),[]);
}
async function recommend(test){
 await test.page.locator('input[name=book-mode][value=automatic]').check();
 assert.deepEqual(mutations(test.actions),[]);
 await test.page.locator('[data-guide-question] button[type=submit]').click();
}
async function review(page,label){
 await page.locator('[data-guide-proposal]').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-proposal-label]').textContent(),label);
 assert.equal(await page.locator('[data-proposal-books] .reading-book-card').count(),1);
 assert.equal(await page.locator('input[name=length]').count(),3);
 const text=await page.locator('[data-guide-dialog]').innerText();
 assert.ok(!text.includes(internalReason));assert.ok(!text.includes(internalConnection));
 assert.equal(await page.locator('[data-proposal-evidence], [data-proposal-connection]').count(),0);
}
async function confirm(test,action){
 const response=test.page.waitForResponse(r=>r.url().includes('/reading-guides')&&r.request().postDataJSON()?.action===action);
 await test.page.locator('[data-confirm-guide]').click();await response;
 await test.page.locator('[data-guide-processing]').waitFor({state:'visible'});
}
try{
 // Signed out: no work until the explicit recommendation choice, then keep auth continuity.
 const a=await context();await launch(a);await recommend(a);
 await a.page.locator('[data-guide-login]').waitFor({state:'visible'});assert.match(await a.page.locator('[data-guide-login]').getAttribute('href'),/resume=/);assert.deepEqual(mutations(a.actions),[]);assert.deepEqual(a.errors,[]);await a.ctx.close();
 // Recommendations: user chooses the mode, reviews book cards, then confirms the length.
 for(const width of [390,1280]){
  const b=await context({signedIn:true,width});await launch(b);
  await b.page.locator('[data-guide-dialog]').screenshot({path:`/private/tmp/awb-guide-choice-${width}.png`});
  await recommend(b);await review(b.page,'Suggested books');
  assert.equal(b.actions.filter(x=>x.action==='propose').length,1);assert.equal(b.actions.some(x=>['create','confirm','suggest'].includes(x.action)),false);
  assert.equal(await b.page.locator('[data-guide-dialog]').evaluate(e=>e.scrollWidth>e.clientWidth),false);
  await b.page.locator('[data-guide-dialog]').screenshot({path:`/private/tmp/awb-guide-review-${width}.png`});
  await b.page.locator('input[name=length][value=long]').check();await confirm(b,'confirm');
  assert.equal(b.actions.find(x=>x.action==='confirm').length,'long');assert.deepEqual(b.errors,[]);await b.ctx.close();
 }
 // Manual selection: no recommendation call and only selected IDs reach creation.
 const c=await context({signedIn:true});await launch(c);await c.page.locator('input[name=book-mode][value=manual]').check();
 assert.equal(await c.page.locator('[data-guide-question] button[type=submit]').isDisabled(),true);
 await c.page.locator('[data-guide-book-choices] input').first().check();await c.page.locator('[data-guide-question] button[type=submit]').click();await review(c.page,'Your selected books');
 assert.deepEqual(mutations(c.actions),[]);
 await c.page.locator('[data-edit-suggested-question]').click();assert.equal(await c.page.locator('input[name=book-mode][value=manual]').isChecked(),true);assert.equal(await c.page.locator('[data-guide-book-choices] input').first().isChecked(),true);
 await c.page.locator('[data-guide-question] textarea').fill(q+' What should I try first?');await c.page.locator('[data-guide-question] button[type=submit]').click();await review(c.page,'Your selected books');
 await c.page.locator('input[name=length][value=short]').check();await confirm(c,'create');
 assert.deepEqual(c.actions.find(x=>x.action==='create').bookIds,[book]);assert.equal(c.actions.find(x=>x.action==='create').length,'short');assert.equal(c.actions.some(x=>x.action==='propose'),false);assert.deepEqual(c.errors,[]);await c.ctx.close();
 // Editing recommendations switches to explicit sources without running another search.
 const d=await context({signedIn:true});await launch(d);await recommend(d);await review(d.page,'Suggested books');await d.page.locator('[data-edit-guide-books]').click();
 await d.page.locator('[data-guide-book-choices] input').first().uncheck();await d.page.locator('[data-guide-book-choices] input').nth(1).check();await d.page.locator('[data-guide-question] button[type=submit]').click();await review(d.page,'Your selected books');await confirm(d,'create');
 assert.deepEqual(d.actions.find(x=>x.action==='create').bookIds,[otherBook]);assert.equal(d.actions.filter(x=>x.action==='propose').length,1);assert.deepEqual(d.errors,[]);await d.ctx.close();
 // Returning from sign-in resumes an already chosen recommendation request once.
 const draft={id:'00000000-0000-4000-8000-000000000004',question:q,bookIds:[],mode:'automatic',length:'short'};
 const e=await context({signedIn:true,draft});await e.page.goto(origin+'/guides/?resume='+draft.id);await review(e.page,'Suggested books');assert.equal(e.actions.filter(x=>x.action==='propose').length,1);assert.equal(e.actions.find(x=>x.action==='propose').requestKey,draft.id);assert.equal(await e.page.locator('input[name=length][value=short]').isChecked(),true);assert.deepEqual(e.errors,[]);await e.ctx.close();
 // An existing recommendation reopens its clean book review without restarting work.
 const f=await context({signedIn:true});await f.page.goto(origin+'/guides/?id='+guide);await review(f.page,'Suggested books');assert.deepEqual(mutations(f.actions),[]);await f.page.locator('[data-close-guide]').click();await f.page.waitForURL(url=>!url.searchParams.has('id'));await f.page.reload();assert.equal(await f.page.locator('[data-guide-dialog]').isVisible(),false);assert.deepEqual(f.errors,[]);await f.ctx.close();
 // Work that finishes while minimized becomes an explicit input request, across pages.
 for(const width of [390,1280]){
  const n=await context({signedIn:true,saved:true,initialStage:'scanning',width});
  await n.page.goto(origin+'/guides/?id='+guide);await n.page.locator('[data-guide-processing]').waitFor({state:'visible'});
  await n.page.locator('[data-close-guide]').click();assert.equal(await n.page.locator('[data-guide-input-notice]').isVisible(),false);
  n.setStage('awaiting_confirmation');
  await n.page.locator('[data-guide-input-notice]').waitFor({state:'visible',timeout:18000});
  assert.equal(await n.page.locator('[data-guide-dialog]').isVisible(),false);
  const saved=n.page.locator('[data-saved-guides] .guide-saved-card');
  assert.equal(await saved.locator('small.guide-input-label').innerText(),'Requires input');
  assert.ok(!(await saved.innerText()).includes('Illustrating your cover'));
  await n.page.goto(origin+'/books/');await n.page.locator('[data-guide-input-notice]').waitFor({state:'visible'});
  assert.equal(await n.page.locator('[data-guide-input-link]').getAttribute('href'),'/guides/?id='+guide);
  assert.equal(await n.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await n.page.locator('[data-guide-input-notice]').screenshot({path:`/private/tmp/awb-input-notice-${width}.png`});
  await n.page.locator('[data-guide-input-link]').click();await review(n.page,'Suggested books');
  assert.equal(await n.page.locator('[data-guide-input-notice]').isVisible(),false);
  await confirm(n,'confirm');await n.page.locator('[data-close-guide]').click();
  assert.equal(await n.page.locator('[data-guide-input-notice]').isVisible(),false);
  assert.equal(n.actions.filter(x=>x.action==='confirm').length,1);assert.deepEqual(n.errors,[]);await n.ctx.close();
 }
 const multiple=await context({signedIn:true,saved:true,pendingCount:2});await multiple.page.goto(origin+'/books/');await multiple.page.locator('[data-guide-input-notice]').waitFor({state:'visible'});
 assert.equal(await multiple.page.locator('[data-guide-input-count]').innerText(),'2 guides require input');assert.equal(await multiple.page.locator('[data-guide-input-link]').getAttribute('href'),'/guides/#your-guides');await multiple.ctx.close();
 const anonymous=await context({saved:true});await anonymous.page.goto(origin+'/books/');assert.equal(await anonymous.page.locator('[data-guide-input-notice]').isVisible(),false);assert.equal(anonymous.actions.some(a=>a.action==='input-status'),false);await anonymous.ctx.close();
 const failed=await context({signedIn:true,saved:true,initialStage:'failed'});await failed.page.goto(origin+'/guides/');await failed.page.getByText('Could not complete this guide',{exact:true}).waitFor();assert.equal(await failed.page.locator('[data-guide-input-notice]').isVisible(),false);assert.equal(await failed.page.locator('[data-saved-guides] .guide-input-label').count(),0);await failed.ctx.close();
 // Searching filters choices without dropping selections or bypassing the four-book limit.
 const searchBooks=[{title:'Insanely Simple',author:'Ken Segall'},{title:'Learning to See',author:'José Rivera'},{title:'Shoe Dog',author:'Phil Knight'},{title:'Open',author:'Andre Agassi'},{title:'Invention: A Life',author:'James Dyson'}].map((b,i)=>({...b,id:`00000000-0000-4000-8000-00000000002${i}`}));
 for(const width of [390,1280]){
  const g=await context({signedIn:true,width,catalogBooks:searchBooks});await launch(g);await g.page.locator('input[name=book-mode][value=manual]').check();
  const search=g.page.getByRole('searchbox',{name:'Search books'}),choices=g.page.locator('[data-guide-book-choices] input');
  await choices.first().waitFor();assert.equal(await choices.count(),5);
  await search.fill('  SIMPLE   segall ');assert.equal(await choices.count(),1);await choices.first().check();
  await search.press('Enter');assert.equal(await g.page.locator('[data-guide-question]').isVisible(),true);assert.deepEqual(mutations(g.actions),[]);
  await search.fill('jose');assert.equal(await choices.count(),1);await choices.first().check();
  await search.fill('no matching book');assert.equal(await choices.count(),0);await g.page.getByText('No books match your search. Try another title or author.',{exact:true}).waitFor();assert.equal(await g.page.locator('[data-selected-books] li').count(),2);
  await g.page.locator('[data-clear-book-search]').click();assert.equal(await search.inputValue(),'');assert.equal(await search.evaluate(e=>e===document.activeElement),true);assert.equal(await choices.count(),5);assert.equal(await choices.filter({visible:true}).count(),5);
  assert.equal(await g.page.locator('[data-guide-book-choices] input:checked').count(),2);
  for(const term of ['knight','agassi']){await search.fill(term);await choices.first().check();}
  await search.fill('dyson');assert.equal(await choices.first().isDisabled(),true);
  await g.page.getByRole('button',{name:'Remove Insanely Simple',exact:true}).click();assert.equal(await choices.first().isDisabled(),false);await choices.first().check();
  await g.page.locator('[data-clear-book-search]').click();assert.equal(await g.page.locator('[data-guide-book-choices] input:checked').count(),4);assert.equal(await choices.first().isDisabled(),true);
  assert.equal(await g.page.locator('[data-guide-dialog]').evaluate(e=>e.scrollWidth>e.clientWidth),false);
  await g.page.locator('[data-guide-question] button[type=submit]').click();await g.page.locator('[data-guide-proposal]').waitFor({state:'visible'});
  assert.deepEqual(await g.page.locator('[data-proposal-books] strong').allTextContents(),searchBooks.slice(1).map(b=>b.title));assert.deepEqual(mutations(g.actions),[]);assert.deepEqual(g.errors,[]);await g.ctx.close();
 }
 console.log('PASS cross-page Requires input notices, minimized recommendations, confirmation clearing, signed-out privacy, explicit mode choice, card-only review, manual selection, title/author search, accent normalization, no-match/clear states, preserved selections and four-book limit, edits, length confirmation, mobile/desktop layouts, auth resume, and saved-review reopening. API responses mocked; no live guide created.');
}finally{await browser.close();}
