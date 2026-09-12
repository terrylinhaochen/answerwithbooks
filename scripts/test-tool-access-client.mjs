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
  await assert.rejects(client.create('u', 'Key'), error => /Refresh your keys/.test(error.message) && !error.message.includes('private provider'));
  assert.equal(attempts, 1);
  const pending = createToolAccessClient('https://api.example.com', session, async () => Response.json({ error: { code: 'ACCESS_PENDING' } }, { status: 403 }));
  await assert.rejects(pending.create('u', 'Key'), /requires approval/);
  const disabled = createToolAccessClient(null, session, async () => { throw new Error('must not fetch'); });
  await assert.rejects(disabled.list('u'), /not enabled/);
});

test('one-time key controls clear secrets on close and identity changes', () => {
  const source = readFileSync('src/lib/tool-account-access.ts', 'utf8');
  const page = readFileSync('src/lib/tools-page.ts', 'utf8');
  const component = readFileSync('src/components/ToolAccountAccess.astro', 'utf8');
  assert.match(page, /clearSecret\(\)/);
  assert.match(page, /setIdentity\(null\)/);
  assert.match(source, /pagehide', clearSecret/);
  assert.match(source, /revision\+\+; busy = false; wipeSecret\(\)/);
  assert.match(source, /current !== revision \|\| userId !== id/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|console\./);
  assert.match(component, /type="password" readonly/);
  assert.match(component, /data-key-download/);
  assert.match(component, /data-key-check/);
});
