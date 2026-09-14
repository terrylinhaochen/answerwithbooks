import { resolveResearchOrigin } from './tool-access-client.mjs';

export function buildAgentConnectionPrompt(apiOrigin, websiteOrigin) {
  const origin = resolveResearchOrigin(apiOrigin, websiteOrigin);
  if (!origin) throw new Error('The API address is not configured.');
  const website = new URL(websiteOrigin).origin;
  return `Set up ${website}/tools/awb-tools/SKILL.md\n\nUse ${origin} as CAPABILITY_BASE_URL. Use my AWB API key from your secure connection settings as CAPABILITY_API_KEY; never ask me to paste it into chat or print it. If the key is missing, ask me to configure it securely.\n\nCheck GET /v1/capabilities first and report the available skills and billing mode. Do not run a task during setup. For an authorized task, select the matching capability in my agent, call POST /v1/run with a unique Idempotency-Key, and poll the returned same-origin status URL for the result. Reuse the request key only for identical retries. Follow any quote or price-approval requirements from the skill and live catalog.\n\nShow the result, sources, and limitations. This account's usage and results are at ${website}/billing/. Different personal keys share this account's history; provider credentials stay on AWB's server.`;
}

export function describeAccountBilling(billing) {
  if (!billing || !['metering-only', 'test', 'live'].includes(billing.mode)) throw new Error('Billing status is unavailable.');
  if (billing.paymentReview) return { title: 'Billing under review', detail: 'Contact support before adding funds or running another skill.' };
  if (billing.mode === 'metering-only') return { title: 'Private preview · Usage only', detail: 'Tasks are recorded in your account. Customer payments are not enabled.' };
  if (!Number.isSafeInteger(billing.availableCents)) throw new Error('Billing balance is unavailable.');
  const balance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(billing.availableCents / 100);
  return billing.mode === 'test'
    ? { title: `${balance} test balance`, detail: 'Sandbox credits only; no real customer payment. Provider calls may still have a cost.' }
    : { title: `${balance} available`, detail: 'One account balance for all your managed skill keys. Charges follow the approved task terms.' };
}
