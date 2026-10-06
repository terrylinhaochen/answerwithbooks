# Answer with Books email setup

The existing CrowdListen Resend workspace was authenticated and confirmed by its verified `notify.crowdlisten.com` domain. A dedicated `auth.answerwithbooks.com` domain was created there on October 6, 2026. Its domain ID is `948eaeb0-621c-428c-90d8-6195964781f5`. The authoritative DNS provider is GoDaddy. All four DNS records are verified by Resend and match on both GoDaddy nameservers and a public resolver. Production Supabase authentication now sends through Resend.

The live sender is **Answer with Books** `<no-reply@auth.answerwithbooks.com>`. `scripts/connect-resend-smtp.py --apply` created a sending-only key restricted to this domain, validated SMTP authentication, saved the key directly in Supabase, and verified the configuration through an independent readback. No credential is printed or written to the repository. The script preserves email confirmation, redirect, and expiry settings. It sets the project email limit to 30 per hour; the Resend account's separate limits still apply.

All 13 hosted authentication and security email templates have been updated and read back successfully. Subjects and bodies consistently use **Answer with Books**. Account creation does not imply newsletter consent. Original dynamic links, verification codes, and security-event fields are retained, and security-notification enablement is unchanged. No email was sent by the template update.

Website skill downloads and connection files now use `answer-with-books-tools`; existing URLs remain available for compatibility. Rendered-site branding passed across 122 HTML files and eight routes at desktop and mobile widths. Email previews passed at 600, 390, and 320 pixels. Package archive contents were independently checked.

One explicitly authorized sign-in test was submitted through the live production login page. Supabase returned HTTP 200, account creation remained disabled, and the redirect points to `/auth/confirm/`. Resend reports the message delivered to Gmail with the subject **Your Answer with Books sign-in link** and the branded sender. No second test or newsletter signup was triggered.

The recipient confirmed that the email arrived and its link successfully signed them in. The production email-delivery blocker is closed. This verifies one live sign-in; deliverability across other mailbox providers and long-term reliability have not been measured. Nonsecret evidence is saved in `verification/email-setup-2026-10-06/email-connection.json`.
