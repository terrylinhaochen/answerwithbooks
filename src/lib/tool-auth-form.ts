import { supabase } from './supabase';
import { emailRedirectTo } from './auth-callback';
import { toolsAuthPaths } from './tools-auth.mjs';
import { createToolAccount } from './tool-auth-client.mjs';
import { buildToolOAuthRequest, getOAuthProviders, validateOAuthDestination, storeOAuthConsent, clearOAuthConsent } from './tool-oauth.mjs';
import { registerToolNewsletter } from './tool-newsletter';

export function setupToolAuth(root: HTMLElement, getAgent: () => string) {
  const signup = root.querySelector<HTMLFormElement>('[data-tools-signup-form]')!;
  const login = root.querySelector<HTMLFormElement>('[data-tools-login-form]')!;
  const status = root.querySelector<HTMLElement>('[data-tools-form-status]')!;
  const magic = root.querySelector<HTMLButtonElement>('[data-tools-magic-link]')!;
  const oauthStatus = root.querySelector<HTMLElement>('[data-oauth-status]')!;
  const oauthButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-oauth-provider]')];
  let busy = false;
  let retryAt = 0;
  const setStatus = (message: string, error = false) => { status.textContent = message; status.dataset.error = String(error); };
  const clearPasswords = () => {
    root.querySelectorAll<HTMLInputElement>('input[name="password"]').forEach(input => { input.value = ''; input.type = 'password'; });
    root.querySelectorAll<HTMLButtonElement>('[data-toggle-password]').forEach(button => { button.setAttribute('aria-pressed', 'false'); button.setAttribute('aria-label', 'Show password'); });
  };
  const setBusy = (value: boolean) => {
    busy = value;
    root.querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = value; });
    signup.setAttribute('aria-busy', String(value)); login.setAttribute('aria-busy', String(value));
  };
  oauthButtons.forEach(button => {
    button.disabled = false;
    button.addEventListener('click', async () => {
      if (busy) return;
      const provider = button.dataset.oauthProvider as 'github' | 'google';
      const label = provider === 'github' ? 'GitHub' : 'Google';
      oauthStatus.textContent = `Connecting to ${label}…`;
      setBusy(true);
      let leaving = false;
      try {
        const providers = await getOAuthProviders({ baseUrl: import.meta.env.PUBLIC_SUPABASE_URL, publicKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY });
        if (!providers[provider]) {
          oauthStatus.textContent = `${label} sign-in needs to be enabled by the AWB administrator. Email sign-in is available below.`;
          return;
        }
        const isSignup = !signup.hidden;
        const consent = signup.querySelector<HTMLInputElement>('[name="consent"]')!;
        if (isSignup && !consent.checked) {
          oauthStatus.textContent = 'Please agree to the terms and newsletter signup below, then continue with your chosen provider.';
          consent.reportValidity(); return;
        }
        const attemptId = isSignup ? crypto.randomUUID() : undefined;
        clearOAuthConsent(sessionStorage);
        if (attemptId) storeOAuthConsent(sessionStorage, { provider, agentId: getAgent(), attemptId });
        const request = buildToolOAuthRequest({ provider, agentId: getAgent(), origin: location.origin, attemptId });
        const { data, error } = await supabase.auth.signInWithOAuth(request);
        if (error || !data.url) throw new Error('Sign-in unavailable');
        const destination = validateOAuthDestination(data.url, import.meta.env.PUBLIC_SUPABASE_URL, provider);
        clearPasswords();
        window.location.assign(destination);
        leaving = true;
      } catch {
        try { clearOAuthConsent(sessionStorage); } catch { /* Storage may be unavailable. */ }
        oauthStatus.textContent = `We couldn’t start ${label} sign-in. Please allow browser storage and try again, or use email.`;
      } finally { if (!leaving) setBusy(false); }
    });
  });
  root.querySelectorAll<HTMLButtonElement>('[data-tools-auth-mode]').forEach(button => button.addEventListener('click', () => {
    const isSignup = button.dataset.toolsAuthMode === 'signup';
    clearPasswords(); signup.hidden = !isSignup; login.hidden = isSignup; setStatus(''); oauthStatus.textContent = '';
    root.querySelector<HTMLElement>('[data-auth-heading]')!.textContent = isSignup ? 'Create your account' : 'Sign in to AWB';
    root.querySelector<HTMLElement>('[data-auth-welcome]')!.textContent = isSignup ? 'Welcome! A few details and you’re ready to go.' : 'Welcome back. Continue with your account.';
    root.querySelector<HTMLElement>('[data-auth-switch-copy]')!.textContent = isSignup ? 'Already have an account?' : 'Don’t have an account?';
    root.querySelectorAll<HTMLButtonElement>('[data-tools-auth-mode]').forEach(other => { other.hidden = other.dataset.toolsAuthMode === (isSignup ? 'signup' : 'login'); });
    (isSignup ? signup : login).querySelector<HTMLInputElement>('input')?.focus();
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-toggle-password]').forEach(button => button.addEventListener('click', () => {
    const input = root.querySelector<HTMLInputElement>(`#${button.dataset.togglePassword}`)!;
    const show = input.type === 'password'; input.type = show ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(show)); button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));
  const redirect = () => { const paths = toolsAuthPaths(getAgent()); return paths ? emailRedirectTo(paths.confirm) : null; };
  const ready = () => {
    if (busy) return false;
    if (Date.now() < retryAt) { setStatus('Please wait a minute before requesting another email.', true); return false; }
    return true;
  };
  signup.addEventListener('submit', async event => {
    event.preventDefault(); if (!ready() || !signup.reportValidity()) return;
    const redirectTo = redirect(); if (!redirectTo) return;
    const form = new FormData(signup);
    setBusy(true); setStatus('Creating your account…');
    try {
      const result = await createToolAccount({ auth: supabase.auth, redirectTo,
        fields: { firstName: form.get('firstName'), lastName: form.get('lastName'), username: form.get('username'), email: form.get('email'), password: form.get('password'), consent: form.get('consent') === 'on' },
        registerNewsletter: registerToolNewsletter,
      });
      setStatus(result.message, result.state === 'error');
      retryAt = Date.now() + 60000;
    } catch { setStatus('We couldn’t finish signup. Check your details and try again.', true); }
    finally { form.delete('password'); clearPasswords(); setBusy(false); }
  });
  login.addEventListener('submit', async event => {
    event.preventDefault(); if (busy || !login.reportValidity()) return;
    const form = new FormData(login); setBusy(true); setStatus('Signing in…');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: String(form.get('email')).trim().toLowerCase(), password: String(form.get('password')) });
      setStatus(error ? 'We couldn’t sign you in. Check your email and password, or request a sign-in link.' : 'You’re signed in.', Boolean(error));
    } catch { setStatus('We couldn’t sign you in right now. Please try again.', true); }
    finally { form.delete('password'); clearPasswords(); setBusy(false); }
  });
  magic.addEventListener('click', async () => {
    if (!ready()) return;
    const email = login.querySelector<HTMLInputElement>('input[type="email"]')!;
    if (!email.reportValidity()) return;
    const redirectTo = redirect(); if (!redirectTo) return;
    setBusy(true); setStatus('Requesting a sign-in link…');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.value.trim().toLowerCase(), options: { shouldCreateUser: false, emailRedirectTo: redirectTo } });
      setStatus(error?.status === 429 ? 'Too many requests. Wait a minute before trying again.' : error && error.status >= 500 ? 'We couldn’t send a link right now. Please try again shortly.' : 'If you have an AWB account, a sign-in link is on its way. Confirm your email to return here.', Boolean(error?.status && error.status >= 429));
    } catch { setStatus('We couldn’t confirm that the link was sent. Check your email before trying again.', true); }
    finally { retryAt = Date.now() + 60000; clearPasswords(); setBusy(false); }
  });
  window.addEventListener('pagehide', clearPasswords);
  return { clearPasswords };
}
