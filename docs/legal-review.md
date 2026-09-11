# Legal review: September 10, 2026

The Terms and Privacy Policy now contain reviewed, AWB-specific website copy, a revision date, and the owner-confirmed operator **AnswerWithBooks** and contact **terrychen2026@u.northwestern.edu**. Draft placeholders were removed. No corporate suffix, jurisdiction, affiliation with Northwestern, or legal compliance certification is asserted.

## Completed

- Signup/modal/footer links lead to the site's own Terms and Privacy Policy. Signup links open in a new tab so the email input is preserved.
- Policies describe native newsletter capture accurately: no confirmation email, automatic address verification, or automatic Substack import. Ordinary account/request emails are not newsletter opt-ins.
- Privacy choices make Google Analytics opt-in, off by default, GPC/DNT-aware, and reversible. The initial analytics page URL omits query strings/fragments; account/login/submission routes do not initialize the tag. Google Fonts is separately disclosed.
- Confirmed the live database's public-map policy could expose `author_email`. The audit found zero public maps. Added and applied `20260911054611_protect_public_map_author_email.sql`: a BEFORE trigger clears that field on public inserts/updates, including private-to-public transitions, with a validated check constraint as defense in depth. Old clients remain compatible. No customer submissions were deleted.
- Current map clients no longer store/request author emails or derive public names from them.
- Added a mailbox-based privacy/opt-out operational runbook in `privacy-operations.md`; no mailbox access or email delivery was tested.

## Verification and boundaries

- 102-page production build passed.
- Legal route/link, analytics consent, and native newsletter/modal tests passed on desktop/mobile. Analytics checks cover default-off behavior, opt-in persistence, withdrawal/cookie cleanup, expiry, GPC/DNT, sanitized initial page URLs, and exclusion of sensitive routes; the Google tag is mocked in the test. Form validation/retry/success states were mocked; no subscriber email was submitted in this review.
- Public-map trigger, update, anonymous/owner/other-user RLS and constraint tests passed in a disposable local PostgreSQL cluster. Live metadata confirmed the installed trigger, validated constraint, and zero public rows containing account-email attribution. No fake live accounts were created.
- Supabase advisors show no new findings. Existing server-only newsletter tables intentionally have RLS enabled without browser policies. An unrelated [leaked-password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains; Auth settings were not changed.
- Local website changes are not committed/pushed or deployed by this review. The compatibility-preserving database safeguard is deployed.

## Operator responsibilities before launch/sending

Monitor the approved mailbox and follow `privacy-operations.md`. Set up a real delivery provider, sender postal address, suppression handling, and test unsubscribe before commercial email sends. Legal counsel should assess applicable jurisdictions, retention and transfer arrangements, and enterprise terms. The review does not verify registered entity status, mailbox deliverability, regulatory compliance, or an end-to-end account-deletion workflow.
