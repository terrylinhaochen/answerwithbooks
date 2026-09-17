// Pure view rules: presentation must never turn unavailable billing into a payment.
export function topUpState(billing, pageOrigin, apiOrigin) {
  if (billing?.paymentReview) return { ready: false, message: 'Payments are under review. Contact billing before adding credits.' };
  if (billing?.mode === 'metering-only') return { ready: false, message: 'Credit purchases are not available during the private preview. Your tasks are recorded as usage, and no payment is taken.' };
  if (!['live', 'test'].includes(billing?.mode)) return { ready: false, message: 'Payment availability could not be verified. Refresh your account before trying again.' };
  if (billing.canTopUp !== true) return { ready: false, message: 'Credit purchases are not enabled for your account yet. Contact billing for access.' };
  try {
    const policy = new URL(billing.policyUrl);
    const trusted = new Set([pageOrigin, apiOrigin, 'https://answerwithbooks.com']);
    const local = policy.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(policy.hostname) && policy.origin === pageOrigin;
    if (!trusted.has(policy.origin) || policy.username || policy.password || !(policy.protocol === 'https:' || local) || !billing.policyVersion?.trim()) throw new Error();
    if (!Array.isArray(billing.topUps) || !billing.topUps.length || billing.topUps.length > 8 || billing.topUps.some(n => !Number.isSafeInteger(n) || n < 100 || n > 100000)) throw new Error();
    return { ready: true, test: billing.mode === 'test', policyUrl: policy.href, policyVersion: billing.policyVersion, amounts: [...new Set(billing.topUps)] };
  } catch { return { ready: false, message: 'Credit amounts or terms are not configured. Contact billing; no payment can be taken here yet.' }; }
}

export function filterUsage(runs, { status = 'all', skill = 'all', days = 'all' }, now = Date.now()) {
  const cutoff = days === 'all' ? -Infinity : now - Number(days) * 86400000;
  return runs.filter(run => (status === 'all' || run.status === status) && (skill === 'all' || run.capability === skill) && (days === 'all' || Date.parse(run.createdAt) >= cutoff));
}

export function usageCharge(run) {
  if (run.billing?.mode === 'metering-only') return 'Not charged';
  if (!['live', 'test'].includes(run.billing?.mode)) return '—';
  if (Number.isSafeInteger(run.billing.chargedCents) && run.billing.chargedCents !== 0) return run.billing.chargedCents;
  if (run.billing.state === 'delegated') return 'See CrowdListen usage';
  return ['queued', 'running'].includes(run.status) ? 'Pending' : ['pending', 'reconciliation'].includes(run.billing.state) ? 'Awaiting review' : Number.isSafeInteger(run.billing.chargedCents) ? 0 : '—';
}

export function sharedUsageRows(billing) {
  const paid = ['test', 'live'].includes(billing.mode);
  const runs = (billing.runs || []).map(run => paid && run.capability === 'product-feedback-analysis'
    ? { ...run, billing: { ...run.billing, mode: billing.mode, state: 'delegated' } } : run);
  const usage = (billing.sharedUsage || []).map(row => ({
    id: row.operation_id, capability: 'product-feedback-analysis', createdAt: row.created_at,
    status: row.state === 'held' ? 'running' : row.state === 'reconciliation' ? 'review' : 'completed',
    origin: row.origin, external: true,
    billing: { mode: billing.mode, state: row.state, chargedCents: row.charged_cents },
  }));
  return [...runs, ...usage].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
