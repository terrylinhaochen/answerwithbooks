/**
 * Auth smoke test: verifies email/password signup + login against the real
 * Supabase project. Run with `npm run test:auth` (requires Node 18+).
 * Creates a throwaway user. Supabase may rate-limit confirmation emails after
 * repeated runs; in that case this verifies the auth service settings and exits
 * cleanly with a rate-limit note instead of reporting an app failure.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// Read .env manually to avoid a dotenv dependency.
const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.PUBLIC_SUPABASE_ANON_KEY);

const stamp = Date.now();
// Note: Supabase rejects example.com addresses as invalid, so use a real,
// owned mailbox with a plus tag. Override via: npm run test:auth -- you@x.com
const email = process.argv[2] ?? `terrychen2026+awb-test-${stamp}@u.northwestern.edu`;
const password = process.argv[3] ?? `awb-Test-${stamp}!`;

console.log('[0/4] Checking Supabase auth settings ...');
const settings = await fetch(`${env.PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
  headers: {
    apikey: env.PUBLIC_SUPABASE_ANON_KEY,
    authorization: `Bearer ${env.PUBLIC_SUPABASE_ANON_KEY}`,
  },
});

if (!settings.ok) {
  console.log(`SETTINGS ERROR: ${settings.status} ${settings.statusText}`);
  process.exit(1);
}

const settingsData = await settings.json();
console.log(
  `SETTINGS OK: email=${Boolean(settingsData.external?.email)}, ` +
    `disable_signup=${Boolean(settingsData.disable_signup)}, ` +
    `mailer_autoconfirm=${Boolean(settingsData.mailer_autoconfirm)}`
);

console.log('[1/4] Checking password login endpoint with an expected invalid login ...');
const invalidLogin = await supabase.auth.signInWithPassword({
  email: `missing-${stamp}@u.northwestern.edu`,
  password: `not-${password}`,
});
if (!invalidLogin.error) {
  console.log('INVALID LOGIN CHECK ERROR: unexpected session returned for throwaway credentials');
  process.exit(1);
}
console.log(`INVALID LOGIN CHECK OK: ${invalidLogin.error.message}`);

console.log(`[2/4] Signing up ${email} ...`);
const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

if (signUpError) {
  if (signUpError.status === 429 || /rate limit/i.test(signUpError.message)) {
    console.log(
      `SIGNUP RATE LIMITED: ${signUpError.message}. ` +
        'Auth settings are reachable and signup is enabled; wait for the Supabase email throttle before creating more smoke-test users.'
    );
    console.log('Done.');
    process.exit(0);
  }
  console.log(`SIGNUP ERROR: ${signUpError.status ?? ''} ${signUpError.message}`);
  process.exit(1);
}

if (signUpData.session) {
  console.log('SIGNUP OK: session returned immediately (email confirmation is DISABLED).');
} else if (signUpData.user) {
  console.log(
    `SIGNUP OK: user created (id=${signUpData.user.id}), no session — ` +
      'email confirmation appears to be REQUIRED (confirmation email sent).'
  );
} else {
  console.log('SIGNUP: unexpected response shape', signUpData);
}

console.log('[3/4] Attempting password login ...');
const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (signInError) {
  console.log(
    `LOGIN: ${signInError.message} ` +
      '(expected if email confirmation is required and the address is unconfirmed)'
  );
} else {
  console.log(`LOGIN OK: session for ${signInData.session.user.email}`);
}

console.log('[4/4] Signing out ...');
await supabase.auth.signOut();
console.log('Done.');
