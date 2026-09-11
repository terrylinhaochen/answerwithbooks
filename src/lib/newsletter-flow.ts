import { supabase } from './supabase';
import { emailRedirectTo } from './auth-callback';
import { readSignupFlow, writeSignupFlow, SIGNUP_FLOW_TTL, type SignupFlowState } from './signup-session';

const roots = Array.from(document.querySelectorAll<HTMLElement>('[data-newsletter-email]'));
let state = readSignupFlow();
let subscribing = false;
let activating = false;
let accountError = '';
let alreadySignedIn = false;
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
    submit.textContent = subscribing ? 'Saving…' : state ? 'Saved' : 'Subscribe';
    form.setAttribute('aria-busy', String(subscribing));
    panel.hidden = !state;
    root.querySelector<HTMLElement>('[data-account-login]')!.hidden = !!state;
    if (!state) continue;
    input.value = state.email;
    message.textContent = 'Thanks—your email has been saved for the AWB newsletter.';
    message.dataset.error = 'false';
    const sent = state.stage === 'sent';
    const done = state.stage === 'done';
    root.querySelector<HTMLElement>('[data-account-title]')!.textContent = done ? 'You’re all set.' : sent ? 'Check your email.' : 'Make it your shelf.';
    root.querySelector<HTMLElement>('[data-account-copy]')!.textContent = done
      ? alreadySignedIn ? 'You’re already signed in. Your shelf is ready.' : 'Keep exploring. You can activate your free account whenever you’re ready.'
      : sent ? `Open the sign-in link in the email to ${state.email}. It activates a new account or signs you into your existing one.`
      : `Save books and reading progress with a free account. We’ll send a sign-in link to ${state.email}—no password needed.`;
    const activate = root.querySelector<HTMLButtonElement>('[data-activate-account]')!;
    const remaining = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
    activate.hidden = done;
    activate.disabled = activating || remaining > 0;
    activate.textContent = activating ? 'Sending link…' : remaining > 0 ? `Resend in ${remaining}s` : sent ? 'Resend sign-in link' : 'Activate my account';
    root.querySelector<HTMLElement>('[data-account-consent]')!.hidden = done || sent;
    root.querySelector<HTMLElement>('[data-account-status]')!.textContent = accountError;
    const skip = root.querySelector<HTMLButtonElement>('[data-skip-account]')!;
    skip.hidden = done;
    skip.disabled = activating;
    skip.textContent = sent ? 'Keep browsing' : 'Not now';
    const explore = root.querySelector<HTMLAnchorElement>('[data-account-explore]')!;
    explore.hidden = !done;
    explore.href = alreadySignedIn ? '/my-books/' : '/guides/';
    explore.textContent = alreadySignedIn ? 'Open my shelf' : 'Explore guides';
    const resume = root.querySelector<HTMLButtonElement>('[data-account-resume]')!;
    resume.hidden = !done || alreadySignedIn;
    root.querySelector<HTMLButtonElement>('[data-signup-reset]')!.disabled = activating;
  }
}

function focusStep(root: HTMLElement) {
  root.querySelector<HTMLElement>('[data-account-title]')?.focus({ preventScroll: true });
}

async function activate(root: HTMLElement) {
  if (!state || activating || state.resendAt > Date.now()) return;
  activating = true;
  accountError = '';
  render();
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user.email?.toLowerCase() === state.email && data.session.user.email_confirmed_at) {
      alreadySignedIn = true;
      setState({ ...state, stage: 'done' });
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: state.email,
      options: { shouldCreateUser: true, emailRedirectTo: emailRedirectTo('/auth/confirm/') },
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
      focusStep(root);
    } catch (error) {
      message.textContent = error instanceof Error && error.name === 'Error' ? error.message : 'We could not save your signup. Please try again.';
      message.dataset.error = 'true';
    } finally {
      subscribing = false;
      render();
    }
  });
  root.querySelector('[data-activate-account]')?.addEventListener('click', () => activate(root));
  root.querySelector('[data-skip-account]')?.addEventListener('click', () => {
    if (state && !activating) { accountError = ''; setState({ ...state, stage: 'done' }); focusStep(root); }
  });
  root.querySelector('[data-account-resume]')?.addEventListener('click', () => {
    if (state) { setState({ ...state, stage: 'account' }); focusStep(root); }
  });
  root.querySelector('[data-signup-reset]')?.addEventListener('click', () => {
    if (activating) return;
    accountError = ''; alreadySignedIn = false;
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
  if (!state.resendAt || state.stage === 'done') return;
  const remaining = Math.max(0, Math.ceil((state.resendAt - Date.now()) / 1000));
  for (const root of roots) {
    const button = root.querySelector<HTMLButtonElement>('[data-activate-account]')!;
    button.disabled = remaining > 0;
    button.textContent = remaining > 0 ? `Resend in ${remaining}s` : state.stage === 'sent' ? 'Resend sign-in link' : 'Activate my account';
  }
}, 1000);

