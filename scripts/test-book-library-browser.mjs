import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4340';
const user={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}};
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const session={access_token:`${enc({alg:'none',typ:'JWT'})}.${enc({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`,refresh_token:'mock',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
const fixture=(id,patch)=>({id,title:'The Wealth of Nations',source_name:'wealth.epub',revision_kind:'base',status:'processing',run_state:'queued',cursor:1,total_sections:117,source_line_count:35100,...patch});
let jobs=[fixture('full',{status:'ready',run_state:'complete',cover_status:'pending',source_text_sha:'full'}),fixture('old',{status:'processing',run_state:'failed',error:'Synthetic interruption',source_text_sha:'full'}),fixture('excerpt',{source_name:'smith-book-i-chapters-1-3.txt',total_sections:4,source_line_count:601,status:'ready',cover_status:'ready',cover_path:'private/cover.png',source_text_sha:'excerpt'}),fixture('active',{title:'Another book',cursor:10,source_text_sha:'active'})];
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 await context.addInitScript(value=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(value)),session);
 let reads=0;const mutations=[],errors=[];
 await context.route('https://*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data=[];
  if(req.method()!=='GET')mutations.push(url.pathname);
  if(url.pathname==='/auth/v1/user')data=user;
  if(url.pathname==='/rest/v1/book_processing_jobs') {
   assert.equal(url.searchParams.get('user_id'),'eq.'+user.id);reads++;data=jobs;
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/books/');console.log('Browser loaded');
 const shelf=page.locator('[data-book-additions]');await shelf.getByText('Excerpt · Chapters 1–3',{exact:false}).waitFor().catch(async e=>{console.log({errors,reads,shelf:await shelf.textContent()});throw e;});
 console.log('Shelf loaded');assert.equal(await shelf.locator('article').count(),3);
 await shelf.getByText('Book and skill ready · Creating cover',{exact:true}).waitFor();
 await shelf.locator('summary').click();await shelf.getByRole('link',{name:/wealth.epub · Synthetic interruption/}).waitFor();
 jobs=jobs.map(job=>job.id==='active'?{...job,cursor:30}:job);
 await shelf.getByText('Processing in the background · 30 of 117 sections read',{exact:true}).waitFor({timeout:12000});
 assert.equal(await shelf.locator('details[open]').count(),1);
 console.log('Polling verified');assert.ok(reads>=2);assert.equal(mutations.length,0,'Reading shelf must not start any work');
 await page.setViewportSize({width:390,height:844});
 assert.ok(await shelf.evaluate(el=>el.scrollWidth<=el.clientWidth));
 await shelf.screenshot({path:'/private/tmp/awb-library-mobile.png'});
 await page.evaluate(()=>{localStorage.removeItem('sb-yozeqanibszoxnowmvsm-auth-token');window.dispatchEvent(new StorageEvent('storage',{key:'sb-yozeqanibszoxnowmvsm-auth-token',newValue:null}));window.dispatchEvent(new Event('focus'));});
 await shelf.waitFor({state:'hidden'}).catch(async e=>{console.log({errors,reads,body:await shelf.textContent()});throw e;});
 assert.deepEqual(errors,[]);console.log('PASS browser shelf: exact duplicates grouped, excerpt scope, honest cover state, live refresh, preserved expanded history, mobile layout and sign-out clearing');
 await context.close();
 const detailContext=await browser.newContext();
 await detailContext.addInitScript(value=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(value)),session);
 const actions=[];
 const job={...fixture('00000000-0000-4000-8000-000000000010',{run_state:'manual'}),user_id:user.id,author:'Adam Smith',source_manifest:[],is_current:true,revision:1,last_error:'Synthetic prior failure',last_error_at:'2026-10-09T00:00:00Z'};
 await detailContext.route('https://*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data=[];
  if(url.pathname==='/auth/v1/user')data=user;
  if(url.pathname==='/functions/v1/book-process') {
   const body=req.postDataJSON();actions.push(body.action);
   assert.ok(['status','revisions'].includes(body.action),'Opening a saved book must never enqueue or charge');
   data=body.action==='revisions'?{revisions:[job]}:{job};
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const detail=await detailContext.newPage();detail.setDefaultTimeout(20000);
 await detail.goto(origin+'/your-book/?id='+job.id);
 await detail.locator('[data-job-status]').getByText('Saved · Open to continue').waitFor();
 await detail.locator('[data-job-last-error]').getByText(/Synthetic prior failure/).waitFor();
 assert.equal(await detail.locator('[data-job-retry]').isVisible(),true);
 await detail.evaluate(()=>window.dispatchEvent(new Event('focus')));
 await detail.waitForTimeout(300);
 assert.ok(actions.includes('status'));assert.ok(actions.includes('revisions'));assert.ok(actions.every(a=>['status','revisions'].includes(a)));
 console.log('PASS private page: retained failure detail and read-only open/focus with explicit resume');
 await detailContext.close();
}finally{await browser.close();}
