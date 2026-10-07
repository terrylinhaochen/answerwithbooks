import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {chromium} from 'playwright';
import {splitSource} from '../supabase/functions/_shared/book-sections.mjs';
const filename=process.env.AWB_LONG_BOOK_FILE;
if(!filename)throw Error('Set AWB_LONG_BOOK_FILE to a local PDF. This test extracts it locally; no source is sent to a real service.');
const sourceFile=await stat(filename),sourceHash=createHash('sha256').update(await readFile(filename)).digest('hex');
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const user={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}};
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=`${encode({alg:'none'})}.${encode({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})}.mock`;
let preparation,original,text,sections,finalized=false;
const job={id:'00000000-0000-4000-8000-000000000020',user_id:user.id,title:'Large book test',author:'',status:'processing',run_state:'queued',cursor:0,total_sections:0};
try{
 const page=await browser.newPage();await page.addInitScript(({token,user})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
 await page.route('https://*.supabase.co/**',async route=>{
  const request=route.request(),url=new URL(request.url());let result=[];
  if(url.pathname.endsWith('/book-process')){
   const body=request.postDataJSON();
   if(body.action==='health')result={available:true,staged_uploads:true};
   else if(body.action==='prepare'){
    preparation=body;assert.equal(body.text,undefined);assert.ok(request.postData().length<300000);assert.equal(body.sha,sourceHash);
    result={job,upload:{path:`${user.id}/${job.id}/source`,token:'mock'},textUpload:{path:`${user.id}/${job.id}/extracted-source.txt`,token:'mock'}};
   }else if(body.action==='finalize'){
    assert.equal(createHash('sha256').update(original).digest('hex'),sourceHash);assert.equal(original.length,sourceFile.size);
    assert.equal(createHash('sha256').update(text).digest('hex'),preparation.textSha);assert.equal(text.length,preparation.textBytes);
    const extracted=text.toString('utf8');assert.ok(extracted.length>1200000);sections=splitSource(extracted,preparation.extraction.headings);
    assert.ok(sections.text===extracted,'no source text was truncated during sectioning');
    if(process.env.AWB_EXPECT_PAGES)assert.equal([...extracted.matchAll(/\[Page (\d+)\]/g)].length,Number(process.env.AWB_EXPECT_PAGES));
    assert.equal(sections.chunks[0].start,1);assert.equal(sections.chunks.at(-1).end,sections.lineCount);
    for(let n=1;n<sections.chunks.length;n++)assert.equal(sections.chunks[n].start,sections.chunks[n-1].end+1);
    job.total_sections=sections.chunks.length;finalized=true;result={job};
   }else {assert.equal(body.action,'status');result={job};}
  }else if(url.pathname.includes('/object/upload/sign/')){
   const req=new Request(request.url(),{method:request.method(),headers:request.headers(),body:request.postDataBuffer()});
   const form=await req.formData(),file=[...form.values()].find(value=>typeof value!=='string');assert.ok(file);
   const bytes=Buffer.from(await file.arrayBuffer());if(url.pathname.endsWith('/extracted-source.txt'))text=bytes;else original=bytes;
   result={Key:'synthetic'};
  }else if(url.pathname==='/auth/v1/user')result=user;
  await route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
 });
 await page.route('https://api.openai.com/**',()=>{throw Error('No provider requests permitted');});
 await page.goto(origin+'/tools/');await page.locator('[data-open-book-request]').first().click();await page.getByLabel('Source file').setInputFiles(filename);
 await page.locator('[data-upload-submit]').click();
 await page.waitForFunction(()=>document.querySelector('[data-upload-status]').textContent.startsWith('Sources reviewed.')||document.querySelector('[data-upload-status]').textContent.startsWith('No readable'),{},{timeout:240000});
 assert.match(await page.locator('[data-upload-status]').textContent(),/^Sources reviewed\./,await page.locator('[data-upload-files]').textContent());
 await page.getByText(/Long book: we’ll process it in sections/).waitFor();
 await page.locator('[data-upload-submit]').click();await page.waitForURL(/\/your-book\/\?id=/,{timeout:90000});assert.ok(finalized);
 console.log(JSON.stringify({passed:true,originalBytes:sourceFile.size,extractedCharacters:sections.text.length,sourceLines:sections.lineCount,processingSections:sections.chunks.length,allLinesRetained:true,originalAndTextHashesVerified:true,realGeneration:false,realStorageUpload:false}));
}finally{await browser.close();}
