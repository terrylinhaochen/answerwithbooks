import { toolsAuthPaths } from './tools-auth.mjs';

const STORAGE_KEY = 'awb-tools-oauth-v1';
const TTL = 30 * 60 * 1000;
const PROVIDERS = ['google', 'github'];

function safeOrigin(value) {
  const url = new URL(value);
  if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Use HTTPS or a local preview.');
  return url.origin;
}

export function buildToolOAuthRequest({ provider, agentId, origin, attemptId }) {
  if (!PROVIDERS.includes(provider) || !toolsAuthPaths(agentId)) throw new Error('Choose a supported sign-in provider and agent.');
  const callback = new URL(toolsAuthPaths(agentId).confirm, safeOrigin(origin));
  callback.searchParams.set('oauth', provider);
  if (attemptId) {
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(attemptId)) throw new Error('Invalid signup attempt.');
    callback.searchParams.set('signup_attempt', attemptId);
  }
  return { provider, options: { redirectTo: callback.href, skipBrowserRedirect: true,
    scopes: provider === 'github' ? 'read:user user:email' : 'openid email profile' } };
}

export function validateOAuthDestination(value, supabaseUrl, provider) {
  const url = new URL(value);
  if (!PROVIDERS.includes(provider) || url.origin !== safeOrigin(supabaseUrl) || url.pathname !== '/auth/v1/authorize' || url.searchParams.get('provider') !== provider || url.username || url.password) throw new Error('Invalid sign-in destination.');
  return url.href;
}

export async function getOAuthProviders({ baseUrl, publicKey, fetcher = fetch }) {
  const response = await fetcher(`${safeOrigin(baseUrl)}/auth/v1/settings`, {
    headers: { apikey: publicKey }, signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error('Unable to check sign-in providers.');
  const data = await response.json();
  return { google: data.external?.google === true, github: data.external?.github === true };
}

// Only local signup consent is stored here; never credentials, tokens, or email.
export function storeOAuthConsent(storage, { attemptId, provider, agentId, now = Date.now() }) {
  buildToolOAuthRequest({ provider, agentId, attemptId, origin: 'https://answerwithbooks.com' });
  if (!attemptId) throw new Error('Missing signup attempt.');
  storage.setItem(STORAGE_KEY, JSON.stringify({ attemptId, provider, agentId, createdAt: now, newsletter: true }));
}

export function readOAuthConsent(storage, search, now = Date.now()) {
  try {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
    const query = new URLSearchParams(search);
    if (!value || value.newsletter !== true || !Number.isFinite(value.createdAt) || now < value.createdAt || now - value.createdAt > TTL ||
      !PROVIDERS.includes(value.provider) || !toolsAuthPaths(value.agentId) || query.get('from') !== 'tools' ||
      value.agentId !== query.get('agent') || value.provider !== query.get('oauth') || value.attemptId !== query.get('signup_attempt')) return null;
    return value;
  } catch { return null; }
}

export function clearOAuthConsent(storage) { storage.removeItem(STORAGE_KEY); }

export async function finishOAuthNewsletter({ consent, user, subscribe }) {
  if (!consent) return false;
  if (!user?.id || !user.email || !user.email_confirmed_at || user.is_anonymous) throw new Error('A verified account is required.');
  if (!user.identities?.some(identity => identity.provider === consent.provider)) throw new Error('Sign-in provider did not match this signup.');
  await subscribe(user.email);
  return true;
}
