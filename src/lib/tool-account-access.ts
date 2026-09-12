import { createToolAccessClient, resolveResearchOrigin } from './tool-access-client.mjs';
import { supabase } from './supabase';

type Key = { id: string; label: string; prefix: string; revokedAt: string | null };
export function setupToolAccountAccess(root: HTMLElement) {
  const origin = resolveResearchOrigin(import.meta.env.PUBLIC_CAPABILITY_API_URL, location.origin);
  const client = createToolAccessClient(origin, async () => (await supabase.auth.getSession()).data.session);
  const status = root.querySelector<HTMLElement>('[data-access-status]')!;
  const form = root.querySelector<HTMLFormElement>('[data-access-create]')!;
  const list = root.querySelector<HTMLUListElement>('[data-access-keys]')!;
  const secretPanel = root.querySelector<HTMLElement>('[data-access-secret]')!;
  const secretInput = root.querySelector<HTMLInputElement>('[data-key-secret]')!;
  const keyStatus = root.querySelector<HTMLElement>('[data-key-status]')!;
  let userId: string | null = null;
  let revision = 0;
  let secret = '';
  let secretId = '';
  let busy = false;
  let keys: Key[] = [];
  const message = (error: unknown) => error instanceof Error ? error.message : 'The request did not finish. Try again.';
  const wipeSecret = () => { secret = ''; secretId = ''; secretInput.value = ''; secretInput.type = 'password'; secretPanel.hidden = true; keyStatus.textContent = ''; root.querySelector('[data-key-reveal]')!.textContent = 'Show'; };
  const renderBusy = () => {
    root.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = busy; });
    form.querySelector<HTMLButtonElement>('button')!.disabled = busy || keys.filter(key => !key.revokedAt).length >= 3;
  };
  const renderKeys = () => {
    list.replaceChildren();
    for (const key of keys) {
      const item = document.createElement('li');
      const label = document.createElement('span'); label.textContent = key.label;
      const prefix = document.createElement('small'); prefix.textContent = `${key.prefix}… · ${key.revokedAt ? 'Revoked' : 'Active'}`; label.append(prefix); item.append(label);
      if (!key.revokedAt) {
        const revoke = document.createElement('button'); revoke.type = 'button'; revoke.textContent = 'Revoke'; revoke.setAttribute('aria-label', `Revoke ${key.label}`);
        let confirming = false;
        revoke.addEventListener('click', async () => {
          if (!confirming) { confirming = true; revoke.textContent = 'Confirm revoke'; return; }
          const id = userId; const current = revision;
          if (busy || !id) return;
          busy = true; renderBusy();
          try {
            await client.revoke(id, key.id);
            if (current !== revision || userId !== id) return;
            if (secretId === key.id) wipeSecret();
            keys = keys.map(entry => entry.id === key.id ? { ...entry, revokedAt: new Date().toISOString() } : entry);
            renderKeys(); status.textContent = 'Key revoked. Future calls using it will be rejected.';
          } catch (error) { if (current === revision) status.textContent = message(error); }
          finally { if (current === revision) { busy = false; renderBusy(); } }
        }); item.append(revoke);
      }
      list.append(item);
    }
  };
  async function refresh() {
    const id = userId;
    if (!id || busy) return;
    const current = ++revision;
    form.hidden = true;
    status.textContent = origin ? 'Checking research access…' : 'Research API access is not enabled on this deployment yet.';
    if (!origin) return;
    busy = true; renderBusy();
    try {
      const data = await client.list(id);
      if (current !== revision || userId !== id) return;
      const approved = data.access === 'approved';
      form.hidden = !approved;
      if (!approved) wipeSecret();
      status.textContent = approved ? 'Create a personal key to connect your agent.' : 'Your account is ready. Research API access requires approval during the private preview.';
      keys = data.keys; renderKeys();
    } catch (error) { if (current === revision) { keys = []; renderKeys(); status.textContent = message(error); } }
    finally { if (current === revision) { busy = false; renderBusy(); } }
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const id = userId;
    if (!id || busy || !form.reportValidity()) return;
    const current = revision;
    busy = true; renderBusy(); wipeSecret();
    try {
      const data = await client.create(id, String(new FormData(form).get('label') || '').trim());
      if (current !== revision || userId !== id) return;
      if (!/^awb_live_[\w-]{43}$/.test(data.secret)) throw new Error('Unexpected key response. Refresh your keys before trying again.');
      secret = data.secret; secretId = data.key.id; secretInput.value = secret; secretPanel.hidden = false;
      keys.unshift(data.key); renderKeys(); status.textContent = 'Your personal API key is ready. Save it before closing setup.';
    } catch (error) { if (current === revision) status.textContent = `${message(error)} If the connection was interrupted, refresh your keys before creating another.`; }
    finally { if (current === revision) { busy = false; renderBusy(); } }
    // Never retry creation automatically: a lost response may have created a key.
  });
  root.querySelector('[data-access-refresh]')!.addEventListener('click', () => { void refresh(); });
  root.querySelector('[data-key-reveal]')!.addEventListener('click', event => { secretInput.type = secretInput.type === 'password' ? 'text' : 'password'; (event.currentTarget as HTMLButtonElement).textContent = secretInput.type === 'password' ? 'Show' : 'Hide'; });
  root.querySelector('[data-key-copy]')!.addEventListener('click', async () => {
    if (!secret) return;
    const value = secret; const current = revision;
    try {
      secretInput.type = 'text'; secretInput.focus(); secretInput.select();
      let copied = false;
      try { copied = document.execCommand('copy'); } finally { secretInput.type = 'password'; root.querySelector('[data-key-reveal]')!.textContent = 'Show'; }
      if (!copied) await navigator.clipboard.writeText(value);
      if (current === revision && secret === value) keyStatus.textContent = 'Key copied. Store it securely in your agent’s environment.';
    } catch { if (current === revision && secret === value) { secretInput.type = 'text'; secretInput.select(); root.querySelector('[data-key-reveal]')!.textContent = 'Hide'; keyStatus.textContent = 'Select and copy the key manually.'; } }
  });
  root.querySelector('[data-key-download]')!.addEventListener('click', () => {
    if (!secret || !origin) return;
    const url = URL.createObjectURL(new Blob([`# Keep private. Do not commit or paste into chat.\nCAPABILITY_BASE_URL=${origin}\nCAPABILITY_API_KEY=${secret}\n`], { type: 'text/plain' }));
    const link = document.createElement('a'); link.href = url; link.download = 'awb-tools.env'; root.append(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    keyStatus.textContent = 'Connection file downloaded. Keep it private and load it into your agent’s environment.';
  });
  root.querySelector('[data-key-check]')!.addEventListener('click', async () => {
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
  const clearSecret = () => { revision++; busy = false; wipeSecret(); renderBusy(); };
  window.addEventListener('pagehide', clearSecret);
  return {
    clearSecret,
    setIdentity(id: string | null) {
      if (id !== userId) { clearSecret(); userId = id; keys = []; renderKeys(); form.hidden = true; }
      if (id && !busy) void refresh();
    },
  };
}
