import type { SupabaseClient, Session } from '@supabase/supabase-js';

export const ONBOARDING_KEY = 'awb:onboarding';
export const PENDING_ONBOARDING_KEY = 'awb:onboarding:pending';

export interface OnboardingProfile {
  version: 1;
  focus: string[];
  shelf: string;
  goal: string;
  chatgpt?: {
    intent: 'none' | 'connect';
    useCase?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const readOnboardingProfile = (): OnboardingProfile | null => {
  try {
    const raw = localStorage.getItem(ONBOARDING_KEY);
    return raw ? (JSON.parse(raw) as OnboardingProfile) : null;
  } catch {
    localStorage.removeItem(ONBOARDING_KEY);
    return null;
  }
};

export const writeOnboardingProfile = (profile: OnboardingProfile, pending = true) => {
  localStorage.setItem(ONBOARDING_KEY, JSON.stringify(profile));
  if (pending) localStorage.setItem(PENDING_ONBOARDING_KEY, '1');
};

export const hasPendingOnboarding = () => localStorage.getItem(PENDING_ONBOARDING_KEY) === '1';

export const clearPendingOnboarding = () => {
  localStorage.removeItem(PENDING_ONBOARDING_KEY);
};

export const persistOnboardingProfile = async (
  supabase: SupabaseClient,
  session?: Session | null
) => {
  const profile = readOnboardingProfile();
  if (!profile) return { ok: true, skipped: 'no-profile' as const };

  const activeSession = session ?? (await supabase.auth.getSession()).data.session;
  const user = activeSession?.user;
  if (!user) return { ok: false, skipped: 'no-session' as const };

  const completedAt = new Date().toISOString();
  const metadata = {
    ...(user.user_metadata ?? {}),
    answer_with_books_onboarding: profile,
    answer_with_books_onboarding_completed_at: completedAt,
  };

  const { error: metadataError } = await supabase.auth.updateUser({ data: metadata });
  if (metadataError) return { ok: false, error: metadataError.message };

  // Optional durable profile row. This succeeds once the profiles table in supabase/profiles.sql is applied.
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      onboarding_profile: profile,
      onboarding_completed_at: completedAt,
      updated_at: completedAt,
    },
    { onConflict: 'id' }
  );

  clearPendingOnboarding();

  return {
    ok: true,
    profileTableSaved: !profileError,
    profileTableError: profileError?.message,
  };
};
