import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'book-upload-test-'));
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
// Small original PDF fixture; the browser's real PDF.js extractor reads this file.
function pdfFixture(searchable=true,padding=0) {
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [4 0 R 6 0 R 8 0 R 10 0 R] /Count 4 >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
 for(let i=0;i<4;i++) {
  objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5+i*2} 0 R >>`);
  const stream=searchable?`BT /F1 12 Tf 50 740 Td (Chapter ${i+1}: Evidence Marker ${i+1}) Tj 0 -20 Td (Use a bounded trial. Record the prediction and compare observations.) Tj 0 -20 Td (Review the evidence before changing the plan. Keep uncertainty visible.) Tj ET`:'';
  objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
 }
 if(padding)objects.push(`<< /Length ${padding} >>\nstream\n${'A'.repeat(padding)}\nendstream`);
 let content='%PDF-1.4\n';const offsets=[0];
 objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(content));content+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
 const start=Buffer.byteLength(content);content+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
 return Buffer.from(content);
}
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
 const p=await browser.newPage();const captured=[];const provider=[];
 const user={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}};
 const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const token=`${encode({alg:'none',typ:'JWT'})}.${encode({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`;
 await p.addInitScript(({token,user})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
 await p.route('https://*.supabase.co/**',async route=>{
  const url=new URL(route.request().url());let result=[];let status=200;
  if(url.pathname.endsWith('/book-process')) {
   const body=route.request().postDataJSON();
   if(body.action==='health') result={available:true};
   else if(body.action==='lookup')result={reused:false};
   else if(body.action==='create'){captured.push(body);result={error:'QA extraction complete; generation intentionally not started.'};status=400;}
   else throw Error(`Unexpected action ${body.action}`);
  } else if(url.pathname==='/auth/v1/user')result=user;
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
 });
 await p.route('https://api.openai.com/**',route=>{provider.push(route.request().url());return route.abort();});
 await p.goto(origin+'/tools/',{waitUntil:'domcontentloaded',timeout:120000});await p.locator('[data-open-book-request]').first().click();
 const source='Chapter 1: Evidence\nUse a bounded trial and keep the observations. Review the prediction before changing the plan.\n\nChapter 2: Review\nCompare the result with the expected signal. Keep uncertainty visible, check the original source, and identify the next reversible action.';
 const clear=async()=>{if(await p.locator('[data-upload-clear]').isVisible())await p.locator('[data-upload-clear]').click();};
 const start=async()=>{await p.locator('[data-upload-submit]').click();await p.getByText(/Sources reviewed\./).waitFor({timeout:90000});await p.locator('[data-upload-submit]').click();};
 for(const file of [{name:'original-paper.pdf',mimeType:'application/pdf',buffer:pdfFixture()},{name:'research-notes.md',mimeType:'text/markdown',buffer:Buffer.from(source)},{name:'team-runbook.txt',mimeType:'text/plain',buffer:Buffer.from(source)}]) {
  const before=captured.length;await clear();await p.getByLabel('Source file').setInputFiles(file);await start();
  await p.getByText('QA extraction complete; generation intentionally not started.',{exact:true}).waitFor({timeout:90000});
  assert.equal(captured.length,before+1);const body=captured.at(-1);assert.equal(body.name,file.name);assert.ok(body.text.length>100);assert.match(body.sha,/^[a-f0-9]{64}$/);
  if(file.name.endsWith('.pdf'))for(let n=1;n<=4;n++)assert.ok(body.text.includes(`Evidence Marker ${n}`));
  else assert.match(body.text,/Chapter 2: Review/);
  console.log(`PASS actual source-upload extraction: ${file.name}; mocked job creation, no generation or storage write.`);
 }
 const drop=async files=>{
  const transfer=await p.evaluateHandle(files=>{const data=new DataTransfer();for(const file of files)data.items.add(new File([file.text],file.name,{type:'text/plain'}));return data;},files);
  await p.locator('[data-upload-drop]').dispatchEvent('dragenter',{dataTransfer:transfer});
  assert.ok(await p.locator('[data-upload-drop]').evaluate(el=>el.classList.contains('is-dragging')));
  await p.locator('[data-upload-drop]').dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose();
  assert.equal(await p.locator('[data-upload-drop]').evaluate(el=>el.classList.contains('is-dragging')),false);
 };
 await clear();await drop([{name:'dropped-notes.md',text:source}]);
 assert.match(await p.locator('[data-upload-files]').innerText(),/dropped-notes.md/);
 await start();await p.getByText('QA extraction complete; generation intentionally not started.',{exact:true}).waitFor({timeout:90000});
 assert.equal(captured.at(-1).name,'dropped-notes.md');assert.equal(captured.at(-1).size,Buffer.byteLength(source));
 await p.locator('[data-upload-clear]').click();assert.ok(await p.locator('[data-upload-submit]').isDisabled());assert.equal(await p.locator('[data-upload-files] li').count(),0);
 await drop([{name:'one.md',text:source},{name:'two.md',text:source}]);assert.equal(await p.locator('[data-upload-files] li').count(),2);await start();await p.getByText('QA extraction complete; generation intentionally not started.',{exact:true}).first().waitFor();assert.deepEqual(captured.slice(-2).map(x=>x.name),['one.md','two.md']);await clear();
 await drop([{name:'program.exe',text:source}]);await p.getByText(/Choose a PDF, EPUB, DOCX/).waitFor();assert.ok(await p.locator('[data-upload-submit]').isDisabled());
 const largePdf=path.join(temporary,'illustrated-book.pdf');await fs.writeFile(largePdf,pdfFixture(true,12*1024*1024));
 await clear();await p.getByLabel('Source file').setInputFiles(largePdf);await start();await p.getByText('QA extraction complete; generation intentionally not started.',{exact:true}).waitFor({timeout:90000});
 assert.ok(captured.at(-1).size>10*1024*1024);assert.match(captured.at(-1).text,/Evidence Marker 4/);
 const count=captured.length;
 const boundary=path.join(temporary,'boundary.pdf');const file=await fs.open(boundary,'w');await file.truncate(50*1024*1024);await file.close();
 await clear();await p.getByLabel('Source file').setInputFiles(boundary);assert.equal(await p.locator('[data-upload-submit]').isDisabled(),false);
 await fs.truncate(boundary,50*1024*1024+1);
 for(const [file,message] of [[{name:'empty.txt',mimeType:'text/plain',buffer:Buffer.alloc(0)},'Choose a non-empty source file.'],[boundary,'Choose a source file up to 50 MB.']]) {
  await clear();await p.getByLabel('Source file').setInputFiles(file);await p.getByText(message,{exact:true}).waitFor();assert.ok(await p.locator('[data-upload-submit]').isDisabled());assert.equal(captured.length,count);
 }
 await clear();await p.getByLabel('Source file').setInputFiles({name:'too-short.txt',mimeType:'text/plain',buffer:Buffer.from('Too short.')});await p.locator('[data-upload-submit]').click();await p.getByText('Not enough readable text. Upload a searchable document.',{exact:true}).waitFor();assert.equal(captured.length,count);
 console.log('PASS real drag/drop, replacement/removal, multiple-file acceptance and type rejection, 12 MB PDF extraction, exact 50 MB boundary, empty and insufficient-text rejection.');
 await clear();await p.getByLabel('Source file').setInputFiles({name:'scanned.pdf',mimeType:'application/pdf',buffer:pdfFixture(false)});await p.locator('[data-upload-submit]').click();await p.getByText(/This PDF contains pages without readable text/).waitFor({timeout:90000});assert.equal(captured.length,count,'unsearchable PDFs never reach generation');
 assert.deepEqual(provider,[]);console.log('PASS OCR-required message and zero provider calls.');
}finally{await browser.close();await fs.rm(temporary,{recursive:true,force:true});}
