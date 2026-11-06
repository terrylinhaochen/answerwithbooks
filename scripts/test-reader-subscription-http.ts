import assert from 'node:assert/strict';

Deno.env.set('SUPABASE_URL', 'https://billing-test.invalid');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'fixture');
for (const name of ['SECRET_KEY', 'PRICE_ID', 'WEBHOOK_SECRET']) {
  Deno.env.set(`AWB_STRIPE_${name}`, 'fixture');
}
Deno.env.delete('AWB_STRIPE_PORTAL_CONFIGURATION_ID');
let handler: (req: Request) => Promise<Response>;
Deno.serve = ((h: typeof handler) => { handler = h; return {} as any; }) as typeof Deno.serve;
let portalCalls = 0;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json' },
});
globalThis.fetch = async (input: any, init?: RequestInit) => {
  const req = new Request(input, init), url = new URL(req.url);
  if (url.hostname === 'billing-test.invalid') {
    if (url.pathname === '/auth/v1/user') return req.headers.get('authorization') === 'Bearer reader'
      ? json({ id: '00000000-0000-4000-8000-000000000001' }) : json({ message: 'Unauthorized' }, 401);
    if (url.pathname === '/rest/v1/rpc/reader_plan') return json({ active: false, limit: 30 });
    if (url.pathname === '/rest/v1/reader_subscriptions') return json({ customer_id: 'cus_reader' });
  }
  if (url.hostname === 'api.stripe.com' && url.pathname === '/v1/billing_portal/sessions') {
    portalCalls++;
    const body = new URLSearchParams(await req.text());
    assert.equal(body.get('customer'), 'cus_reader');
    assert.equal(body.get('configuration'), 'bpc_awb');
    assert.equal(body.get('return_url'), 'https://answerwithbooks.com/billing/');
    return json({ url: 'https://billing.stripe.com/p/session/fixture' });
  }
  throw Error(`Unexpected request ${url.hostname}${url.pathname}`);
};
await import('../supabase/functions/reader-subscription/index.ts');
const call = (action: string, token = 'reader') => handler(new Request('https://billing-test.invalid/reader-subscription', {
  method: 'POST', headers: { authorization: `Bearer ${token}`, origin: 'https://answerwithbooks.com' },
  body: JSON.stringify({ action }),
}));
assert.equal((await (await call('status')).json()).checkoutAvailable, false);
assert.equal((await call('checkout')).status, 503);
assert.equal((await call('portal')).status, 503);
assert.equal(portalCalls, 0);
Deno.env.set('AWB_STRIPE_PORTAL_CONFIGURATION_ID', 'bpc_awb');
assert.equal((await call('portal', 'invalid')).status, 401);
assert.equal(portalCalls, 0);
assert.equal((await (await call('status')).json()).checkoutAvailable, true);
const portal = await call('portal');
assert.equal(portal.status, 200);
assert.equal((await portal.json()).url, 'https://billing.stripe.com/p/session/fixture');
assert.equal(portalCalls, 1);
console.log('PASS checkout blocked without dedicated portal; authenticated portal uses owner customer and explicit configuration');
