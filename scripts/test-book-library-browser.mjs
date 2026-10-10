import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4340';
const user={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}};
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const session={access_token:`${enc({alg:'none',typ:'JWT'})}.${enc({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`,refresh_token:'mock',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
const fixture=(id,patch)=>({id,title:'The Wealth of Nations',author:'Adam Smith',skill_summary:{one_liner:'How specialization and exchange shape productivity and the wealth of a society.'},source_name:'wealth.epub',revision_kind:'base',status:'processing',run_state:'queued',cursor:1,total_sections:117,source_line_count:35100,...patch});
let jobs=[fixture('full',{title:'An Inquiry into the Nature and Causes of the Wealth of Nations',status:'ready',run_state:'complete',cover_status:'pending',source_text_sha:'full'}),fixture('old',{status:'processing',run_state:'failed',error:'Synthetic interruption',source_text_sha:'full'}),fixture('excerpt',{source_name:'smith-book-i-chapters-1-3.txt',total_sections:4,source_line_count:601,status:'ready',cover_status:'ready',cover_path:'private/cover.png',source_text_sha:'excerpt'}),fixture('active',{title:'Another book',cursor:10,source_text_sha:'active'})];
const browser=await chromium.launch({headless:true,channel:'chrome'});
try {
 const context=await browser.newContext({viewport:{width:1280,height:1000}});
 await context.addInitScript(value=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(value)),session);
 let reads=0,signs=0;const mutations=[],errors=[];
 await context.route('https://*.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data=[];
  if(req.method()!=='GET'&&!url.pathname.startsWith('/storage/v1/object/sign/'))mutations.push(url.pathname);
  if(url.pathname==='/storage/v1/object/sign/private-books'){signs++;data=req.postDataJSON().paths.map(path=>({path,signedURL:`/object/sign/private-books/${path}?token=fixture`,error:null}));}
  if(url.pathname.startsWith('/storage/v1/object/sign/private-books/'))return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect width="160" height="240" fill="#304c44"/><path d="M25 160L80 60l55 100Z" fill="#e6d7ab"/></svg>'});
  if(url.pathname==='/auth/v1/user')data=user;
  if(url.pathname==='/rest/v1/book_processing_jobs') {
   assert.equal(url.searchParams.get('user_id'),'eq.'+user.id);reads++;data=jobs;
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/books/');console.log('Browser loaded');
 const shelf=page.locator('[data-book-additions]');await shelf.getByText('Private excerpt · Chapters 1–3',{exact:true}).waitFor().catch(async e=>{console.log({errors,reads,shelf:await shelf.textContent()});throw e;});
 console.log('Shelf loaded');assert.equal(await shelf.locator('article').count(),3);assert.equal(await shelf.locator('.jacket-face').count(),3);assert.equal(await shelf.locator('.jacket-type').count(),3);assert.equal(await shelf.locator('.jacket--very-long').count(),1);
 assert.equal(await shelf.getByRole('link',{name:'Use skill',exact:true}).count(),2);
 assert.equal(await shelf.getByRole('link',{name:'Read book',exact:true}).count(),2);
 assert.equal(await shelf.getByText('How specialization and exchange shape productivity and the wealth of a society.',{exact:true}).count(),3);
 await shelf.locator('.jacket-art img').scrollIntoViewIfNeeded();
 await shelf.locator('.jacket-art img').evaluate(img=>img.complete?Promise.resolve():new Promise(resolve=>img.onload=resolve));assert.ok(await shelf.locator('.jacket-art img').evaluate(img=>img.naturalWidth>0));
 await shelf.locator('summary').first().click();
 await shelf.getByText('Book and skill ready · Creating cover',{exact:true}).waitFor();await shelf.getByRole('link',{name:/wealth.epub · Synthetic interruption/}).waitFor();
 jobs=jobs.map(job=>job.id==='active'?{...job,cursor:30}:job);
 await shelf.getByText('Processing in the background · 30 of 117 sections read',{exact:true}).first().waitFor({timeout:12000});
 assert.equal(await shelf.locator('details[open]').count(),1);
 console.log('Polling verified');assert.ok(reads>=2);assert.equal(signs,1,'Signed covers are cached across status refreshes');assert.equal(mutations.length,0,'Reading shelf must not start any work');
 await page.getByRole('button',{name:'No thanks',exact:true}).click().catch(()=>{});
 await shelf.screenshot({path:'/private/tmp/awb-library-cards-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert.ok(await shelf.evaluate(el=>el.scrollWidth<=el.clientWidth));
 await shelf.screenshot({path:'/private/tmp/awb-library-mobile.png'});
 await page.setViewportSize({width:320,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
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
 await detail.goto(origin+'/books/the-mom-test/');
 assert.equal(await detail.locator('a[href*="speed-read"]').count(),0);
 await detail.goto(origin+'/books/');
 await detail.locator('[data-filter-item]').first().getByRole('link',{name:'Use with AI',exact:true}).click();
 assert.equal(new URL(detail.url()).hash,'#use-with-ai');await detail.locator('#use-with-ai').waitFor();
 const retired=await detail.request.get(origin+'/speed-read/');assert.equal(retired.status(),404);
 console.log('PASS public AI action links and removed reader route');
 await detailContext.close();
}finally{await browser.close();}
