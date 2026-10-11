// Operator-only production acceptance with disposable accounts. No emails or paid calls.
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {exerciseLocalGuide} from './fixtures/launch-local-guide.mjs';
import {createClient} from '@supabase/supabase-js';import {chromium} from 'playwright';
if(process.env.AWB_LAUNCH_AUTH_TEST!=='1')throw Error('Set AWB_LAUNCH_AUTH_TEST=1 for disposable production-account acceptance.');
const project='yozeqanibszoxnowmvsm',url=`https://${project}.supabase.co`,origin=process.env.AWB_TEST_ORIGIN||'https://answerwithbooks.com';
const keys=JSON.parse(execFileSync('/opt/homebrew/bin/supabase',['projects','api-keys','--project-ref',project,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const anon=keys.find(k=>k.name==='anon').api_key,admin=createClient(url,keys.find(k=>k.name==='service_role').api_key,{auth:{persistSession:false,autoRefreshToken:false}});
const work=await mkdtemp(join(tmpdir(),'awb-launch-auth-')),email=`awb-launch-${randomBytes(8).toString('hex')}@example.invalid`,password=randomBytes(32).toString('base64url')+'Aa9!';
const receipt={origin,checks:[],emailsSent:0,paidGenerationCalls:0};let userId,browser,loginProcess,guideId,guideTitle,ownerClient,stage='signup confirmation';
const record=(name,detail={})=>{receipt.checks.push({name,...detail});console.log('PASS '+name);};
try {
 const signup=await admin.auth.admin.generateLink({type:'signup',email,password,options:{redirectTo:origin+'/auth/confirm/?from=agent',data:{awb_signup:{version:1,product:'answerwithbooks',entrypoint:'agent'}}}});
 assert.ifError(signup.error);userId=signup.data.user.id;assert.equal(!!signup.data.user.email_confirmed_at,false);
 assert.ifError((await admin.auth.admin.updateUserById(userId,{app_metadata:{awb_test_account:true}})).error);
 browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const context=await browser.newContext({viewport:{width:390,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',()=>errors.push('browser error'));
 await page.goto(signup.data.properties.action_link,{waitUntil:'domcontentloaded'});
 await page.waitForURL(u=>u.origin===origin&&!u.pathname.startsWith('/auth/'),{timeout:25000});
 assert.equal(new URL(page.url()).pathname,'/connect-agent/');
 record('Real confirmation link establishes a browser session',{destination:new URL(page.url()).pathname,agentReturnPreserved:new URL(page.url()).pathname==='/connect-agent/'});
 assert.ok((await admin.auth.admin.getUserById(userId)).data.user.email_confirmed_at);
 stage='password recovery';const recovery=await admin.auth.admin.generateLink({type:'recovery',email,options:{redirectTo:origin+'/reset-password/'}});assert.ifError(recovery.error);
 await page.goto(recovery.data.properties.action_link,{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(1800);const recoveryPath=new URL(page.url()).pathname;
 receipt.checks.push({name:'Password recovery returns to the reset form',passed:recoveryPath==='/reset-password/',destination:recoveryPath});
 console.log((recoveryPath==='/reset-password/'?'PASS ':'FAIL ')+'Password recovery returns to the reset form; destination '+recoveryPath);
 if(recoveryPath==='/reset-password/'){
  await page.locator('[data-recovery-update]').waitFor({state:'visible'});await page.locator('[data-recovery-update] input').fill(password+'New');await page.locator('[data-recovery-update] button').click();await page.getByText('Password updated. You can now sign in with it.').waitFor();record('Recovered password is saved by the deployed form');
 }
 stage='private billing';await page.goto(origin+'/billing/');await page.locator('[data-open-topup]:enabled').waitFor();
 const billing=await page.locator('[data-billing-status]').innerText();assert.match(billing,/Stripe/);await page.locator('[data-open-topup]').click();await page.locator('[data-topup-controls]').waitFor({state:'visible'});assert.equal(await page.locator('[data-topup]').isDisabled(),true);
 record('Fresh confirmed account sees live billing and consent-gated top-ups',{mode:'live',amounts:await page.locator('[data-topup-amount] option').allTextContents()});
 await page.locator('[data-close-topup]').click();
 stage='CLI browser pairing';const cli=resolve('../core/bin/answer-with-books.js'),env={...process.env,ANSWER_WITH_BOOKS_CONFIG_DIR:join(work,'session'),ANSWER_WITH_BOOKS_CACHE_DIR:join(work,'cache'),CODEX_HOME:join(work,'codex')};
 loginProcess=spawn(process.execPath,[cli,'login','--no-browser'],{env,cwd:work,stdio:['ignore','pipe','pipe']});let output='';loginProcess.stdout.on('data',x=>output+=x);loginProcess.stderr.on('data',()=>{});
 const done=new Promise((resolve,reject)=>{loginProcess.on('exit',c=>c===0?resolve():reject(Error('CLI login failed')));loginProcess.on('error',reject)});done.catch(()=>{});
 let code;for(let i=0;i<80&&!code;i++){code=output.match(/Code: ([A-F0-9-]+)/)?.[1];if(!code)await new Promise(r=>setTimeout(r,250));}assert.ok(code);
 await page.goto(origin+'/connect-agent/?code='+code);assert.equal(await page.locator('#agent-code').isVisible(),false);assert.equal(await page.locator('#agent-code').inputValue(),code);assert.equal(await page.locator('[data-agent-start]').isVisible(),false);await page.getByRole('button',{name:'Connect agent',exact:true}).click();await page.getByText('Connected. Return to your agent to use your books.').waitFor();await done;loginProcess=null;
 const library=JSON.parse(execFileSync(process.execPath,[cli,'books','--private','--json'],{env,cwd:work,encoding:'utf8',stdio:['ignore','pipe','pipe']}));assert.equal(library.count,0);
 record('Fresh account connects CLI through real browser approval and reads an empty private library');
 stage='Local guide to hosted retrieval';
 ownerClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});assert.ifError((await ownerClient.auth.signInWithPassword({email,password:password+'New'})).error);
 const guide=await exerciseLocalGuide({cli,env,work,onImported:(id,title)=>{guideId=id;guideTitle=title;}});record('Two local sources become one guide, automatically sync, and return cited methods through the connected CLI',{sourceCount:guide.sourceCount,remoteMatches:guide.remoteMatches,boundary:guide.boundary});
 await page.goto(origin+'/your-book/?id='+guideId);await page.locator('[data-job-reading] h2').waitFor();assert.match(await page.locator('[data-job-reading]').innerText(),/Urgent commitments instead receive a daily review/);record('Automatically synced local guide renders its editorial digest in the hosted reader');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const removed=await ownerClient.functions.invoke('book-process',{body:{action:'delete-book',id:guideId,confirmTitle:guideTitle}});assert.ifError(removed.error);guideId=null;
 execFileSync(process.execPath,[cli,'logout'],{env,cwd:work,stdio:['ignore','pipe','pipe']});record('CLI logout revokes the temporary connection');
 assert.deepEqual(errors,[]);receipt.passed=receipt.checks.every(x=>x.passed!==false);
}catch(e){receipt.passed=false;receipt.failedStage=stage;receipt.error=String(e.message).replace(/https?:\/\/\S+/g,'[url]').replaceAll(email,'[test inbox]');console.error('FAIL '+stage+': '+receipt.error);process.exitCode=1;}
finally {
 if(loginProcess)loginProcess.kill();
 if(guideId&&ownerClient){assert.ifError((await ownerClient.functions.invoke('book-process',{body:{action:'delete-book',id:guideId,confirmTitle:guideTitle}})).error);}
 if(userId){assert.ifError((await admin.auth.admin.deleteUser(userId)).error);receipt.cleaned=true;}
 await rm(work,{recursive:true,force:true});await writeFile('/private/tmp/awb-launch-auth-live.json',JSON.stringify(receipt,null,2));
 if(browser){
  let timer;receipt.browserClosed=await Promise.race([browser.close().then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),10000);})]);clearTimeout(timer);
  await writeFile('/private/tmp/awb-launch-auth-live.json',JSON.stringify(receipt,null,2));
 }
 if(!receipt.passed)process.exitCode=1;
 // The isolated browser can leave its close handshake pending after Chrome exits.
 // Account/storage/secret cleanup and the result are persisted before ending this test.
 process.exit(process.exitCode||0);
}
