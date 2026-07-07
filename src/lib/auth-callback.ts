import type { SupabaseClient, Session } from '@supabase/supabase-js';

export const emailRedirectTo = (path = '/login/') => `${window.location.origin}${path}`;

export const consumeAuthCallback = async (
  supabase: SupabaseClient
): Promise<{ session: Session | null; handled: boolean; error?: string }> => {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    stripAuthParams(url);
    if (error) return { session: null, handled: true, error: error.message };
    return { session: data.session, handled: true };
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    stripAuthParams(url);
    if (error) return { session: null, handled: true, error: error.message };
    return { session: data.session, handled: true };
  }

  const authError = url.searchParams.get('error_description') || hash.get('error_description');
  if (authError) {
    stripAuthParams(url);
    return { session: null, handled: true, error: authError };
  }

  return { session: null, handled: false };
};

const stripAuthParams = (url: URL) => {
  for (const key of ['code', 'error', 'error_code', 'error_description']) {
    url.searchParams.delete(key);
  }
  const clean = `${url.pathname}${url.search}`;
  window.history.replaceState({}, document.title, clean || url.pathname);
};
