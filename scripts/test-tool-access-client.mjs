import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createToolAccessClient, resolveResearchOrigin } from '../src/lib/tool-access-client.mjs';

test('API origin is explicit for hosted pages and rejects unsafe destinations', () => {
  assert.equal(resolveResearchOrigin('', 'http://127.0.0.1:4321'), 'http://127.0.0.1:4318');
  assert.equal(resolveResearchOrigin('', 'https://answerwithbooks.com'), null);
  assert.equal(resolveResearchOrigin('https://api.example.com', 'https://answerwithbooks.com'), 'https://api.example.com');
  for (const origin of ['http://example.com', 'https://user:secret@example.com', 'https://example.com/path', 'https://example.com?q=x', 'https://example.com#x', 'javascript:alert(1)', 'http://127.0.0.1:4318']) {
    assert.equal(resolveResearchOrigin(origin, 'https://answerwithbooks.com'), null);
  }
});

test('account calls use the current session; the connection check only reads the catalog', async () => {
  let session = { user: { id: 'test-user' }, access_token: 'test-session-token' };
  const calls = [];
  const client = createToolAccessClient('https://api.example.com', async () => session, async (url, init) => {
    calls.push({ url, init });
    return init.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ keys: [], capabilities: [] });
  });
  await client.list('test-user');
  await client.create('test-user', 'My agent');
  await client.revoke('test-user', '00000000-0000-4000-8000-000000000001');
  await client.check('test-platform-key');
  assert.deepEqual(calls.map(call => call.url), [
    'https://api.example.com/account/keys', 'https://api.example.com/account/keys',
    'https://api.example.com/account/keys/00000000-0000-4000-8000-000000000001',
    'https://api.example.com/v1/capabilities',
  ]);
  for (const { init } of calls) {
    assert.equal(init.redirect, 'error');
    assert.equal(init.credentials, 'omit');
    assert.ok(init.signal instanceof AbortSignal);
  }
  assert.equal(calls[0].init.headers.Authorization, 'Bearer test-session-token');
  assert.deepEqual(JSON.parse(calls[1].init.body), { label: 'My agent' });
  assert.equal(calls[3].init.headers.Authorization, 'Bearer test-platform-key');
  assert.equal(calls[3].init.method, undefined);
  assert.ok(calls.every(call => !call.url.endsWith('/v1/run')));
  session = { user: { id: 'another-user' }, access_token: 'another-token' };
  await assert.rejects(client.list('test-user'), /sign-in changed/);
  session = null;
  await assert.rejects(client.create('test-user', 'Key'), /sign-in changed/);
  assert.throws(() => client.revoke('test-user', '../another-user'), /Invalid key/);
  assert.equal(calls.length, 4);
});

test('errors are sanitized and key creation is never retried automatically', async () => {
  let attempts = 0;
  const session = async () => ({ user: { id: 'u' }, access_token: 'token' });
  const client = createToolAccessClient('https://api.example.com', session, async () => {
    attempts++;
    return Response.json({ error: { code: 'UNKNOWN', message: 'private provider detail' } }, { status: 500 });
  });
  await assert.rejects(client.create('u', 'Key'), error => /refresh and try again/.test(error.message) && !error.message.includes('private provider'));
  assert.equal(attempts, 1);
  const pending = createToolAccessClient('https://api.example.com', session, async () => Response.json({ error: { code: 'ACCESS_PENDING' } }, { status: 403 }));
  await assert.rejects(pending.create('u', 'Key'), /requires approval/);
  const disabled = createToolAccessClient(null, session, async () => { throw new Error('must not fetch'); });
  await assert.rejects(disabled.list('u'), /not enabled/);
});

