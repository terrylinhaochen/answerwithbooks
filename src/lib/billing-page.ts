import { supabase } from './supabase';
import { createToolAccessClient, resolveResearchOrigin } from './tool-access-client.mjs';
import { availableTools } from './tool-catalog.mjs';
import { copyText } from './copy-text.mjs';
import { formatRunResult } from './run-result.mjs';
const root = document.querySelector<HTMLElement>('[data-billing]')!;
const status = root.querySelector<HTMLElement>('[data-billing-status]')!;
const client = createToolAccessClient(resolveResearchOrigin(import.meta.env.PUBLIC_CAPABILITY_API_URL, location.origin), async () => (await supabase.auth.getSession()).data.session);
let revision = 0; let userId: string | null = null;
let policyVersion = '';
let checkingOut = false;
const consent = root.querySelector<HTMLInputElement>('[data-credit-consent]')!;
const checkoutButton = root.querySelector<HTMLButtonElement>('[data-topup]')!;
const checkoutStorage = 'awb.checkout-attempt.v1';
function forgetCheckout() { try { sessionStorage.removeItem(checkoutStorage); } catch {} }
function checkoutKey(owner: string, cents: number, policy: string) {
  let saved: any = null; try { saved = JSON.parse(sessionStorage.getItem(checkoutStorage) || 'null'); } catch {}
  if (saved?.owner === owner && saved?.cents === cents && saved?.policy === policy && Date.now() - saved.createdAt < 23 * 3600000 && /^[\w-]{8,120}$/.test(saved.key)) return saved.key;
  const attempt = { owner, cents, policy, key: crypto.randomUUID(), createdAt: Date.now() };
  try { sessionStorage.setItem(checkoutStorage, JSON.stringify(attempt)); } catch {}
  return attempt.key;
}
consent.addEventListener('change', () => { checkoutButton.disabled = checkingOut || !consent.checked; });
root.querySelector('[data-refresh-billing]')!.addEventListener('click', () => { void load(); });
root.querySelector<HTMLElement>('[data-payment-return]')!.hidden = new URL(location.href).searchParams.get('payment') !== 'returned';
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const text = (tag: string, content: string) => { const el = document.createElement(tag); el.textContent = content; return el; };
const dialog = root.querySelector<HTMLDialogElement>('[data-run-dialog]')!;
let copyResult = { text: '', json: '' };
const copyResultStatus = root.querySelector<HTMLElement>('[data-run-copy-status]')!;
const copyManual = root.querySelector<HTMLTextAreaElement>('[data-run-copy-manual]')!;
function clearResultCopy() {
  copyResult = { text: '', json: '' }; copyResultStatus.textContent = ''; copyManual.value = ''; copyManual.hidden = true;
  root.querySelectorAll<HTMLButtonElement>('[data-copy-run]').forEach(button => { button.disabled = true; });
}
dialog.addEventListener('close', clearResultCopy);
root.querySelectorAll<HTMLButtonElement>('[data-copy-run]').forEach(button => button.addEventListener('click', async () => {
  const value = copyResult[button.dataset.copyRun as 'text' | 'json']; const current = revision;
  if (!value || !dialog.open) return;
  try { await copyText(value, dialog); if (current === revision && dialog.open && Object.values(copyResult).includes(value)) copyResultStatus.textContent = button.dataset.copyRun === 'json' ? 'Structured result copied.' : 'Result, sources, and limitations copied.'; }
  catch { if (current !== revision || !dialog.open || !Object.values(copyResult).includes(value)) return; copyManual.value = value; copyManual.hidden = false; copyManual.focus(); copyManual.select(); copyResultStatus.textContent = 'Copy was blocked. Select and copy the text below.'; }
}));
root.querySelector('[data-close-run]')!.addEventListener('click', () => dialog.close());
function wipe() { dialog.close(); clearResultCopy(); policyVersion = ''; consent.checked = false; checkoutButton.disabled = true; root.querySelector('[data-run-content]')!.replaceChildren(); root.querySelectorAll('[data-billing-list]').forEach(el => el.replaceChildren()); root.querySelectorAll('[data-billing-empty]').forEach(el => { (el as HTMLElement).hidden = false; el.textContent = 'Connect your account to see your history.'; }); root.querySelectorAll('[data-billing-amount]').forEach(el => { el.textContent = '—'; }); root.querySelector<HTMLElement>('[data-topup-controls]')!.hidden = true; }
async function load() {
  const current = ++revision; wipe(); userId = null;
  root.querySelector<HTMLElement>('[data-billing-signin]')!.hidden = true;
  status.textContent = 'Checking your account…';
  try {
    const { data, error } = await supabase.auth.getUser();
    if (current !== revision) return;
    if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) { forgetCheckout(); status.textContent = 'Sign in to view your balance and task history.'; root.querySelector<HTMLElement>('[data-billing-signin]')!.hidden = false; return; }
    userId = data.user.id;
    const billing = await client.billing(userId);
    if (current !== revision) return;
    if (!['test', 'live', 'metering-only'].includes(billing.mode)) throw new Error('Unknown billing mode. Checkout is unavailable.');
    status.textContent = billing.paymentReview ? 'Payments are under review. Contact support before adding funds or running another skill.' : billing.mode === 'test' ? 'Sandbox billing. These balances and transactions are for testing, not real money.' : billing.mode === 'live' ? 'AWB is a Crowdlisten product. Credits and completed skill charges are tracked here.' : 'Private preview: payments are not enabled. Completed tasks are recorded as usage; no customer payment is taken.';
    root.querySelectorAll<HTMLElement>('[data-billing-amount]').forEach(el => { el.textContent = money(billing[el.dataset.billingAmount!]); });
    if (billing.canTopUp && billing.mode !== 'metering-only') {
      const policy = new URL(billing.policyUrl);
      if (policy.origin !== location.origin || !billing.policyVersion) throw new Error('Credit terms are not configured for this website. Checkout is unavailable.');
      const amounts = root.querySelector<HTMLSelectElement>('[data-topup-amount]')!; amounts.replaceChildren();
      for (const cents of billing.topUps) { if (!Number.isSafeInteger(cents) || cents < 100 || cents > 100000) throw new Error('Invalid credit amount.'); const option = text('option', money(cents)) as HTMLOptionElement; option.value = String(cents); amounts.append(option); }
      if (!amounts.options.length) throw new Error('No credit amounts are available.');
      policyVersion = billing.policyVersion;
      root.querySelector<HTMLAnchorElement>('[data-credit-terms]')!.href = policy.href;
      root.querySelector('[data-topup-label]')!.textContent = billing.mode === 'live' ? 'Add credits' : 'Sandbox top-up';
      checkoutButton.textContent = billing.mode === 'live' ? 'Continue to checkout' : 'Add test funds';
      root.querySelector('[data-topup-help]')!.textContent = billing.mode === 'live' ? 'AWB is a Crowdlisten product. Payments are collected by Crowdlisten.' : 'Test cards only. No real money is collected.';
      root.querySelector<HTMLElement>('[data-topup-controls]')!.hidden = false;
    }
    for (const [name, rows] of Object.entries({ usage: billing.runs, transactions: billing.transactions, receipts: billing.receipts }) as [string, any[]][]) {
      const list = root.querySelector(`[data-billing-list="${name}"]`)!;
      const empty = root.querySelector<HTMLElement>(`[data-billing-empty="${name}"]`)!;
      empty.hidden = rows.length > 0; empty.textContent = `No ${name} yet.`;
      for (const row of rows) {
        const li = document.createElement('li');
        const title = text('div', name === 'usage' ? availableTools.find(skill => skill.id === row.capability)?.name || row.capability : name === 'transactions' ? row.note : billing.mode === 'live' ? 'AWB payment receipt' : 'Test payment receipt');
        title.append(text('small', name === 'usage' ? `${row.status} · ${new Date(row.createdAt).toLocaleDateString()}` : row.createdAt ? new Date(row.createdAt).toLocaleDateString() : row.id));
        li.append(title, text('span', name === 'usage' ? ['test', 'live'].includes(row.billing.mode) ? money(row.billing.chargedCents || 0) : 'Not charged' : money(row.amountCents)));
        if (name === 'usage') {
          const button = text('button', 'View result') as HTMLButtonElement; button.type = 'button';
          button.addEventListener('click', async () => {
            if (!userId) return;
            const requestRevision = revision; button.disabled = true;
            try {
              const run = await client.run(userId, row.id); if (requestRevision !== revision) return;
              const content = root.querySelector('[data-run-content]')!; content.replaceChildren(); clearResultCopy();
              content.append(text('p', `Task ${run.id} · ${run.status}`));
              if (run.result) {
                content.append(text('h3', run.result.answer.title), text('p', run.result.answer.summary));
                for (const finding of run.result.answer.findings) content.append(text('h3', finding.title), text('p', finding.detail));
                for (const limitation of run.result.answer.limitations) content.append(text('p', limitation));
                content.append(text('h3', 'Sources and structured result'), text('pre', JSON.stringify(run.result, null, 2)));
              } else content.append(text('p', run.error?.message || 'This task is still in progress. Reopen its result to check again.'));
              copyResult = { text: formatRunResult(run), json: JSON.stringify(run, null, 2) };
              root.querySelectorAll<HTMLButtonElement>('[data-copy-run]').forEach(button => { button.disabled = !copyResult[button.dataset.copyRun as 'text' | 'json']; });
              dialog.showModal();
            } catch (error) { if (requestRevision === revision) status.textContent = (error as Error).message; }
            finally { button.disabled = false; }
          }); li.append(button);
        }
        if (name === 'receipts' && typeof row.url === 'string') { try { const url = new URL(row.url); if (url.protocol === 'https:' && ['invoice.stripe.com', 'pay.stripe.com'].includes(url.hostname)) { const a = text('a', 'Open receipt') as HTMLAnchorElement; a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); } } catch {} }
        list.append(li);
      }
    }
  } catch (error) { if (current === revision) status.textContent = (error as Error).message; }
}
root.querySelector('[data-topup]')!.addEventListener('click', async event => {
  if (!userId || !policyVersion || !consent.checked || checkingOut) return;
  const button = event.currentTarget as HTMLButtonElement; const current = revision; button.disabled = true;
  checkingOut = true;
  try { const cents = Number(root.querySelector<HTMLSelectElement>('[data-topup-amount]')!.value); const result = await client.checkout(userId, cents, checkoutKey(userId, cents, policyVersion), policyVersion); if (current !== revision) return; const url = new URL(result.url); if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com') throw new Error('Unexpected payment destination.'); location.assign(url.href); }
  catch (error) { if ((error as any).code === 'CHECKOUT_EXPIRED') forgetCheckout(); if (current === revision) status.textContent = (error as Error).message; }
  finally { checkingOut = false; button.disabled = !consent.checked; }
});
const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-billing-tab]')];
function select(tab: HTMLButtonElement) { tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; }); root.querySelectorAll<HTMLElement>('[data-billing-panel]').forEach(panel => { panel.hidden = panel.dataset.billingPanel !== tab.dataset.billingTab; }); }
tabs.forEach((tab, i) => { tab.addEventListener('click', () => select(tab)); tab.addEventListener('keydown', event => { const next = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1; if (next >= 0) { event.preventDefault(); select(tabs[next]); tabs[next].focus(); } }); });
supabase.auth.onAuthStateChange(() => window.setTimeout(() => { void load(); }, 0));
window.addEventListener('pagehide', () => { revision++; userId = null; wipe(); });
void load();
