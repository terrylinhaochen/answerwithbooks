import assert from 'node:assert/strict';import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const origin=process.env.AWB_TEST_ORIGIN||'http://127.0.0.1:4321';
try{
 const guest=await browser.newPage({viewport:{width:390,height:850}});await guest.goto(origin+'/connect-agent/?code=ABCD-1234-EF56');
 await guest.locator('[data-agent-login]').waitFor();assert.equal(await guest.locator('#agent-code').inputValue(),'ABCD-1234-EF56');assert.equal(await guest.locator('[data-agent-login]').getAttribute('href'),'/login/?from=agent');
 assert.ok(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await guest.screenshot({path:'/private/tmp/awb-connect-agent-mobile.png',fullPage:true});
 await guest.locator('[data-agent-login]').click();assert.equal(await guest.locator('[data-signup-link]').getAttribute('href'),'/signup/?from=agent');await guest.close();
 const session={access_token:'synthetic-ui-token',refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'00000000-0000-4000-8000-000000000001',email:'reader@example.invalid'}};
 const context=await browser.newContext({viewport:{width:1280,height:950}});await context.addInitScript(session=>localStorage.setItem('sb-yozeqanibszoxnowmvsm-auth-token',JSON.stringify(session)),session);
 let calls=0;await context.route('**/functions/v1/book-cli-auth',async route=>{const data=route.request().postDataJSON();assert.equal(data.action,'approve');assert.equal(data.code,'ABCD-1234-EF56');calls++;await route.fulfill({status:calls===1?400:200,contentType:'application/json',body:JSON.stringify(calls===1?{error:'This code expired. Run login again.'}:{connected:true})});});
 const page=await context.newPage();await page.goto(origin+'/connect-agent/?code=ABCD-1234-EF56');await page.getByRole('button',{name:'Connect agent',exact:true}).waitFor();assert.equal(calls,0,'Opening a URL must not approve access');
 await page.getByRole('button',{name:'Connect agent',exact:true}).click();await page.getByText('This code expired. Run login again.').waitFor();assert.equal(await page.locator('button[data-agent-connect]').isEnabled(),true);
 await page.getByRole('button',{name:'Connect agent',exact:true}).click();await page.getByText('Connected. Return to your agent to use your books.').waitFor();assert.equal(calls,2);assert.equal(await page.locator('#agent-code').isDisabled(),true);
 await page.screenshot({path:'/private/tmp/awb-connect-agent-success.png',fullPage:true});console.log('PASS browser pairing: sign-in return links, explicit approval, code match, expiry error, retry, mobile and success');
}finally{await browser.close();}
