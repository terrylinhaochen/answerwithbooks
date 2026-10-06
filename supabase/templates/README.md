# Answer with Books authentication emails

`manifest.json` maps all 13 authentication and security email types to their subjects and HTML files. Every sender-facing name, subject, and body uses **Answer with Books**.

Account creation, sign-in, and password reset are independent of newsletter subscription. These emails must never thank users for subscribing or imply newsletter consent.

Run `node scripts/test-auth-email-templates.mjs` for static checks. Add `--browser` for desktop and mobile previews. Tests preserve dynamic links, codes, and account-security fields. Never replace these fields with a real user's link or token.

Use `python3 scripts/sync-auth-email-templates.py` to compare the hosted Answer with Books project with these files. `--apply` updates only email subjects and template bodies, plus the sender display name when custom SMTP is already configured, then verifies the saved values. It does not send email or change confirmation, redirect, SMTP credentials, security-notification enablement, or expiry settings. A website build does not deploy hosted email templates.

SMTP uses the existing CrowdListen Resend account, with a dedicated `auth.answerwithbooks.com` domain and a key scoped to that domain. Intended sender: `Answer with Books <no-reply@auth.answerwithbooks.com>`. The domain must be verified before enabling the connection. Delivery requires a separate live inbox check.