test('checkout carries explicit policy consent and a stable idempotency key with the account session', async () => {
  const calls = [];
  const session = async () => ({ user: { id: 'u' }, access_token: 'account-token' });
  const client = createToolAccessClient('https://api.example.com', session, async (url, init) => { calls.push({ url, init }); return Response.json({ url: 'https://checkout.stripe.com/c/pay/fixture' }); });
  await client.checkout('u', 1000, 'checkout-fixture', 'policy-v1');
  assert.equal(calls[0].url, 'https://api.example.com/account/billing/checkout');
  assert.equal(calls[0].init.headers.Authorization, 'Bearer account-token');
  assert.equal(calls[0].init.headers['Idempotency-Key'], 'checkout-fixture');
  assert.deepEqual(JSON.parse(calls[0].init.body), { amountCents: 1000, acceptedPolicyVersion: 'policy-v1' });
  assert.equal(calls[0].init.redirect, 'error');
  const expired = createToolAccessClient('https://api.example.com', session, async () => Response.json({ error: { code: 'CHECKOUT_EXPIRED' } }, { status: 409 }));
  await assert.rejects(expired.checkout('u', 1000, 'expired-key', 'policy-v1'), error => error.code === 'CHECKOUT_EXPIRED' && /no longer open/.test(error.message));
  const source = readFileSync('src/lib/billing-page.ts', 'utf8');
  assert.match(source, /billing\.mode === 'live'/);
  assert.match(source, /!consent\.checked/);
  assert.match(source, /Date\.now\(\) - saved\.createdAt < 23 \* 3600000/);
  const page = readFileSync('src/pages/billing.astro', 'utf8');
  assert.match(page, /data-topup disabled/);
  assert.match(page, /Returning from checkout does not confirm a payment/);
  assert.doesNotMatch(page, /type="checkbox"[^>]*checked/);
});

test('one-time key controls clear secrets on close and identity changes', () => {
  const source = readFileSync('src/lib/tool-account-access.ts', 'utf8');
  const page = readFileSync('src/lib/tools-page.ts', 'utf8');
  const component = readFileSync('src/components/ToolAccountAccess.astro', 'utf8');
  assert.match(page, /clearSecret\(\)/);
  const dialogs = readFileSync('src/components/ToolDialogs.astro', 'utf8');
  assert.match(dialogs, /import ToolAccountAccess from/);
  assert.match(dialogs, /<ToolAccountAccess\s*\/>/);
  assert.match(page, /querySelector<HTMLElement>\('\[data-tool-access\]'\)/);
  assert.match(component, /data-tool-access/);
  assert.match(page, /setIdentity\(null\)/);
  assert.match(source, /pagehide', clearSecret/);
  assert.match(source, /revision\+\+; busy = false; wipeSecret\(\)/);
  assert.match(source, /current !== revision \|\| userId !== id/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\./);
  assert.match(component, /type="password" readonly/);
  assert.match(component, /data-key-download/);
  assert.match(component, /data-key-check/);
});

test('account pages share navigation and standalone keys retain the verified-user guard', () => {
  const nav = readFileSync('src/components/AccountNav.astro', 'utf8');
  for (const href of ['/profile/', '/billing/', '/api-keys/']) assert.ok(nav.includes(`href: '${href}'`));
  assert.match(nav, /aria-current=/);
  assert.match(nav, /aria-label="Your account"/);
  for (const [file, active] of [['profile', 'profile'], ['billing', 'billing'], ['api-keys', 'keys']]) {
    const page = readFileSync(`src/pages/${file}.astro`, 'utf8');
    assert.ok(page.includes(`<AccountNav active="${active}"`));
    assert.match(page, /robots="noindex, follow"/);
  }
  const keys = readFileSync('src/pages/api-keys.astro', 'utf8');
  const client = readFileSync('src/lib/api-keys-page.ts', 'utf8');
  assert.match(keys, /data-keys-content hidden/);
  assert.match(keys, /<ToolAccountAccess standalone/);
  assert.match(client, /supabase\.auth\.getUser\(\)/);
  assert.match(client, /email_confirmed_at/);
  assert.match(client, /is_anonymous/);
  assert.match(client, /current !== revision/);
  assert.match(client, /access\.setIdentity\(null\)/);
  assert.match(client, /onAuthStateChange/);
  assert.match(client, /pagehide/);
  const profile = readFileSync('src/pages/profile.astro', 'utf8');
  assert.doesNotMatch(profile, /OPEN_QUESTIONS_KEY|Open questions|Honest misses|Explore books|Explore guides/);
  assert.doesNotMatch(profile, /Saved books|Saved guides|SAVED_BOOKS_KEY|SAVED_ANSWERS_KEY/);
  assert.match(profile, /Your preferences/);
  assert.match(componentSource(), /data-key-dialog/);
  assert.match(componentSource(), /data-key-revoke-dialog/);
  assert.match(componentSource(), /<table class="keys-table"/);
});

const componentSource = () => readFileSync('src/components/ToolAccountAccess.astro', 'utf8');

test('book and guide bookmarks are removed without deleting historical browser data', () => {
  for (const file of ['src/pages/books/[slug].astro','src/pages/answers/[slug].astro','src/components/ActivityPanel.astro','src/lib/book-intake.ts']) {
    const source = readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /data-save-book|data-save-answer|awb:saved-books|awb:saved-answers|Books saved/);
  }
});
