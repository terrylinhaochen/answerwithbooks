export function validateToolSignup(fields) {
  const email = String(fields.email || '').trim().toLowerCase();
  const firstName = String(fields.firstName || '').trim();
  const lastName = String(fields.lastName || '').trim();
  const username = String(fields.username || '').trim();
  const password = String(fields.password || '');
  if (fields.consent !== true) throw new Error('Please agree to the terms and newsletter signup.');
  if (!firstName || !lastName || firstName.length > 80 || lastName.length > 80) throw new Error('Enter your first and last name.');
  if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) throw new Error('Use 3–30 letters, numbers, underscores, or hyphens for your username.');
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
  if (password.length < 8 || password.length > 128) throw new Error('Use a password between 8 and 128 characters.');
  return { email, password, firstName, lastName, username };
}

export async function createToolAccount({ auth, registerNewsletter, fields, redirectTo }) {
  const value = validateToolSignup(fields);
  // Only an application-generated, same-site tools callback is accepted.
  const url = new URL(redirectTo);
  if (url.pathname !== '/auth/confirm/' || url.searchParams.get('from') !== 'tools' ||
      !['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) {
    throw new Error('Return to Tools and choose your agent again.');
  }
  try { await registerNewsletter(value.email); }
  catch { return { state: 'error', message: 'We couldn’t save your signup. No account was requested. Please try again shortly.' }; }
  try {
    const { data, error } = await auth.signUp({
      email: value.email, password: value.password,
      options: {
        emailRedirectTo: redirectTo,
        // Display metadata only. Never used for authorization or unique identity.
        data: { first_name: value.firstName, last_name: value.lastName, username: value.username },
      },
    });
    if (error) return { state: 'error', message: error.status === 429
      ? 'Your newsletter signup is saved. Too many account requests—wait a minute before trying again.'
      : 'Your newsletter signup is saved, but we couldn’t finish the account request. Try signing in if you already have an account.' };
    return data?.session ? { state: 'signed-in', message: 'You’re signed in. Your tool setup will continue here.' }
      : { state: 'confirmation', message: 'Check your email to confirm your account and return to tool setup. Already registered? Use Sign in below.' };
  } catch {
    return { state: 'error', message: 'Your newsletter signup is saved. We couldn’t confirm the account request. Check your email before trying again.' };
  }
}
