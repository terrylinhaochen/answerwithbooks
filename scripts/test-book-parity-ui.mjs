import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const user={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=`${encode({alg:'none',typ:'JWT'})}.${encode({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`;
const source='Chapter 1: Evidence\nA useful source records the prediction, checks observations, and preserves the uncertainty.\n\nChapter 2: Review\nCompare the result with the expected signal and identify the next reversible action.';
const mainId='11111111-1111-4111-8111-111111111111',nextId='22222222-2222-4222-8222-222222222222';
let nativeAvailable=true,activated=false;
const calls=[],uploads=[];
const job=id=>({id,user_id:user.id,book_id:mainId,title:'Evidence Book',author:'Test Author',status:id==='native-job'?'pending':'ready',run_state:id==='native-job'?'manual':'complete',cursor:0,total_sections:1,revision:id===nextId?2:1,is_current:id===nextId?activated:!activated,parent_job_id:id===nextId?mainId:null,source_manifest:[{name:'source.md',sha:'0'.repeat(64),jobId:mainId,startLine:1,endLine:4}],...(id==='native-job'?{source_import:{kind:'native',state:'queued'}}:{artifacts:{'book.md':'# Evidence Book\n\nRead the source before making a decision.','skill/SKILL.md':'# Evidence skill'}})});
try {
 const page=await browser.newPage();page.setDefaultNavigationTimeout(120000);page.setDefaultTimeout(120000);
 page.on('pageerror',error=>console.error('Browser error:',error.message));
 await page.addInitScript(({token,user})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
 // Extraction and audit are covered by their own runtime tests; isolate UI transitions here.
 await page.route('**/book-extractor-worker.mjs',route=>route.fulfill({contentType:'text/javascript',body:`self.onmessage=({data})=>{self.postMessage({result:data.operation==='validate'?{errors:[],warnings:[],findings:[]}:{text:${JSON.stringify(source)},headings:[],estimatedTokens:60,extractor:'ui-test',structure:{}}});}` }));
 await page.route('https://*.supabase.co/**',async route=>{
  const url=new URL(route.request().url());let result={};let status=200;
  if(url.pathname.includes('/functions/v1/')) {
   const body=route.request().postDataJSON();calls.push({endpoint:url.pathname.split('/').at(-1),...body});
   if(url.pathname.endsWith('/book-native')) {
    if(body.action==='health')result={available:nativeAvailable};
    else if(body.action==='prepare')result={job:job('native-job'),upload:{path:`${user.id}/native-job/source`,token:'mock-upload'}};
    else if(body.action==='finalize')result={job:job('native-job')};
    else throw Error(`Unexpected native action ${body.action}`);
   }else {
    if(body.action==='lookup')result={reused:false};
    else if(body.action==='health')result={available:true,staged_uploads:true};
    else if(body.action==='status')result={job:job(body.id)};
    else if(body.action==='revisions')result={book_id:mainId,revisions:[job(mainId),job(nextId)]};
    else if(body.action==='create'){result={error:'UI test stopped before generation.'};status=400;}
    else if(body.action==='activate'){assert.equal(body.reviewAccepted,true);activated=true;result={job:job(nextId)};}
    else if(body.action==='delete'){assert.equal(body.id,nextId);result={deleted:true};}
    else throw Error(`Unexpected book action ${body.action}`);
   }
  }else if(url.pathname.includes('/object/upload/sign/')) {const request=route.request();const form=await new Response(request.postDataBuffer(),{headers:{'content-type':request.headers()['content-type']}}).formData();uploads.push(Buffer.from(await form.get('').arrayBuffer()));result={Key:'private-books/source'};}
  else if(url.pathname.includes('/object/sign/'))result={signedURL:'/object/sign/private-books/source?token=mock'};
  else if(url.pathname==='/auth/v1/user')result=user;
  else result=[];
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
 });
 const open=async()=>{await page.goto(origin+'/tools/',{waitUntil:'domcontentloaded'});await page.locator('[data-open-book-request]').first().click();};
 const select=async(name,mode='text')=>{await page.locator('select[name=extractionMode]').selectOption(mode);await page.getByLabel('Source file',{exact:true}).setInputFiles({name,mimeType:'application/octet-stream',buffer:Buffer.from(`ORIGINAL ${name}`)});};
 const review=async()=>{await page.locator('[data-upload-submit]').click();await page.getByText(/Sources reviewed\./).waitFor();};
 if(!process.env.AWB_TEST_REVISION_ONLY){
 for(const [name,mode] of [['kindle.mobi','text'],['kindle.azw','text'],['kindle.azw3','text'],['technical.pdf','technical']]) {
  await open();await select(name,mode);const start=calls.length,uploaded=uploads.length;await review();await page.locator('[data-upload-submit]').click();await page.waitForURL('**/your-book/?id=native-job',{waitUntil:'domcontentloaded'});
  await page.getByText('Your original file is saved. Waiting for background extraction…',{exact:true}).waitFor();
  const sent=calls.slice(start),prepared=sent.find(c=>c.endpoint==='book-native'&&c.action==='prepare');
  assert.equal(prepared.name,name);assert.equal(prepared.extractionMode,mode);assert.match(prepared.sha,/^[a-f0-9]{64}$/);assert.equal(prepared.text,undefined);
  assert.equal(uploads.length,uploaded+1);assert.equal(uploads.at(-1).toString(),`ORIGINAL ${name}`);
  assert.ok(sent.some(c=>c.endpoint==='book-native'&&c.action==='finalize'));assert.ok(!sent.some(c=>['lookup','create','enqueue'].includes(c.action)));
  console.log(`PASS ${name}: original-only native upload and background status`);
 }
 nativeAvailable=false;await open();await select('unavailable.pdf','technical');const uploadCount=uploads.length;await page.locator('[data-upload-submit]').click();await page.getByText(/Background extraction is unavailable/).waitFor();assert.equal(uploads.length,uploadCount);nativeAvailable=true;
 await page.locator('select[name=extractionMode]').selectOption('text');assert.equal(await page.locator('[data-upload-submit]').isDisabled(),false);
 console.log('PASS native unavailability blocks upload; switching extraction clears stale error');
 for(const kind of ['append','replace']) {
  await page.goto(`${origin}/your-book/?id=${mainId}`,{waitUntil:'domcontentloaded'});await page.locator(`[data-job-${kind==='append'?'add':'replace'}-source]`).click();
  assert.equal(await page.getByLabel('Source file',{exact:true}).getAttribute('multiple'),null);
  const transfer=await page.evaluateHandle(()=>{const data=new DataTransfer();data.items.add(new File(['one'],'extra.md'));data.items.add(new File(['two'],'second.md'));return data;});
  await page.locator('[data-upload-drop]').dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose();assert.equal(await page.locator('[data-upload-files] li').count(),1);
  const start=calls.length;await review();await page.locator('[data-upload-submit]').click();await page.getByText('UI test stopped before generation.',{exact:true}).waitFor();
  const sent=calls.slice(start),prepared=sent.find(c=>c.action==='create');assert.equal(prepared.parentId,mainId);assert.equal(prepared.revisionKind,kind);assert.ok(prepared.text.length>100);assert.ok(!sent.some(c=>c.action==='lookup'));
 }
 console.log('PASS append/replace one-file revisions bypass raw-SHA reuse and retain parent metadata');
 }
 await page.goto(`${origin}/your-book/?id=${nextId}`,{waitUntil:'domcontentloaded'});
 await page.getByText('Version 2 · Review before making current',{exact:true}).waitFor();
 await page.locator('[data-job-discard]').waitFor({state:'visible',timeout:5000}).catch(async error=>{console.error(await page.locator('[data-job-versions]').innerHTML());console.error(calls.slice(-5));throw error;});
 page.once('dialog',dialog=>dialog.dismiss());await page.locator('[data-job-discard]').click();
 assert.equal(calls.filter(c=>c.action==='delete').length,0);
 page.once('dialog',dialog=>dialog.accept());await page.locator('[data-job-discard]').click();
 await page.waitForURL(`**/your-book/?id=${mainId}`,{waitUntil:'domcontentloaded'});
 assert.equal(calls.filter(c=>c.action==='delete').length,1);
 assert.equal(await page.locator('[data-job-discard]').isVisible(),false);
 console.log('PASS discard confirmation removes only the pending revision and returns to the current book');
 await page.goto(`${origin}/your-book/?id=${nextId}`,{waitUntil:'domcontentloaded'});await page.getByText('Version 2 · Review before making current',{exact:true}).waitFor();await page.getByText(/Skill structure checked/).waitFor();
 assert.equal(await page.locator('[data-job-activate]').isDisabled(),true);assert.equal(await page.locator('[data-job-add-source]').isVisible(),false);
 await page.locator('[data-job-versions] details summary').click();assert.ok(await page.locator(`[data-job-revisions] a[href="/your-book/?id=${mainId}"]`).isVisible());
 await page.locator('[data-job-activate-review]').check();await page.locator('[data-job-activate]').click();await page.getByText('Version 2 · Current book and skill',{exact:true}).waitFor();
 assert.equal(await page.locator('[data-job-add-source]').isVisible(),true);assert.match(await page.locator('[data-job-install-command]').textContent(),new RegExp(`library install-book ${mainId}`));
 assert.equal(calls.filter(c=>c.action==='activate').length,1);
 assert.equal(await page.locator('[data-job-discard]').isVisible(),false);
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS explicit reviewed activation, previous-version link, stable install command, and mobile layout');
}finally{await browser.close();}
