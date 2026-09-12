import { supabase } from './supabase';
import { emailRedirectTo } from './auth-callback';
import { readSignupFlow, writeSignupFlow, SIGNUP_FLOW_TTL, type SignupFlowState } from './signup-session';
import { readToolsAuthContext } from './tools-auth.mjs';

const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-newsletter-email]'));
let state = readSignupFlow();
let subscribing = false;
let activating = false;
let accountError = '';
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

function setState(next: SignupFlowState | null) {
  state = next;
  writeSignupFlow(next);
  render();
}

function render() {
  for (const root of roots) {
    const form = root.querySelector<HTMLFormElement>('[data-newsletter-email-form]')!;
    const input = form.querySelector<HTMLInputElement>('[name=email]')!;
    const submit = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
    const panel = root.querySelector<HTMLElement>('[data-account-step]')!;
    const message = root.querySelector<HTMLElement>('[data-newsletter-status]')!;
    root.dataset.signupStage = state?.stage || 'email';
    form.querySelector<HTMLElement>('.newsletter-email__field')!.hidden = !!state;
    form.querySelector<HTMLElement>('.newsletter-email__note')!.hidden = !!state;
    input.disabled = !!state || subscribing;
    submit.disabled = !!state || subscribing || !url || !key;
    submit.textContent = subscribing ? 'Saving…' : state ? 'Saved' : root.dataset.submitLabel || 'Subscribe';
    form.setAttribute('aria-busy', String(subscribing));
    panel.hidden = !state;
    root.querySelector<HTMLElement>('[data-account-login]')!.hidden = !!state;
    if (!state) continue;
    input.value = state.email;
    message.textContent = 'Thanks—your email has been saved for the AWB newsletter.';
    message.dataset.error = 'false';
    const sent = state.stage === 'sent';
    root.querySelector<HTMLElement>('[data-account-title]')!.textContent = activating ? 'Finishing your signup…' : sent ? 'Check your email.' : 'Finish your signup.';
    root.querySelector<HTMLElement>('[data-account-copy]')!.textContent = sent
      ? `We sent a verification link to ${state.email}. Confirm your email to ${readToolsAuthContext(location.pathname, location.search) ? 'return to your tool setup' : 'go straight to your AWB profile'}—no password needed.`
      : `Your newsletter signup is saved. ${activating ? 'Sending' : 'Retry sending'} the verification link to ${state.email} to finish your AWB signup.`;
    const activate = root.querySelector<HTMLButtonElement>('[data-resend-verification]')!;
    const remaining = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
    activate.disabled = activating || remaining > 0;
    activate.textContent = activating ? 'Sending email…' : remaining > 0 ? `Resend in ${remaining}s` : sent ? 'Resend verification email' : 'Retry verification email';
    root.querySelector<HTMLElement>('[data-account-status]')!.textContent = accountError;
    root.querySelector<HTMLButtonElement>('[data-signup-reset]')!.disabled = activating;
  }
}

function focusStep(root: HTMLElement) {
  root.querySelector<HTMLElement>('[data-account-title]')?.focus({ preventScroll: true });
}

async function sendVerification(root: HTMLElement) {
  if (!state || activating || state.resendAt > Date.now()) return;
  activating = true;
  accountError = '';
  render();
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.email?.toLowerCase() === state.email && data.session.user.email_confirmed_at) {
      writeSignupFlow(null);
      window.location.replace(readToolsAuthContext(location.pathname, location.search)?.returnTo || '/profile/');
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: state.email,
      options: { shouldCreateUser: true, emailRedirectTo: emailRedirectTo(readToolsAuthContext(location.pathname, location.search)?.confirm || '/auth/confirm/') },
    });
    // Cool down even after an ambiguous network failure: avoid duplicate emails.
    state = { ...state, resendAt: Date.now() + 60000 };
    if (error) {
      accountError = error.status === 429
        ? 'Too many email requests. Your newsletter signup is saved; wait a minute before trying again.'
        : 'We couldn’t send the account link. Your newsletter signup is saved. Please try again shortly.';
      setState(state);
    } else {
      setState({ ...state, stage: 'sent' });
      focusStep(root);
    }
  } catch {
    accountError = 'We couldn’t confirm that the link was sent. Your newsletter signup is saved. Please try again shortly.';
    if (state) setState({ ...state, resendAt: Date.now() + 60000 });
  } finally {
    activating = false;
    render();
  }
}

for (const root of roots) {
  const form = root.querySelector<HTMLFormElement>('[data-newsletter-email-form]')!;
  const input = form.querySelector<HTMLInputElement>('[name=email]')!;
  const message = root.querySelector<HTMLElement>('[data-newsletter-status]')!;
  input.addEventListener('input', () => input.setCustomValidity(''));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (subscribing || state) return;
    input.value = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) input.setCustomValidity('Enter a valid email address.');
    if (!form.reportValidity()) return;
    const email = input.value.toLowerCase();
    const website = new FormData(form).get('website') || '';
    subscribing = true;
    message.textContent = '';
    render();
    try {
      const response = await fetch(`${url}/functions/v1/newsletter-signup`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
        body: JSON.stringify({ email, consent: true, consentVersion: 'awb-newsletter-v1', sourcePath: location.pathname, website }),
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (!response.ok || result.accepted !== true) throw new Error(response.status === 429 ? 'Too many attempts. Please try again in an hour.' : 'We could not save your signup. Please try again.');
      setState({ email, stage: 'account', savedAt: Date.now(), resendAt: 0 });
      await sendVerification(root);
      focusStep(root);
    } catch (error) {
      message.textContent = error instanceof Error && error.name === 'Error' ? error.message : 'We could not save your signup. Please try again.';
      message.dataset.error = 'true';
    } finally {
      subscribing = false;
      render();
    }
  });
  root.querySelector('[data-resend-verification]')?.addEventListener('click', () => sendVerification(root));
  root.querySelector('[data-signup-reset]')?.addEventListener('click', () => {
    if (activating) return;
    accountError = '';
    setState(null);
    for (const other of roots) {
      other.querySelector<HTMLFormElement>('form')!.reset();
      other.querySelector<HTMLElement>('[data-newsletter-status]')!.textContent = '';
    }
    input.focus();
  });
}
render();
if (!url || !key) for (const root of roots) root.querySelector<HTMLElement>('[data-newsletter-status]')!.textContent = 'Signup is temporarily unavailable. Please try again later.';
// Avoid re-announcing live regions on every cooldown tick.
window.setInterval(() => {
  if (!state || activating) return;
  if (Date.now() - state.savedAt >= SIGNUP_FLOW_TTL) writeSignupFlow(null);
  if (!state.resendAt) return;
  const remaining = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
  for (const root of roots) {
    const button = root.querySelector<HTMLButtonElement>('[data-resend-verification]')!;
    button.disabled = remaining > 0;
    button.textContent = remaining > 0 ? `Resend in ${remaining}s` : state.stage === 'sent' ? 'Resend verification email' : 'Retry verification email';
  }
}, 1000);
