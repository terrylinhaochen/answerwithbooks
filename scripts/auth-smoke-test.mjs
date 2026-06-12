/**
 * Auth smoke test: verifies email/password signup + login against the real
 * Supabase project. Run with `npm run test:auth` (requires Node 18+).
 * Creates a throwaway user; safe to run repeatedly.
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
const password = `awb-Test-${stamp}!`;

console.log(`[1/3] Signing up ${email} ...`);
const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

if (signUpError) {
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

console.log('[2/3] Attempting password login ...');
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

console.log('[3/3] Signing out ...');
await supabase.auth.signOut();
console.log('Done.');
