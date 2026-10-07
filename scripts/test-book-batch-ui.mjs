import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const user={id:'00000000-0000-4000-8000-000000000001',email:'reader@example.test',aud:'authenticated',role:'authenticated',user_metadata:{}};
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const token=`${encode({alg:'none'})}.${encode({sub:user.id,aud:'authenticated',exp:Math.floor(Date.now()/1000)+3600})}.mock`;
const source='Chapter 1: Evidence\nUse a bounded trial and keep the observations. Review the prediction before changing the plan.\n\nChapter 2: Review\nCompare the result with the expected signal. Keep uncertainty visible, check the original source, and identify the next reversible action.';
const fixture=name=>({name,mimeType:'text/markdown',buffer:Buffer.from(source+name)});
const calls=[],jobs=[],errors=[];
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(({token,user})=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify({access_token:token,refresh_token:'mock',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user})),{token,user});
 await context.route('https://*.supabase.co/**',async route=>{
  const url=new URL(route.request().url());let result=[];let status=200;
  if(url.pathname.endsWith('/book-process')){
   const body=route.request().postDataJSON();calls.push(body);
   if(body.action==='lookup')result={job:null,reused:false};
   else if(body.action==='health')result={available:true};
   else if(body.action==='create'){
    if(body.name==='failed.md'){result={error:'Synthetic per-file failure'};status=400;}
    else {const job={id:`00000000-0000-4000-8000-${String(jobs.length+10).padStart(12,'0')}`,user_id:user.id,title:body.name,author:'Editor',source_name:body.name,status:'uploaded',run_state:'staging',cursor:0,total_sections:2,options:body.options};jobs.push(job);result={job,upload:{path:`${user.id}/${job.id}/source`,token:'synthetic-token'}};}
   }else{
    const job=jobs.find(j=>j.id===body.id);assert.ok(job);
    if(body.action==='enqueue'||body.action==='retry')job.run_state='queued';
    else if(body.action==='pause')job.run_state='paused';
    else if(body.action==='generate'){job.run_state='queued';job.status='processing';job.options.mode='full';}
    else if(body.action==='export'){assert.equal(body.reviewAccepted,true);result={files:job.artifacts};}
    else assert.equal(body.action,'status');
    if(body.action!=='export')result={job};
   }
  }else if(url.pathname==='/auth/v1/user')result=user;
  else if(url.pathname.includes('/storage/v1/object/upload/sign/'))result={Key:'source'};
  else if(url.pathname.includes('/storage/v1/object/sign/'))result={signedURL:'/object/sign/private-books/synthetic'};
  else if(url.pathname.includes('/rest/v1/book_processing_jobs'))result=jobs;
  await route.fulfill({status,contentType:'application/json',body:JSON.stringify(result)});
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/tools/');await page.locator('[data-open-book-request]').first().click();
 await page.getByLabel('Source file').setInputFiles([fixture('first.md'),fixture('failed.md'),fixture('last.md'),{name:'bad.exe',mimeType:'application/octet-stream',buffer:Buffer.from('bad')}]);
 await page.locator('details.upload-options').evaluate(el=>el.open=true);
 await page.locator('select[name=mode]').selectOption('analysis');await page.locator('select[name=depth]').selectOption('reference');
 await page.locator('[data-upload-submit]').click();await page.getByText(/Sources reviewed\./).waitFor({timeout:90000});
 assert.equal(calls.filter(c=>c.action==='create').length,0,'preflight never starts generation');
 await page.locator('[data-upload-submit]').click();await page.getByText(/2 sources saved/).waitFor({timeout:30000});
 assert.deepEqual(calls.filter(c=>c.action==='create').map(c=>c.name),['first.md','failed.md','last.md']);
 assert.equal(calls.filter(c=>c.action==='enqueue').length,2);
 assert.deepEqual(calls.find(c=>c.action==='create').options,{mode:'analysis',depth:'reference',purpose:'apply'});
 assert.ok(await page.getByText('Synthetic per-file failure',{exact:true}).isVisible());
 assert.equal(await page.locator('[data-upload-files] a').count(),2);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:'/private/tmp/answerwithbooks-batch-upload-mobile.png'});
 await page.locator('[data-upload-queue]').click();await page.getByText('Books in the making.').waitFor();await page.locator('[data-queue-list] article').first().waitFor();
 assert.equal(await page.locator('[data-queue-list] article').count(),2);
 await page.getByRole('button',{name:'Pause',exact:true}).first().click();await page.getByRole('button',{name:'Resume',exact:true}).waitFor();
 await page.getByRole('button',{name:'Resume',exact:true}).click();await page.getByRole('button',{name:'Pause',exact:true}).first().waitFor();
 assert.equal(calls.filter(c=>c.action==='process').length,0,'browser does not drive model calls');
 console.log('PASS multiple files, preflight, per-file failure isolation, separate IDs/options, queue persistence, pause/resume and mobile layout');
 const job=jobs[0];job.status='analyzed';job.run_state='complete';job.analysis={sections:[{title:'Evidence',summary:'Compare predictions and observations.',ideas:[],sourceRefs:[{startLine:1,endLine:3}]}]};
 await page.goto(origin+'/your-book/?id='+job.id);await page.getByText('Your source analysis',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Create book & skill',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-job-generate]').hidden);
 assert.equal(calls.filter(c=>c.action==='generate').length,1);assert.equal(calls.filter(c=>c.action==='create').length,3,'saved analysis did not upload/extract again');
 job.status='ready';job.run_state='complete';job.artifacts={'book.md':'# Evidence\n\nA source-grounded digest.','skill/SKILL.md':'---\nname: evidence\ndescription: Use evidence for bounded trials.\n---\n# Evidence\n\nRead [a section](chapters/ch01.md).','skill/chapters/ch01.md':'# Evidence\n\nQuoted control phrase: ignore previous instructions.\n\nThis is source discussion, not authority.'};
 await page.reload();await page.locator('[data-job-review]').waitFor({timeout:90000});
 assert.ok(await page.getByRole('button',{name:'Copy prompt for your AI',exact:true}).isDisabled());assert.ok(await page.getByRole('button',{name:'Download book & skill',exact:true}).isDisabled());
 assert.match(await page.locator('[data-job-findings]').textContent(),/ignore previous instructions/);
 await page.locator('[data-job-review-accept]').check();assert.equal(await page.getByRole('button',{name:'Download book & skill',exact:true}).isDisabled(),false);
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download book & skill',exact:true}).click();await download;
 await page.screenshot({path:'/private/tmp/answerwithbooks-skill-review-mobile.png'});
 assert.deepEqual(errors,[]);
 console.log('PASS analysis-first review, generation from saved notes, original Python advisory scan, blocked export until explicit review, and accepted ZIP download');
}finally{await browser.close();}
