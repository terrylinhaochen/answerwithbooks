# AWB authentication emails

These templates were applied to hosted AWB Supabase on September 13, 2026. Keep these files and the hosted configuration in sync; a website build does not deploy email templates.

In Auth → Email Templates for project `yozeqanibszoxnowmvsm`:

- **Confirm sign up**: subject `Welcome to AWB — verify your email`; body `confirmation.html`.
- **Magic link**: subject `Your AWB verification link`; body `magic-link.html`.

Preserve `{{ .ConfirmationURL }}` exactly. Never paste a real user's verification URL into a template. The current app expects link-based confirmation, not a numeric OTP. Leave other authentication/security templates and unsubscribe safeguards intact.

These files do not change the sender. The dashboard still showed Supabase's built-in email service when these templates were applied. To send from an AWB address, configure an authorized SMTP provider and verify its sending domain. No provider purchase, domain change, SMTP configuration, redirect, expiry, or authentication behavior was changed.

Validation: both hosted previews were checked and saved; the magic-link template was also reloaded to confirm persistence. Each template retains one dynamic confirmation link. No real verification link was opened and no test email was sent, so inbox rendering and delivery are not verified by this change.

The current signup flow records newsletter consent before requesting account confirmation, so the confirmation template thanks new users for subscribing. Returning sign-ins use neutral welcome-back copy: signing in does not renew newsletter consent or re-subscribe someone who opted out. If another signup entry point is added without newsletter consent, adjust the confirmation wording before using it.

Run `node scripts/test-auth-email-templates.mjs` for static template checks. When pasting into the dashboard's source editor, select all existing content before pasting and check Preview for duplicated default text before saving.

References: https://supabase.com/docs/guides/auth/auth-email-templates and https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier
