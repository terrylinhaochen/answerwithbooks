import { supabase } from './supabase';
import { setupToolAccountAccess } from './tool-account-access';

const root = document.querySelector<HTMLElement>('[data-api-keys-page]')!;
const content = root.querySelector<HTMLElement>('[data-keys-content]')!;
const status = root.querySelector<HTMLElement>('[data-keys-session-status]')!;
const signin = root.querySelector<HTMLElement>('[data-keys-signin]')!;
const access = setupToolAccountAccess(content);
let revision = 0;
async function load() {
  const current = ++revision;
  access.setIdentity(null);
  content.hidden = true;
  signin.hidden = true;
  status.hidden = false;
  status.textContent = 'Checking your account…';
  try {
    const { data, error } = await supabase.auth.getUser();
    if (current !== revision) return;
    if (error || !data.user?.email_confirmed_at || data.user.is_anonymous) {
      status.textContent = 'Sign in to create and manage your personal API keys.';
      signin.hidden = false;
      return;
    }
    status.hidden = true;
    content.hidden = false;
    access.setIdentity(data.user.id);
  } catch {
    if (current === revision) {
      status.textContent = 'We couldn’t check your account. Sign in again to continue.';
      signin.hidden = false;
    }
  }
}
supabase.auth.onAuthStateChange(() => window.setTimeout(() => { void load(); }, 0));
window.addEventListener('pagehide', () => { revision++; access.setIdentity(null); });
void load();
