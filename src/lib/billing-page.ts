import { supabase } from './supabase';
import { createToolAccessClient, resolveResearchOrigin } from './tool-access-client.mjs';
import { availableTools } from './tool-catalog.mjs';
import { copyText } from './copy-text.mjs';
import { formatRunResult } from './run-result.mjs';
import { topUpState, filterUsage, usageCharge, sharedUsageRows } from './billing-view.mjs';
const root = document.querySelector<HTMLElement>('[data-billing]')!;
const status = root.querySelector<HTMLElement>('[data-billing-status]')!;
const apiOrigin = resolveResearchOrigin(import.meta.env.PUBLIC_CAPABILITY_API_URL, location.origin);
const client = createToolAccessClient(apiOrigin, async () => (await supabase.auth.getSession()).data.session);
let revision = 0; let userId: string | null = null;
let policyVersion = '';
let checkingOut = false;
const consent = root.querySelector<HTMLInputElement>('[data-credit-consent]')!;
const checkoutButton = root.querySelector<HTMLButtonElement>('[data-topup]')!;
const topupDialog = root.querySelector<HTMLDialogElement>('[data-topup-dialog]')!;
const openTopup = root.querySelector<HTMLButtonElement>('[data-open-topup]')!;
const checkoutStatus = root.querySelector<HTMLElement>('[data-checkout-status]')!;
let canCheckout = false;
let recentRuns: any[] = [];
let currentBillingMode = '';
const filterDays = root.querySelector<HTMLSelectElement>('[data-usage-days]')!;
const filterSkill = root.querySelector<HTMLSelectElement>('[data-usage-skill]')!;
const filterStatus = root.querySelector<HTMLSelectElement>('[data-usage-status]')!;
const checkoutStorage = 'awb.checkout-attempt.v1';
function forgetCheckout() { try { sessionStorage.removeItem(checkoutStorage); } catch {} }
function checkoutKey(owner: string, cents: number, policy: string) {
  let saved: any = null; try { saved = JSON.parse(sessionStorage.getItem(checkoutStorage) || 'null'); } catch {}
  if (saved?.owner === owner && saved?.cents === cents && saved?.policy === policy && Date.now() - saved.createdAt < 23 * 3600000 && /^[\w-]{8,120}$/.test(saved.key)) return saved.key;
  const attempt = { owner, cents, policy, key: crypto.randomUUID(), createdAt: Date.now() };
  try { sessionStorage.setItem(checkoutStorage, JSON.stringify(attempt)); } catch {}
  return attempt.key;
}
consent.addEventListener('change', () => { checkoutButton.disabled = !canCheckout || checkingOut || !consent.checked; });
openTopup.addEventListener('click', () => { if (userId) { checkoutStatus.textContent = ''; consent.checked = false; checkoutButton.disabled = true; topupDialog.showModal(); } });
root.querySelector('[data-close-topup]')!.addEventListener('click', () => topupDialog.close());
topupDialog.addEventListener('close', () => { consent.checked = false; checkoutButton.disabled = true; openTopup.focus(); });
root.querySelector('[data-refresh-billing]')!.addEventListener('click', () => { void load(); });
root.querySelector<HTMLElement>('[data-payment-return]')!.hidden = new URL(location.href).searchParams.get('payment') !== 'returned';
const money = (cents: number) => Number.isSafeInteger(cents) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100) : '—';
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
function wipe() { dialog.close(); topupDialog.close(); clearResultCopy(); policyVersion = ''; canCheckout = false; openTopup.disabled = true; consent.checked = false; checkoutButton.disabled = true; recentRuns = []; currentBillingMode = ''; checkoutStatus.textContent = ''; root.querySelector('[data-run-content]')!.replaceChildren(); root.querySelectorAll('[data-billing-list]').forEach(el => el.replaceChildren()); root.querySelectorAll('[data-billing-empty]').forEach(el => { (el as HTMLElement).hidden = false; el.textContent = 'Sign in to see your history.'; }); root.querySelectorAll('[data-billing-amount]').forEach(el => { el.textContent = '—'; }); root.querySelector<HTMLElement>('[data-topup-controls]')!.hidden = true; root.querySelector<HTMLElement>('[data-topup-unavailable]')!.hidden = false; root.querySelector('[data-credit-availability]')!.textContent = 'Checking payment availability…'; root.querySelector('[data-usage-count]')!.textContent = 'Showing your most recent tasks.'; filterSkill.replaceChildren(new Option('All skills', 'all')); }
async function load() {
  const current = ++revision; wipe(); userId = null;
  root.querySelector<HTMLElement>('[data-call-rates]')!.hidden = true;
  root.querySelector('[data-call-rate-list]')!.replaceChildren();
  root.querySelector<HTMLElement>('[data-billing-signin]')!.hidden = true;
  status.textContent = 'Checking your account…';
  try {
    const { data, error } = await supabase.auth.getUser();
    if (current !== revision) return;
    if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) { forgetCheckout(); status.textContent = 'Sign in to view your balance and task history.'; root.querySelector('[data-credit-availability]')!.textContent = 'Sign in to manage credits.'; root.querySelector<HTMLElement>('[data-billing-signin]')!.hidden = false; return; }
    userId = data.user.id;
    const billing = await client.billing(userId);
    if (current !== revision) return;
    if (!['test', 'live', 'metering-only'].includes(billing.mode)) throw new Error('Unknown billing mode. Checkout is unavailable.');
    status.textContent = billing.paymentReview ? 'Payments are under review. Contact billing before adding funds or running another skill.' : billing.mode === 'test' ? 'Test mode · These credits have no cash value. No real payment is taken.' : billing.mode === 'live' ? 'Payments are securely processed by Stripe for Crowdlisten.' : 'Private preview · Tasks are tracked, but payments are not enabled yet.';
    currentBillingMode = billing.mode;
    if (billing.pricingModel === 'per-call' && Array.isArray(billing.rateCard?.rates)) {
      const list = root.querySelector('[data-call-rate-list]')!;
      for (const rate of billing.rateCard.rates) {
        if (!Number.isSafeInteger(rate.cents) || rate.cents <= 0) continue;
        const li = document.createElement('li');
        li.append(text('span', availableTools.find(tool => tool.id === rate.capability)?.name || rate.capability), text('strong', money(rate.cents) + ' / call'));
        list.append(li);
      }
      root.querySelector<HTMLElement>('[data-call-rates]')!.hidden = !list.childElementCount;
    }
    root.querySelectorAll<HTMLElement>('[data-billing-amount]').forEach(el => { el.textContent = money(billing[el.dataset.billingAmount!]); });
    const topup = topUpState(billing, location.origin, apiOrigin);
    canCheckout = topup.ready;
    openTopup.disabled = false;
    openTopup.textContent = billing.mode === 'test' ? 'Add test credits' : 'Add credits';
    root.querySelector('[data-credit-availability]')!.textContent = topup.ready ? (topup.test ? 'Test credits only · No real money.' : 'One-time top-up. No automatic charges.') : billing.mode === 'metering-only' ? 'Credit purchases are not available yet.' : 'Top-ups are currently unavailable.';
    root.querySelector('[data-topup-unavailable-message]')!.textContent = topup.message || '';
    root.querySelector<HTMLElement>('[data-topup-unavailable]')!.hidden = topup.ready;
    if (topup.ready) {
      const amounts = root.querySelector<HTMLSelectElement>('[data-topup-amount]')!; amounts.replaceChildren();
      for (const cents of topup.amounts!) amounts.append(new Option(money(cents), String(cents)));
      policyVersion = topup.policyVersion!;
      root.querySelector<HTMLAnchorElement>('[data-credit-terms]')!.href = topup.policyUrl!;
      root.querySelector('[data-topup-label]')!.textContent = topup.test ? 'Test credit amount' : 'Credit amount';
      checkoutButton.textContent = topup.test ? 'Continue to test checkout' : 'Continue to checkout';
      root.querySelector('[data-topup-help]')!.textContent = topup.test ? 'Stripe test checkout. Use test cards only; no real money is collected.' : 'Secure checkout with Stripe. Payments are collected by Crowdlisten.';
      root.querySelector<HTMLElement>('[data-topup-controls]')!.hidden = false;
    }
    recentRuns = sharedUsageRows(billing);
    for (const skill of [...new Set(recentRuns.map(run => run.capability))]) filterSkill.append(new Option(availableTools.find(tool => tool.id === skill)?.name || skill, skill));
    renderUsage();
    renderHistory('transactions', billing.transactions || []);
    renderHistory('receipts', billing.receipts || []);
  } catch (error) { if (current === revision) { status.textContent = (error as Error).message; canCheckout = false; openTopup.disabled = true; checkoutButton.disabled = true; root.querySelector('[data-credit-availability]')!.textContent = 'Payment availability could not be verified.'; } }
}
function renderUsage() {
  const rows = filterUsage(recentRuns, { days: filterDays.value, status: filterStatus.value, skill: filterSkill.value });
  renderHistory('usage', rows);
  root.querySelector('[data-usage-count]')!.textContent = `${rows.length} of ${recentRuns.length} recent tasks and usage records${currentBillingMode === 'test' ? ' · Test usage' : ''}`;
}
for (const filter of [filterDays, filterSkill, filterStatus]) filter.addEventListener('change', renderUsage);
function renderHistory(name: string, rows: any[]) {
      const list = root.querySelector(`[data-billing-list="${name}"]`)!;
      list.replaceChildren();
      const empty = root.querySelector<HTMLElement>(`[data-billing-empty="${name}"]`)!;
      empty.hidden = rows.length > 0; empty.textContent = name === 'usage' ? (recentRuns.length ? 'No tasks match these filters.' : 'No tasks yet. Run a skill from your connected agent to see its status, cost, and result here.') : name === 'receipts' ? 'No receipts yet. Completed credit purchases will appear here.' : 'No transactions yet. Top-ups and skill charges will appear here.';
      for (const row of rows) {
        const li = document.createElement('li');
        const title = text('div', ''); title.className = 'row-details';
        title.append(text('p', name === 'usage' ? availableTools.find(skill => skill.id === row.capability)?.name || row.capability : name === 'transactions' ? row.note || row.kind || 'Balance adjustment' : currentBillingMode === 'live' ? 'AWB payment receipt' : 'Test payment receipt'));
        title.firstElementChild!.className = 'row-title';
        title.append(text('small', name === 'usage' ? `${row.status}${row.origin ? ' · ' + row.origin : ''} · ${new Date(row.createdAt).toLocaleString()} · Task ${row.id}` : row.createdAt ? new Date(row.createdAt).toLocaleString() : row.id));
        const charge = name === 'usage' ? usageCharge(row) : row.amountCents;
        const price = text('span', typeof charge === 'number' ? money(charge) : charge); price.className = 'row-price';
        li.append(title, price);
        if (name === 'usage' && row.external) {
          const link = text('a', 'Open CrowdListen') as HTMLAnchorElement;
          link.href = 'https://crowdlisten.com/'; link.target = '_blank'; link.rel = 'noopener noreferrer'; li.append(link);
        } else if (name === 'usage') {
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
root.querySelector('[data-topup-controls]')!.addEventListener('submit', async event => {
  event.preventDefault();
  if (!userId || !policyVersion || !consent.checked || checkingOut || !canCheckout || !topupDialog.open) return;
  const button = checkoutButton; const current = revision; button.disabled = true;
  checkingOut = true;
  checkoutStatus.textContent = 'Opening secure checkout…';
  try { const cents = Number(root.querySelector<HTMLSelectElement>('[data-topup-amount]')!.value); const result = await client.checkout(userId, cents, checkoutKey(userId, cents, policyVersion), policyVersion); if (current !== revision || !topupDialog.open) return; const url = new URL(result.url); if (url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password) throw new Error('Unexpected payment destination.'); location.assign(url.href); }
  catch (error) { if ((error as any).code === 'CHECKOUT_EXPIRED') forgetCheckout(); if (current === revision) checkoutStatus.textContent = (error as Error).message; }
  finally { checkingOut = false; button.disabled = !canCheckout || !consent.checked; }
});
const tabs = [...root.querySelectorAll<HTMLButtonElement>('[data-billing-tab]')];
function select(tab: HTMLButtonElement) { tabs.forEach(item => { item.setAttribute('aria-selected', String(item === tab)); item.tabIndex = item === tab ? 0 : -1; }); root.querySelectorAll<HTMLElement>('[data-billing-panel]').forEach(panel => { panel.hidden = panel.dataset.billingPanel !== tab.dataset.billingTab; }); history.replaceState(null, '', '#' + tab.dataset.billingTab); }
tabs.forEach((tab, i) => { tab.addEventListener('click', () => select(tab)); tab.addEventListener('keydown', event => { const next = event.key === 'ArrowRight' ? (i + 1) % tabs.length : event.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1; if (next >= 0) { event.preventDefault(); select(tabs[next]); tabs[next].focus(); } }); });
function syncTab() { select(tabs.find(tab => tab.dataset.billingTab === location.hash.slice(1)) || tabs[0]); }
window.addEventListener('hashchange', syncTab);
syncTab();
supabase.auth.onAuthStateChange(() => window.setTimeout(() => { void load(); }, 0));
window.addEventListener('pagehide', () => { revision++; userId = null; wipe(); });
void load();
