import assert from 'node:assert/strict';
import {handleSignup} from '../supabase/functions/newsletter-signup/handler.mjs';
const config={url:'https://test.supabase.co',serviceKey:'server-only-test-key'};
const valid={email:' Reader@Example.com ',consent:true,consentVersion:'awb-newsletter-v1',sourcePath:'/newsletter/'};
const request=(body=valid,headers={},method='POST')=>new Request('https://test.supabase.co/functions/v1/newsletter-signup',{method,headers:{origin:'https://answerwithbooks.com',authorization:'Bearer public-test-key','content-type':'application/json',...headers},...(method==='GET'||method==='OPTIONS'?{}:{body:typeof body==='string'?body:JSON.stringify(body)})});
let calls=0;
const accepted=async(url,options)=>{
  calls++;
  const data=JSON.parse(options.body);
  assert.equal(data.p_email,'reader@example.com');
  assert.equal(data.p_consent_version,'awb-newsletter-v1');
  assert.match(data.p_rate_key,/^[0-9a-f]{64}$/);
  return Response.json('accepted');
};
assert.equal((await handleSignup(request(),config,accepted)).status,202);
assert.equal(calls,1);
for(const [req,status] of [[request({...valid,email:'bad'}),400],[request({...valid,consent:false}),400],[request({...valid,consentVersion:'old'}),400],[request('{'),400],[request('x'.repeat(2050)),413],[request(valid,{origin:'https://evil.example'}),403],[request(valid,{},'GET'),405],[request(valid,{authorization:''}),401],[request(valid,{'content-type':'text/plain'}),415]]){
  assert.equal((await handleSignup(req,config,accepted)).status,status);
}
assert.equal((await handleSignup(request({...valid,website:'bot'}),config,accepted)).status,202);
assert.equal(calls,1,'Rejected or honeypot requests must not hit the database');
assert.equal((await handleSignup(request(),config,async()=>Response.json('rate_limited'))).status,429);
assert.equal((await handleSignup(request(),config,async()=>new Response('',{status:500}))).status,503);
assert.equal((await handleSignup(request(),config,async()=>{throw Error('offline')})).status,503);
assert.equal((await handleSignup(request(),{})).status,503);
console.log('PASS: server validation, consent, origin, size limits, honeypot, rate-limit response, private write, and failure handling.');
