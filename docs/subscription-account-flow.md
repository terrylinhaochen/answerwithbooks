# Separate account and newsletter flows

Updated October 6, 2026 after dogfooding.

- Create account on `/signup/` uses Supabase email/password signup and a confirmation callback at `/auth/confirm/`. It never records newsletter consent. Onboarding and personalized shelf return paths are preserved.
- Subscribe on the homepage or `/newsletter/` records a newsletter opt-in only. It never creates an account or requests a sign-in email. Existing opt-outs are preserved. Delivery to Substack is a separate operation.
- `/login/` offers password and email-link sign-in. Its Create one link goes to `/signup/`. `/reset-password/` requests recovery and lets an authenticated user set a password.
- Email success copy distinguishes accepted requests from delivery; unknown accounts receive generic messages. Signup resend and recovery have a 60-second client cooldown in addition to provider rate limits. Plus aliases are sent intact to Auth.

Supabase must allow production `/auth/confirm/`, `/login/`, and `/reset-password/` redirects. Recovery uses the same callback parser, and strips tokens from the URL. Password recovery and auth callback routes are excluded from the sitemap and analytics.

`scripts/test-dogfood-web.mjs` checks separate requests, alias preservation, resend cooldown, recovery, upload errors, book actions, onboarding navigation and responsive overflow with mocked Auth/newsletter services. This does not establish real inbox delivery. `scripts/test-newsletter-email.mjs` checks native validation, failure, rate-limit retry and success. `test-combined-signup.mjs` is a compatibility entry point for the new tests.
