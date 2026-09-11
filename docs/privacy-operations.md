# AWB privacy and newsletter operations

Operator supplied by the owner: **AnswerWithBooks**. Public request mailbox: **terrychen2026@u.northwestern.edu**. The owner approved publication of both. No corporate suffix, registered address, jurisdiction, or privacy certification has been inferred.

This is an operator runbook, not an automated service. The website points people to this mailbox; no mailbox access, delivery test, or background request processor has been configured by this work.

## Newsletter opt-out

1. Monitor the mailbox before any newsletter send. Treat a clear request to stop as an opt-out; do not require an AWB login, a reason, or an identity document. Accept the subscribed address as the identifier.
2. Find the normalized email in the private `newsletter_signups` table using an authorized administrative connection. Never expose subscriber rows through the browser or commit an export to Git.
3. Set its status to `unsubscribed`. The existing signup RPC preserves that status on duplicate signup; it must not silently re-enroll the address.
4. If the address has already been exported, suppress it with every delivery provider as well. Exclude unsubscribed addresses from every import and send, including queued campaigns. Verify the status before confirming completion.
5. If no signup exists, do not fabricate an opt-in record or consent timestamp. Confirm it is not on the AWB list, check any actual delivery provider, and keep only the minimum secure record needed to honor the request.

Process promptly and before further marketing sends; US commercial-email rules set a maximum of 10 business days. The policy's “unsubscribe at any time” is currently handled by the monitored mailbox, not a website unsubscribe API. The native signup saves newsletter consent without verifying address ownership or automatically syncing with Substack. The optional account-activation step separately requests an Auth email sign-in link; successful account verification must not be treated as verified newsletter consent or override an opt-out. See `subscription-account-flow.md` for delivery prerequisites and test boundaries.

## Access, correction, and deletion

1. Acknowledge the request and establish which account/submission is involved. Verify control of the relevant email/account proportionately before disclosure or destructive changes. Do not ask for passwords. Do not request identity documents by default.
2. Record the applicable response deadline based on the person's jurisdiction. Track the request securely outside the public repository; log status rather than unnecessary personal content.
3. Scope every relevant location: Supabase Auth, profiles/onboarding, book requests, content feedback, content maps and collections, and newsletter records. Also check any provider to which those records were actually exported.
4. For account deletion, follow the current Supabase Auth administrative process, including session revocation. Deleting a user alone does not immediately invalidate existing access tokens. Check related tables and email-keyed records rather than assuming every row cascades.
5. Preserve only narrowly justified legal/security records and minimal marketing suppression evidence. Explain any applicable exception. Do not promise a fixed deletion date or that backups vanish instantly without checking the relevant provider's retention policy.
6. Verify the result with scoped administrative queries, then confirm what was done and what, if anything, remains. Explain that browser-only data needs to be cleared on the person's device and that copies of public content made by others cannot be recalled.

## Before newsletter delivery

- Configure the actual publication/email provider, sender identity, monitored replies, a valid sender postal address, and a working unsubscribe mechanism. Do not substitute the operator's public email for a postal address.
- Import only consented newsletter records that are not unsubscribed. Account or book-request emails are not newsletter permission. Do not mark unverified addresses as verified.
- Run a controlled delivery and unsubscribe rehearsal using an address owned by the operator. A signup/database test is not an email-delivery test.
- Check outstanding mailbox requests and suppression status immediately before every import/send.

## Additional launch review

The public website's revised copy is complete for owner review; it is not a legal opinion or a guarantee of compliance. A qualified reviewer should check jurisdiction-specific obligations, exact legal entity details, processing grounds, any international-transfer safeguards, and enterprise agreements before broader rollout. Confirm that the Northwestern mailbox is appropriate for this business use; no institutional affiliation is claimed on the website.

Google Analytics remains off without explicit browser opt-in. The optional preference is on `/privacy/#privacy-choices`, honors GPC/DNT, and expires after 180 days. Google Fonts and ordinary hosting requests still occur. Review Google Analytics property settings and retention before enabling broader analytics use; do not claim that this browser control alone satisfies every regional requirement.

Public content-map attribution is protected by a database trigger and validated check constraint. User-written public text can still contain personal data. The current client no longer writes or requests `author_email`; old clients remain compatible and their public attribution email is removed by the database.

## Sources

- [FTC CAN-SPAM guidance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)
- [ICO privacy-notice contents](https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/) — jurisdiction-dependent; the ICO flags parts of its guidance as under review.
- [Supabase column privileges](https://supabase.com/docs/guides/database/postgres/column-level-security) and [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Google Analytics privacy controls](https://developers.google.com/tag-platform/security/guides/privacy)
