# AWB authentication emails

These are ready-to-paste hosted Supabase templates, not an applied production configuration.

In Auth → Email Templates for project `yozeqanibszoxnowmvsm`:

- **Confirm sign up**: subject `Welcome to Answer with Books — confirm your email`; body `confirmation.html`.
- **Magic link**: subject `Your Answer with Books sign-in link`; body `magic-link.html`.

Preserve `{{ .ConfirmationURL }}` exactly. Never paste a real user's verification URL into a template. The current app expects link-based confirmation, not a numeric OTP. Leave other authentication/security templates and unsubscribe safeguards intact.

These files do not change the sender. To send as Answer with Books from your own domain, configure an authorized SMTP provider and verify its sending domain. Some newer Free-tier projects using Supabase's default sender cannot customize templates until custom SMTP is connected. No provider purchase, domain change, SMTP configuration, or remote template update has been made here.

The dashboard browser connection was unavailable during implementation, and no Management API access token was configured. Apply the templates in the authenticated dashboard, then send one owner-approved test email. Browser-rendered previews do not prove inbox rendering or delivery. Account confirmation does not imply newsletter consent.

References: https://supabase.com/docs/guides/auth/auth-email-templates and https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier
