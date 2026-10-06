import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(`../supabase/templates/${name}`,import.meta.url),'utf8');
const manifest=JSON.parse(read('manifest.json'));
assert.equal(Object.keys(manifest).length,13);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#x27;');
const tokens={confirmation:['ConfirmationURL'],magic_link:['ConfirmationURL'],recovery:['ConfirmationURL'],email_change:['NewEmail','ConfirmationURL'],invite:['ConfirmationURL'],reauthentication:['Token'],password_changed_notification:[],email_changed_notification:['OldEmail','Email'],phone_changed_notification:['OldPhone','Phone'],mfa_factor_enrolled_notification:['FactorType'],mfa_factor_unenrolled_notification:['FactorType'],identity_linked_notification:['Provider','Email'],identity_unlinked_notification:['Provider','Email']};
for(const [name,{subject,file}] of Object.entries(manifest)) {
 const html=read(file),body=html.split('<body')[1];
 assert.equal((html.match(/<!doctype html>/g)||[]).length,1);
 assert.equal((html.match(/<body/g)||[]).length,1);
 assert.ok(html.includes(`<title>${escape(subject)}</title>`));
 assert.ok(subject.includes('Answer with Books'));
 assert.doesNotMatch(html,/\bAWB\b|\bArda\b|AnswerWithBooks|token=|token_hash=|127\.0\.0\.1|localhost|—/);
 assert.deepEqual([...body.matchAll(/\{\{ \.(\w+) \}\}/g)].map(x=>x[1]).sort(),tokens[name].sort(),name+' dynamic fields');
 assert.match(html,/https:\/\/answerwithbooks.com\/privacy\//);
}
for(const name of ['confirmation','magic_link','recovery']) {
 const html=read(manifest[name].file);
 assert.match(html,/<table[^>]+align="center"><tr><td align="center"[^>]*><a href="\{\{ \.ConfirmationURL \}\}"/);
 assert.match(html,/expires shortly and can only be used once/);
 assert.match(html,/safely ignore this email/);
 assert.doesNotMatch(html,/subscrib|newsletter/i);
}
if(process.argv.includes('--browser')) {
 const {chromium}=await import('playwright');
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 try {
  const page=await browser.newPage();
  for(const width of [600,390,320])for(const [name,{file}] of Object.entries(manifest)) {
   await page.setViewportSize({width,height:1100});
   await page.setContent(read(file).replaceAll('{{ .ConfirmationURL }}','#preview-only').replace(/\{\{ \.(\w+) \}\}/g,(_,token)=>token==='Token'?'123456':token.includes('Email')?'reader@example.com':'example'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name} at ${width}px`);
   if(['confirmation','magic_link','recovery'].includes(name)) {
    const box=await page.locator('a[href="#preview-only"]').boundingBox();assert.ok(Math.abs(box.x+box.width/2-width/2)<3,'Centered action');
    if(width===390)await page.screenshot({path:`/private/tmp/answerwithbooks-email-${name}.png`,fullPage:true});
   }
  }
 }finally{await browser.close();}
 console.log('PASS 13 email previews at desktop and two mobile widths, with centered primary actions.');
}
console.log('PASS 13 branded email templates, dynamic fields preserved, account emails independent of newsletter consent. No email sent.');
