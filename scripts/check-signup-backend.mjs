// Deliberately invalid payload: verifies routing/auth/CORS without saving or emailing.
import assert from 'node:assert/strict';
const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_ANON_KEY;
assert.ok(url && key, 'Missing public Supabase build configuration');
const origin = 'https://answerwithbooks.com';
const endpoint = `${url}/functions/v1/newsletter-signup`;
const preflight = await fetch(endpoint, {
  method: 'OPTIONS',
  headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,apikey,content-type' },
  signal: AbortSignal.timeout(15000),
});
assert.equal(preflight.status, 204, 'Signup preflight failed');
assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
const response = await fetch(endpoint, {
  method: 'POST',
  headers: { Origin: origin, apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: '{}',
  signal: AbortSignal.timeout(15000),
});
assert.equal(response.status, 400, 'Signup validation endpoint unavailable');
assert.equal((await response.json()).error, 'Enter a valid email address.');
console.log('Live signup routing, public key, CORS and validation passed; no signup created.');
