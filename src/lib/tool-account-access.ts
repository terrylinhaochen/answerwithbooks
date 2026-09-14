import { createToolAccessClient, resolveResearchOrigin } from './tool-access-client.mjs';
import { supabase } from './supabase';
import { buildAgentConnectionPrompt, describeAccountBilling } from './account-connection.mjs';
import { copyText } from './copy-text.mjs';

type Key = { id: string; label: string; prefix: string; createdAt?: string; revokedAt: string | null };
export function setupToolAccountAccess(root: HTMLElement) {
  const origin = resolveResearchOrigin(import.meta.env.PUBLIC_CAPABILITY_API_URL, location.origin);
  const client = createToolAccessClient(origin, async () => (await supabase.auth.getSession()).data.session);
  const find = <T extends HTMLElement>(selector: string) => root.querySelector<T>(selector)!;
  const status = find('[data-access-status]');
  const form = find<HTMLFormElement>('[data-access-create]');
  const list = find<HTMLTableSectionElement>('[data-access-keys]');
  const createButton = find<HTMLButtonElement>('[data-key-open]');
  const dialog = find<HTMLDialogElement>('[data-key-dialog]');
  const revokeDialog = find<HTMLDialogElement>('[data-key-revoke-dialog]');
  const createError = find('[data-key-create-error]');
  const secretPanel = find('[data-access-secret]');
  const secretInput = find<HTMLInputElement>('[data-key-secret]');
  const keyStatus = find('[data-key-status]');
  const apiAddress = find<HTMLInputElement>('[data-api-address]');
  const copyStatus = find('[data-connection-copy-status]');
  const manualCopy = find<HTMLTextAreaElement>('[data-connection-manual]');
  if (apiAddress) apiAddress.value = origin || '';
  const connectionPanel = find('[data-api-connection]');
  if (connectionPanel) connectionPanel.hidden = !origin;
  let userId: string | null = null;
  let revision = 0;
  let secret = '';
  let secretId = '';
  let busy = false;
  let approved = false;
  let keys: Key[] = [];
  let pendingRevoke: Key | null = null;
  let opener: HTMLElement | null = null;
  const message = (error: unknown) => error instanceof Error ? error.message : 'The request did not finish. Try again.';
  const activeCount = () => keys.filter(key => !key.revokedAt).length;
  const wipeSecret = () => {
    secret = ''; secretId = ''; secretInput.value = ''; secretInput.type = 'password'; secretPanel.hidden = true; keyStatus.textContent = '';
    find('[data-key-reveal]').textContent = 'Show'; find('[data-key-copy]').textContent = 'Copy API key';
    find<HTMLDetailsElement>('.key-options').open = false;
  };
  const renderBusy = () => {
    root.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = busy; });
    createButton.disabled = busy || !approved;
    for (const selector of ['[data-copy-api-address]', '[data-copy-agent-connection]']) {
      const button = find<HTMLButtonElement>(selector);
      if (button) button.disabled = !origin;
    }
    form.querySelector<HTMLButtonElement>('[type=submit]')!.textContent = busy ? 'Creating…' : 'Create key';
  };
  const renderKeys = () => {
    list.replaceChildren();
    const visibleKeys = keys.filter(key => !key.revokedAt);
    find('[data-access-table]').hidden = !visibleKeys.length;
    find('[data-access-empty]').hidden = !approved || visibleKeys.length > 0;
    find('[data-access-count]').textContent = approved ? `${activeCount()} active ${activeCount() === 1 ? 'key' : 'keys'}` : 'Personal connections to AWB skills.';
    for (const key of visibleKeys) {
      const item = document.createElement('tr');
      const cell = (text: string) => { const td = document.createElement('td'); td.textContent = text; item.append(td); return td; };
      cell(key.label);
      const masked = document.createElement('code'); masked.textContent = `${key.prefix}…`; cell('').append(masked);
      const date = key.createdAt ? new Date(key.createdAt) : null;
      cell(date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
      const state = document.createElement('span'); state.className = 'key-state'; state.textContent = 'Active'; cell('').append(state);
      const actions = cell('');
      if (!key.revokedAt) {
        const revoke = document.createElement('button'); revoke.type = 'button'; revoke.className = 'key-revoke'; revoke.textContent = 'Revoke key'; revoke.setAttribute('aria-label', `Revoke ${key.label}`); revoke.setAttribute('aria-haspopup', 'dialog');
        revoke.addEventListener('click', () => {
          if (busy || !userId) return;
          pendingRevoke = key; opener = revoke; find('[data-revoke-name]').textContent = key.label; find('[data-revoke-error]').textContent = ''; revokeDialog.showModal();
        }); actions.append(revoke);
      }
      list.append(item);
    }
  };
  async function refresh() {
    const id = userId;
    if (!id || busy) return;
    const current = ++revision;
    approved = false; renderBusy();
    status.textContent = origin ? 'Loading your keys…' : 'Research API access is not enabled on this deployment yet.';
    if (!origin) return;
    busy = true; renderBusy();
    void refreshBilling(id, current);
    try {
      const data = await client.list(id);
      if (current !== revision || userId !== id) return;
      approved = data.access === 'approved';
      if (!approved) wipeSecret();
      keys = data.keys; renderKeys();
      status.textContent = !approved ? 'Your account is ready. Research API access requires approval during the private preview.' : '';
    } catch (error) { if (current === revision) { keys = []; renderKeys(); status.textContent = message(error); } }
    finally { if (current === revision) { busy = false; renderBusy(); } }
  }
  async function refreshBilling(id: string, current: number) {
    find('[data-key-billing-title]').textContent = 'Checking billing…';
    find('[data-key-billing-description]').textContent = 'All personal keys use this account’s balance and history.';
    try {
      const billing = await client.billing(id);
      if (current !== revision || id !== userId) return;
      const summary = describeAccountBilling(billing);
      find('[data-key-billing-title]').textContent = summary.title;
      find('[data-key-billing-description]').textContent = summary.detail;
    } catch {
      if (current !== revision || id !== userId) return;
      find('[data-key-billing-title]').textContent = 'Billing status unavailable';
      find('[data-key-billing-description]').textContent = 'Open billing to retry. A connection error does not mean your balance is zero.';
    }
  }
  for (const [selector, value] of [
    ['[data-copy-api-address]', () => origin || ''],
    ['[data-copy-agent-connection]', () => buildAgentConnectionPrompt(origin, location.origin)],
  ] as const) {
    find<HTMLButtonElement>(selector)?.addEventListener('click', async () => {
      if (!origin) return;
      const current = revision; const content = value();
      manualCopy.hidden = true; manualCopy.value = '';
      try {
        await copyText(content, root);
        if (current === revision) copyStatus.textContent = selector === '[data-copy-api-address]' ? 'API address copied.' : 'Agent setup copied. Paste it into your agent; configure the key separately.';
      } catch {
        if (current !== revision) return;
        manualCopy.value = content; manualCopy.hidden = false; manualCopy.focus(); manualCopy.select(); copyStatus.textContent = 'Copy was blocked. Select and copy the text below.';
      }
    });
  }
  createButton.addEventListener('click', () => {
    if (busy || !approved) return;
    wipeSecret(); form.reset(); form.hidden = false; createError.textContent = '';
    find('[data-key-dialog-title]').textContent = 'Create API key';
    find('[data-key-dialog-description]').textContent = 'Give this key a name so you can recognize the agent using it.';
    opener = createButton; dialog.showModal(); find<HTMLInputElement>('#api-key-label').focus();
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const id = userId;
    if (!id || busy || !approved || !form.reportValidity()) return;
    const current = revision;
    busy = true; renderBusy(); wipeSecret(); createError.textContent = '';
    try {
      const data = await client.create(id, String(new FormData(form).get('label') || '').trim());
      if (current !== revision || userId !== id) return;
      if (!/^awb_live_[\w-]{43}$/.test(data.secret)) throw new Error('Unexpected key response. Refresh your keys before trying again.');
      secret = data.secret; secretId = data.key.id; secretInput.value = secret; form.hidden = true; secretPanel.hidden = false;
      find('[data-key-dialog-title]').textContent = 'Copy your API key';
      find('[data-key-dialog-description]').textContent = `“${data.key.label}” is ready to connect your agent.`;
      keys.unshift(data.key); renderKeys(); status.textContent = '';
    } catch (error) { if (current === revision) createError.textContent = `${message(error)} If the connection was interrupted, close this window and refresh your keys before creating another.`; }
    finally { if (current === revision) { busy = false; renderBusy(); if (secret) find<HTMLButtonElement>('[data-key-copy]').focus(); } }
    // Never retry creation automatically: a lost response may have created a key.
  });
  find('[data-revoke-confirm]').addEventListener('click', async () => {
    const id = userId; const key = pendingRevoke; const current = revision;
    if (!id || !key || busy) return;
    busy = true; renderBusy(); find('[data-revoke-error]').textContent = '';
    try {
      await client.revoke(id, key.id);
      if (current !== revision || userId !== id) return;
      if (secretId === key.id) wipeSecret();
      keys = keys.filter(entry => entry.id !== key.id);
      renderKeys(); status.textContent = 'Key revoked and removed. Future requests with it will be rejected.'; revokeDialog.close();
    } catch (error) { if (current === revision) find('[data-revoke-error]').textContent = message(error); }
    finally { if (current === revision) { busy = false; renderBusy(); } }
  });
  for (const [modal, selector] of [[dialog, '[data-key-close]'], [revokeDialog, '[data-revoke-close]']] as const) {
    root.querySelectorAll(selector).forEach(button => button.addEventListener('click', () => { if (!busy) modal.close(); }));
    modal.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
    modal.addEventListener('close', () => {
      if (modal === dialog) { wipeSecret(); form.reset(); createError.textContent = ''; }
      else pendingRevoke = null;
      if (opener?.isConnected) opener.focus();
      else createButton.focus();
    });
  }
  find('[data-access-refresh]').addEventListener('click', () => { void refresh(); });
  find('[data-key-reveal]').addEventListener('click', event => { secretInput.type = secretInput.type === 'password' ? 'text' : 'password'; (event.currentTarget as HTMLButtonElement).textContent = secretInput.type === 'password' ? 'Show' : 'Hide'; });
  find('[data-key-copy]').addEventListener('click', async () => {
    if (!secret) return;
    const value = secret; const current = revision;
    try {
      await copyText(value, dialog);
      secretInput.type = 'password'; find('[data-key-reveal]').textContent = 'Show';
      if (current === revision && secret === value) { keyStatus.textContent = 'Copied. Store the key securely before closing this window.'; find('[data-key-copy]').textContent = 'Copied'; }
    } catch { if (current === revision && secret === value) { secretInput.type = 'text'; secretInput.select(); find('[data-key-reveal]').textContent = 'Hide'; keyStatus.textContent = 'Select and copy the key manually.'; } }
  });
  find('[data-key-download]').addEventListener('click', () => {
    if (!secret || !origin) return;
    const url = URL.createObjectURL(new Blob([`# Keep private. Do not commit or paste into chat.\nCAPABILITY_BASE_URL=${origin}\nCAPABILITY_API_KEY=${secret}\n`], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'awb-tools.env'; root.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    keyStatus.textContent = 'Connection file downloaded. Keep it private and load it into your agent’s secure environment.';
  });
  find('[data-key-check]').addEventListener('click', async () => {
    if (!secret || busy) return;
    const value = secret; const current = revision;
    busy = true; renderBusy(); keyStatus.textContent = 'Checking connection…';
    try {
      const data = await client.check(value);
      if (current !== revision || value !== secret) return;
      const ready = data.capabilities.filter(capability => capability.configured).length;
      keyStatus.textContent = `Key verified. ${ready} of ${data.capabilities.length} research capabilities configured. No research was run.`;
    } catch (error) { if (current === revision) keyStatus.textContent = message(error); }
    finally { if (current === revision) { busy = false; renderBusy(); } }
  });
  const clearSecret = () => { revision++; busy = false; wipeSecret(); if (dialog.open) dialog.close(); if (revokeDialog.open) revokeDialog.close(); renderBusy(); };
  window.addEventListener('pagehide', clearSecret);
  return {
    clearSecret,
    setIdentity(id: string | null) {
      if (id !== userId) { clearSecret(); userId = id; approved = false; keys = []; renderKeys(); renderBusy(); if (copyStatus) copyStatus.textContent = ''; if (manualCopy) { manualCopy.value = ''; manualCopy.hidden = true; } find('[data-key-billing-title]').textContent = 'Billing & task history'; find('[data-key-billing-description]').textContent = 'All personal keys use this account’s balance and history.'; }
      if (id && !busy) void refresh();
    },
  };
}
