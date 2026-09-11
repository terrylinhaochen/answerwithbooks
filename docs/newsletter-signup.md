# Newsletter signup

## Active website integration: native AWB form

The landing page, newsletter page, and Subscribe dialog reuse `NewsletterEmailForm.astro`: one email field, a Subscribe button, and the AWB consent sentence. There is no Substack iframe, logo, biography, or embedded styling. The website and newsletter are both branded AWB. The production domain remains answerwithbooks.com.

The form uses `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` to call the existing `newsletter-signup` Edge Function. Only the public anon key is sent to the browser. New opt-ins are saved privately in Supabase; they are **not automatically added to Substack**, and this endpoint does not send newsletter or confirmation emails. Publishing requires an opted-in subscriber import to Substack or a separately configured delivery provider. The success message promises only that the address was saved.

The consent version remains `awb-newsletter-v1` for the same newsletter, now branded AWB. The form provides validation, in-flight duplicate prevention, a honeypot, retryable errors, and rate-limit feedback. It does not send email addresses in URL parameters or retain them in browser storage.

The verified `https://terrychen.substack.com/subscribe` publication remains a fallback for visitors without JavaScript. Substack still owns its separate public profile and bio. The requested bio is “CS@Northwestern, Product & Engineering”; no authenticated Substack profile changes were made. The old bio is no longer present on the website because the embed was removed.

## Verification and deployment boundary

Build with Astro, then run `node scripts/test-newsletter-email.mjs` and `node scripts/test-newsletter-modal.mjs` against the local preview. The signup UI test covers desktop/mobile, invalid input, backend errors, rate limits, success, absence of the old embed, and a no-JavaScript fallback using mocked responses. Set `AWB_LIVE_NEWSLETTER_TEST` to an owned synthetic test address to explicitly test the deployed capture endpoint, then verify and remove that test record. No real subscriber is imported or emailed by these tests. Latest verification: the build and UI tests passed; a browser submission reached the live endpoint with HTTP 202 and produced one private pending-delivery record with consent. That synthetic record was deleted afterward. No confirmation or newsletter email was sent. Frontend publication is pending.

## Supabase capture infrastructure

The previous `newsletter-signup` Edge Function and private `newsletter_signups` table remain deployed in the Answer with Books project (`yozeqanibszoxnowmvsm`). The native website form calls the deployed endpoint. Existing records were not deleted or imported into Substack. Migration `20260911035904_add_newsletter_signups.sql` matches the remote migration version.

The backend stores normalized unique email addresses, consent version/time, source, `pending_delivery` status, and an unset verification timestamp. RLS and revoked browser privileges prevent direct access; the server-only RPC performs atomic duplicate and rate-limit checks. `node scripts/test-newsletter-handler.mjs` covers that retained handler. Its earlier live insert/duplicate/security tests used a synthetic address that was removed and cleanup verified.

For a one-time move of existing newsletter signups, export only explicitly opted-in, non-unsubscribed records. Do not include ordinary app accounts or treat unverified addresses as verified. Use Substack's supported subscriber import workflow and honor its consent requirements. No import has been performed.

The last Supabase security advisory included two intentional informational “RLS enabled, no policy” notices for server-only tables with browser access revoked. It also reported an existing, unrelated [leaked-password protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Auth settings were not changed by the newsletter work.
