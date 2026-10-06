# Answer with Books email setup

The existing CrowdListen Resend workspace was authenticated and confirmed by its verified `notify.crowdlisten.com` domain. A dedicated `auth.answerwithbooks.com` domain was created there on October 6, 2026. Its domain ID is `948eaeb0-621c-428c-90d8-6195964781f5`. The authoritative DNS provider is GoDaddy. DNS verification is pending; SMTP has not yet been switched from Supabase's built-in sender.

The intended sender is **Answer with Books** `<no-reply@auth.answerwithbooks.com>`. After domain verification, `scripts/connect-resend-smtp.py --apply` creates a sending-only key restricted to this domain, validates SMTP authentication without sending a message, saves the key directly in Supabase, and verifies the configuration. No credential is printed or written to the repository. The script preserves email confirmation, redirect, and expiry settings. It sets the project email limit to 30 per hour; the Resend account's separate limits still apply.

All 13 hosted authentication and security email templates have been updated and read back successfully. Subjects and bodies consistently use **Answer with Books**. Account creation does not imply newsletter consent. Original dynamic links, verification codes, and security-event fields are retained, and security-notification enablement is unchanged. No email was sent by the template update.

Website skill downloads and connection files now use `answer-with-books-tools`; existing URLs remain available for compatibility. Rendered-site branding passed across 122 HTML files and eight routes at desktop and mobile widths. Email previews passed at 600, 390, and 320 pixels. Package archive contents were independently checked.

Remaining acceptance: verify DNS, connect the restricted Resend key to Supabase, then send one explicitly authorized verification email and confirm receipt in the destination inbox. Provider acceptance is not inbox-delivery evidence.
