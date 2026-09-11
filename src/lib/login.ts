import { supabase } from './supabase';
import { consumeAuthCallback, emailRedirectTo } from './auth-callback';
import { hasPendingOnboarding, persistOnboardingProfile } from './onboarding';
import { readSignupFlow } from './signup-session';
import type { Session } from '@supabase/supabase-js';

const form = document.querySelector<HTMLFormElement>('#login-form')!;
const email = form.querySelector<HTMLInputElement>('#email')!;
const password = form.querySelector<HTMLInputElement>('#password')!;
const passwordField = form.querySelector<HTMLElement>('[data-password-field]')!;
const message = document.querySelector<HTMLElement>('#form-message')!;
const submit = document.querySelector<HTMLButtonElement>('#submit-btn')!;
const toggle = document.querySelector<HTMLButtonElement>('[data-login-mode]')!;
const loginCopy = document.querySelector<HTMLElement>('[data-login-copy]');
const signupLink = document.querySelector<HTMLAnchorElement>('[data-signup-link]');
const from = new URLSearchParams(location.search).get('from');
const pendingOnboarding = from === 'onboarding' || hasPendingOnboarding();
const destination = pendingOnboarding ? '/profile/?onboarded=1' : from === 'upload' ? '/upload/' : '/my-books/';
let passwordMode = false;
let busy = false;
let resendAt = 0;
email.value = readSignupFlow()?.email || '';

if (pendingOnboarding) {
  if (loginCopy) loginCopy.textContent = 'Log in to sync the setup you just created to your profile.';
  if (signupLink) signupLink.href = '/signup/?from=onboarding';
} else if (from === 'upload') {
  if (loginCopy) loginCopy.textContent = 'Log in to map content to your personal shelf.';
  if (signupLink) signupLink.href = '/signup/?from=upload';
}

function render() {
  const remaining = Math.max(0, Math.ceil((resendAt - Date.now()) / 1000));
  passwordField.hidden = !passwordMode;
  password.disabled = !passwordMode || busy;
  password.required = passwordMode;
  email.disabled = busy;
  toggle.disabled = busy;
  toggle.textContent = passwordMode ? 'Use an email link instead' : 'Use a password instead';
  submit.disabled = busy || (!passwordMode && remaining > 0);
  submit.textContent = busy ? passwordMode ? 'Logging in…' : 'Sending link…'
    : !passwordMode && remaining > 0 ? `Try again in ${remaining}s`
    : passwordMode ? 'Log in' : 'Send sign-in link';
  form.setAttribute('aria-busy', String(busy));
}

function showMessage(text: string) {
  message.textContent = text;
  message.classList.remove('hidden');
}

async function finish(session: Session | null, error?: string, silent = false) {
  if (error || !session) {
    if (!silent) showMessage('This sign-in link is no longer valid. Request a fresh link below.');
    return;
  }
  if (pendingOnboarding) await persistOnboardingProfile(supabase, session);
  location.href = destination;
}

consumeAuthCallback(supabase).then(async result => {
  if (result.handled) return finish(result.session, result.error);
  const { data } = await supabase.auth.getSession();
  await finish(data.session, undefined, true);
}).catch(() => showMessage('We couldn’t complete sign-in. Please try again below.'));

toggle.addEventListener('click', () => {
  if (busy) return;
  passwordMode = !passwordMode;
  message.classList.add('hidden');
  render();
  (passwordMode ? password : email).focus();
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || (!passwordMode && resendAt > Date.now())) return;
  email.value = email.value.trim();
  if (!form.reportValidity()) return;
  const address = email.value.toLowerCase();
  const secret = password.value;
  busy = true;
  message.classList.add('hidden');
  render();
  try {
    if (passwordMode) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: address, password: secret });
      if (error) showMessage('We couldn’t log you in with those details. Check them or use an email link.');
      else await finish(data.session);
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false, emailRedirectTo: emailRedirectTo('/auth/confirm/') },
      });
      resendAt = Date.now() + 60000;
      // Do not reveal whether an address has an account.
      showMessage(error?.status === 429
        ? 'Too many email requests. Please wait a minute before trying again.'
        : error && error.status >= 500 ? 'We couldn’t send a link right now. Please try again shortly.'
        : 'If this email has an AWB account, a sign-in link is on its way. Check your inbox and spam folder.');
    }
  } catch {
    if (!passwordMode) resendAt = Date.now() + 60000;
    showMessage('We couldn’t complete the request. Please try again shortly.');
  } finally {
    busy = false;
    render();
  }
});

render();
window.setInterval(() => { if (resendAt && !busy) render(); }, 1000);
