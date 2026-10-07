import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const user={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}};
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=`${encode({alg:'none'})}.${encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})}.mock`;
const cachedBytes=Buffer.from('Previously processed original. This is deliberately not a parseable PDF.');
const cachedSha=createHash('sha256').update(cachedBytes).digest('hex');
const oldJob={id:'00000000-0000-4000-8000-000000000042',user_id:user.id,title:'Saved Private Book',author:'Test',status:'ready',run_state:'complete',cursor:1,total_sections:1,artifacts:{'book.md':'# Saved Private Book\n\nSaved evidence.','skill/SKILL.md':'---\nname: saved-book\ndescription: Use saved evidence.\n---\n# Saved evidence\nRead this existing book.'}};
const fixture=name=>({name,mimeType:'application/pdf',buffer:cachedBytes});
const errors=[];
try {
 for(const width of [390,1280]){
  const context=await browser.newContext({viewport:{width,height:1000}});const page=await context.newPage();const calls=[];
  page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://*.supabase.co/**',async route=>{
   if(route.request().url().includes('/functions/'))calls.push(route.request().postDataJSON());
   await route.fulfill({contentType:'application/json',body:'[]'});
  });
  await page.goto(origin+'/tools/');await page.locator('[data-open-book-request]').first().click();await page.getByLabel('Source file').setInputFiles(fixture('The Mom Test.pdf'));
  await page.getByRole('button',{name:'Use library book',exact:true}).waitFor();
  assert.ok(await page.locator('[data-upload-submit]').isDisabled(),'matching title waits for saved-library choice, never processes silently');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`/private/tmp/awb-cache-public-${width}.png`});
  await page.getByRole('button',{name:'Use library book',exact:true}).click();await page.waitForURL('**/books/the-mom-test/');
  assert.deepEqual(calls,[],'public reuse requires no auth, extraction, upload or processing');
  assert.ok((await page.getByLabel('Book agent prompt').inputValue()).length>2000);
  await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:1000}});
 await context.addInitScript(({token,user})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
 const calls=[],uploads=[];const jobs=[oldJob];let newSha;
 await context.route('https://*.supabase.co/**',async route=>{
  const url=new URL(route.request().url());let result=[];
  if(url.pathname.endsWith('/book-process')){
   const body=route.request().postDataJSON();calls.push(body);
   if(body.action==='lookup')result=body.sha===cachedSha?{job:oldJob,reused:true}:{job:null,reused:false};
   else if(body.action==='health')result={available:true};
   else if(body.action==='create'){
    assert.notEqual(body.sha,cachedSha,'cached source must not be submitted again');
    const existing=jobs.find(job=>job.source_sha===body.sha);
    if(existing)result={job:existing,reused:true};
    else {newSha=body.sha;const job={...oldJob,id:'00000000-0000-4000-8000-000000000043',title:'New Source',source_sha:body.sha,status:'uploaded',run_state:'staging',artifacts:null};jobs.push(job);result={job,upload:{path:`${user.id}/${job.id}/source`,token:'mock'}};}
   }else if(body.action==='enqueue'){const job=jobs.find(j=>j.id===body.id);assert.ok(job);job.run_state='queued';result={job};}
   else {assert.equal(body.action,'status','reuse must not invoke processing or retry');result={job:jobs.find(j=>j.id===body.id)};}
  }else if(url.pathname==='/auth/v1/user')result=user;
  else if(url.pathname.includes('/storage/v1/object/upload/')){uploads.push(url.pathname);result={Key:'saved'};}
  else if(url.pathname.includes('/storage/v1/object/sign/'))result={signedURL:'/object/sign/private-books/synthetic'};
  else if(url.pathname.includes('/rest/v1/book_processing_jobs'))result=jobs;
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/tools/');await page.locator('[data-open-book-request]').first().click();await page.getByLabel('Source file').setInputFiles(fixture('Renamed private original.pdf'));
 await page.locator('[data-upload-submit]').click();await page.waitForURL('**/your-book/?id='+oldJob.id);
 await page.getByRole('button',{name:'Copy prompt for your AI',exact:true}).waitFor();
 assert.deepEqual(calls.filter(c=>c.action!=='status'),[{action:'lookup',sha:cachedSha}]);assert.deepEqual(uploads,[]);
 // Mixed public reuse, private reuse, new sources and a same-batch duplicate.
 calls.length=0;await page.goto(origin+'/tools/');await page.locator('[data-open-book-request]').first().click();
 const source=Buffer.from('Record a prediction before a bounded trial. Compare observed outcomes and retain uncertainty.\n'.repeat(8));
 await page.getByLabel('Source file').setInputFiles([fixture('The Mom Test.pdf'),fixture('Renamed private original.pdf'),{name:'new-source.md',mimeType:'text/markdown',buffer:source},{name:'same-new-source.md',mimeType:'text/markdown',buffer:source}]);
 await page.getByRole('button',{name:'Use library book',exact:true}).click();await page.locator('[data-upload-submit]').click();await page.getByText(/Sources reviewed\./).waitFor({timeout:90000});
 await page.locator('[data-upload-submit]').click();await page.getByText(/4 sources saved/).waitFor({timeout:30000});
 assert.equal(uploads.length,1);assert.equal(calls.filter(c=>c.action==='enqueue').length,1);
 assert.deepEqual(calls.filter(c=>c.action==='create').map(c=>c.sha),[newSha,newSha]);
 assert.equal(await page.locator('[data-upload-files] a').count(),4);
 assert.ok(await page.locator('[data-upload-files] a[href="/books/the-mom-test/"]').isVisible());
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'/private/tmp/awb-cache-mixed-390.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS desktop/mobile public reuse without login or parsing; renamed private file reuses saved artifacts without parsing/upload/health/AI; mixed batch uploads only new sources; concurrent duplicate reuses without enqueue; no overflow. All service responses mocked.');
 await context.close();
}finally{await browser.close();}
