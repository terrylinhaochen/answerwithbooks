export async function registerToolNewsletter(email: string) {
  const key = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  const response = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/newsletter-signup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ email, consent: true, consentVersion: 'awb-newsletter-v1', sourcePath: '/tools/', website: '' }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body.accepted !== true) throw new Error('Signup unavailable');
}
