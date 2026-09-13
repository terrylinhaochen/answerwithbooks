// Keep account tokens restricted to the operator-configured API origin.
export function resolveResearchOrigin(configured, pageOrigin) {
  const page = new URL(pageOrigin);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(page.hostname);
  const value = configured?.trim() || (local ? 'http://127.0.0.1:4318' : '');
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))) return null;
    return url.origin;
  } catch { return null; }
}

export function createToolAccessClient(origin, getSession, request = fetch) {
  async function call(path, token, init = {}) {
    if (!origin) throw new Error('Research API access is not enabled on this deployment yet.');
    let response;
    try {
      response = await request(origin + path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}) }, redirect: 'error', signal: AbortSignal.timeout(12000), credentials: 'omit' });
    } catch { throw new Error('Could not connect to the research API. Check that it is running, then retry.'); }
    if (response.status === 204) return null;
    let data;
    try { data = await response.json(); } catch { throw new Error('The research API returned an unreadable response.'); }
    if (!response.ok) {
      const messages = {
        ACCOUNT_BRIDGE_DISABLED: 'Account access is not enabled on this API yet.',
        ACCOUNT_UNAUTHORIZED: 'Please sign in again to manage your API keys.',
        ACCESS_PENDING: 'Your account is ready. Research API access requires approval during the private preview.',
        INVALID_ORIGIN: 'This website has not been connected to the research API yet.',
        AUTH_UNAVAILABLE: 'Account verification is temporarily unavailable. Please retry shortly.',
        KEY_LIMIT: 'You have three active keys. Revoke one to create another.',
        KEY_RATE_LIMIT: 'Wait ten minutes before creating another key.',
        UNAUTHORIZED: 'This key is no longer active, or research access has been removed.',
        NOT_FOUND: 'This key no longer exists. Refresh your keys.',
        BILLING_DISABLED: 'Payments are not enabled yet. No payment was taken.',
        INVALID_TOPUP: 'Choose one of the listed credit amounts.',
        POLICY_CONFIRMATION_REQUIRED: 'Review and accept the current credit terms before checkout.',
        CHECKOUT_EXPIRED: 'That checkout is no longer open. Refresh billing before starting another.',
        CHECKOUT_RATE_LIMIT: 'Wait before starting another checkout.',
        PAYMENT_REVIEW: 'Your payments are under review. Contact support before adding funds or running another skill.',
        INSUFFICIENT_FUNDS: 'Add funds before starting this task.',
      };
      const error = new Error(messages[data?.error?.code] || 'The request did not finish. Please refresh and try again.');
      error.code = data?.error?.code;
      throw error;
    }
    return data;
  }
  async function account(path, expectedId, init = {}) {
    const session = await getSession();
    if (!expectedId || session?.user?.id !== expectedId || !session.access_token) throw new Error('Your sign-in changed. Please reopen setup.');
    return call(path, session.access_token, init);
  }
  return {
    billing: id => account('/account/billing', id),
    checkout: (id, amountCents, requestKey, acceptedPolicyVersion) => account('/account/billing/checkout', id, { method: 'POST', headers: { 'Idempotency-Key': requestKey }, body: JSON.stringify({ amountCents, acceptedPolicyVersion }) }),
    run: (id, runId) => {
      if (!/^[\da-f-]{36}$/i.test(runId)) throw new Error('Invalid task identifier.');
      return account(`/account/runs/${runId}`, id);
    },
    list: id => account('/account/keys', id),
    create: (id, label) => account('/account/keys', id, { method: 'POST', body: JSON.stringify({ label }) }),
    revoke: (userId, keyId) => {
      if (!/^[\da-f-]{36}$/i.test(keyId)) throw new Error('Invalid key identifier.');
      return account(`/account/keys/${keyId}`, userId, { method: 'DELETE' });
    },
    check: secret => call('/v1/capabilities', secret),
  };
}
