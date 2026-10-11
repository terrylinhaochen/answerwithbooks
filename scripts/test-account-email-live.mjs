// Opt-in, real inbox delivery check. Never run automatically from CI.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {chromium} from 'playwright';

const phase=process.argv[2];
assert.ok(['begin','status','recovery','cleanup'].includes(phase),'Choose begin, status, recovery, or cleanup. See docs/SIGNUP_TRACKING.md.');
const statePath=process.env.AWB_EMAIL_TEST_STATE||'/private/tmp/awb-email-test.json';
const project='yozeqanibszoxnowmvsm',url=`https://${project}.supabase.co`;
let state,browser;
try {
 const keys=JSON.parse(execFileSync('/opt/homebrew/bin/supabase',['projects','api-keys','--project-ref',project,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
 const admin=createClient(url,keys.find(x=>x.name==='service_role').api_key,{auth:{persistSession:false,autoRefreshToken:false}});
 const save=()=>writeFile(statePath,JSON.stringify(state),{mode:0o600});
 if(phase==='begin'){
  const inbox=process.env.AWB_TEST_EMAIL||'';
  assert.match(inbox,/^[^+@\s]+@[^@\s]+\.[^@\s]+$/,'Set AWB_TEST_EMAIL to the explicitly authorized base inbox, without a plus tag.');
  const [local,domain]=inbox.split('@');
  state={email:`${local}+awb-test-${randomBytes(10).toString('hex')}@${domain}`,password:randomBytes(32).toString('base64url')+'Aa9!',origin:process.env.AWB_TEST_ORIGIN||'https://answerwithbooks.com',startedAt:new Date().toISOString()};
  await writeFile(statePath,JSON.stringify(state),{mode:0o600,flag:'wx'});
  browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage();
  await page.goto(state.origin+'/signup/?from=agent');
  await page.locator('#email').fill(state.email);await page.locator('#password').fill(state.password);
  const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/v1/signup'&&r.request().method()==='POST');
  await page.locator('#submit-btn').click();const response=await responsePromise;
  assert.equal(response.status(),200,'Signup request failed or was rate limited. This is not a pass.');
  const body=await response.json();state.id=body.id||body.user?.id;assert.ok(state.id,'Signup did not return a fixture account.');await save();
  const marked=await admin.auth.admin.updateUserById(state.id,{app_metadata:{awb_test_account:true}});assert.ifError(marked.error);
  assert.deepEqual(marked.data.user.user_metadata.awb_signup,{version:1,product:'answerwithbooks',entrypoint:'agent'},'Deployed signup attribution was not persisted.');
  await page.getByText('Account request accepted',{exact:true}).waitFor();state.signupRequestAccepted=true;await save();
  console.log('Signup request accepted by the deployed form; attribution persisted. Check the authorized inbox and open the confirmation link. Delivery is not yet verified.');
 }else{
  state=JSON.parse(await readFile(statePath,'utf8'));
  assert.match(state.email,/\+awb-test-[a-f0-9]{20}@/,'State is not a disposable email fixture.');
  if(!state.id&&phase==='cleanup'){
   const found=await admin.auth.admin.listUsers({page:1,perPage:1000});assert.ifError(found.error);state.id=found.data.users.find(u=>u.email===state.email)?.id;
  }
  const account=state.id?await admin.auth.admin.getUserById(state.id):null;
  if(account){assert.ifError(account.error);assert.equal(account.data.user.email,state.email,'Refusing to touch a different account.');}
  if(phase==='cleanup'){
   if(account)assert.ifError((await admin.auth.admin.deleteUser(state.id)).error);
   await unlink(statePath);console.log('Disposable email-test account and local secret state removed.');
  }else{
   assert.ok(account,'Missing email-test account.');
   const confirmed=!!account.data.user.email_confirmed_at;
   if(phase==='status'){
    state.confirmed=confirmed;await save();
    if(confirmed){
     const client=createClient(url,keys.find(x=>x.name==='anon').api_key,{auth:{persistSession:false}});
     const login=await client.auth.signInWithPassword({email:state.email,password:state.password});assert.ifError(login.error);assert.ok(login.data.session);await client.auth.signOut();
    }
    console.log(JSON.stringify({confirmed,passwordLogin:confirmed?'passed':'not_attempted',fixtureExcludedFromSignupMetrics:account.data.user.app_metadata.awb_test_account===true}));
   }else{
    assert.ok(confirmed,'Open the signup email before requesting password recovery.');
    assert.ok(!state.recoveryRequestAccepted,'Recovery was already requested; check the inbox instead of resending.');
    browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    const page=await browser.newPage();await page.goto(state.origin+'/reset-password/');await page.locator('[data-recovery-request] input').fill(state.email);
    const responsePromise=page.waitForResponse(r=>new URL(r.url()).pathname==='/auth/v1/recover'&&r.request().method()==='POST');
    await page.locator('[data-recovery-request] button').click();const response=await responsePromise;assert.equal(response.status(),200,'Recovery failed or was rate limited. This is not a pass.');
    await page.getByText(/a recovery link has been requested/).waitFor();state.recoveryRequestAccepted=true;await save();
    console.log('Recovery request accepted by the deployed form. The recipient must verify inbox delivery; do not paste the action link into logs or chat.');
   }
  }
 }
}catch{
 console.error(`Email acceptance phase ${phase} did not finish. No delivery success is claimed. Check account status, then run cleanup when finished; secrets are retained only in the owner-readable temporary state.`);process.exitCode=1;
}finally{if(browser)await browser.close();}
