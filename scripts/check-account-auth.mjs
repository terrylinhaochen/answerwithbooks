// Public, read-only auth settings check. No account, email, login or payment is created.
import assert from 'node:assert/strict';
const {PUBLIC_SUPABASE_URL:url,PUBLIC_SUPABASE_ANON_KEY:key}=process.env;
assert.ok(url&&key,'Missing public Supabase configuration');
const response=await fetch(`${url}/auth/v1/settings`,{
  headers:{apikey:key},signal:AbortSignal.timeout(15000),redirect:'error',
});
assert.equal(response.status,200,'Account auth settings are unavailable');
const settings=await response.json();
assert.equal(settings.disable_signup,false,'New account registration is disabled');
assert.equal(settings.external?.email,true,'Email authentication is disabled');
assert.equal(settings.mailer_autoconfirm,false,'Expected email confirmation before private account use');
console.log('Account registration and email-confirmation settings passed. Email delivery and browser journeys are separate checks.');
