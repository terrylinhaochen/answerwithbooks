# One subscription, one shared library

Status (2026-11-06): shared intake, public reads, subscriber source access and atomic guide allowances are implemented and deployed to Supabase. The AWS extraction worker is updated. The frontend and single-skill CLI 0.8.0 are built locally, not yet published. Stripe checkout is configured with a dedicated monthly price, customer portal and signed webhook. The user selected the existing CrowdListen Stripe account. See [verification](../verification/hosted-guides-2026-11-06/shared-library-release.md).

## Agreed product

- One plan: USD $24 per month, with 30 new guides per billing month.
- Uploading books is free. Processing is funded by the service, with no per-book credit purchase.
- New uploads contribute to a public shared catalog and become available to other readers. Finished guides are public too.
- Store the full extracted text on the server. Subscribers can read it through the skill; do not offer original PDF/EPUB or raw-text file downloads.
- The subscription pays for creating new guides and subscriber source access. Browsing published books and guides remains public.
- Check for duplicates before paying to process a source again.
- One Answer with Books skill. Installation begins by having the agent read the setup documentation and the canonical installation instructions.
- Main navigation: Books, Guides, Skills. Documentation remains in the footer and setup prompt.

Source visibility is settled: public book entries and finished guides, authenticated subscriber access to stored original text through the skill, and no downloadable source files. Keep storage buckets private and return text through an authorized reader API. Existing private books and guides require explicit publication rather than a global visibility change. New creation screens must clearly say that the resulting book or guide is public.

## Reader experience

Books is the shared catalog. Upload identifies an existing edition or creates a processing card for a new one. The card updates in place and links to the completed book. A duplicate leads directly to the existing book, or joins its existing processing job.

Guides starts with a question. The model selects books and passages, explains their connection, and asks for book confirmation and a reading length. Your guides shows progress and completed readings. A subscriber sees a clear remaining-guide count and renewal date. Existing saved guides remain readable when a subscription ends.

Profile has books, guides, preferences and plan management. Shared books are removed from a personal shelf without deleting the canonical source. Existing private books retain their owner controls. Processing stays attached to the upload or book card. Key-management access is secondary for existing advanced connections. Users do not need an API key for normal agent setup.

## Subscription accounting

Implemented policy: 30 completed guides per paid billing period, no rollover, and no automatic overage charges. Reopening, reading, source context, and retrieving answers from existing guides do not consume a new guide. A new question or deliberate regeneration does.

Reserve one slot atomically on confirmation, before generation begins; finalize it when the guide is ready. Refund the reservation on terminal failure or a source gap. Provider retries and repeated client submissions reuse the same reservation. Deleting a finished guide does not refund its usage. Count reserved and completed slots when checking the cap, so concurrent requests cannot exceed 30.

Store billing periods from verified subscription events, not the device calendar. Verify webhook signatures, deduplicate event IDs, reconcile out-of-order updates, and never activate entitlements from a checkout return URL alone. Keep the current abuse rate limiter separate from the monthly allowance. Track operator-funded upload and guide costs internally even though users see no per-book token bill.

Existing prepaid balances, reservations and receipts are preserved in their original ledger. Previous billing remains accessible from Billing. New shared uploads never debit that balance. Compatibility handlers for historical private work are retained; the new interface exposes no top-up flow.

## Shared-source deduplication

The legacy private cache stays account-scoped. Shared books use a separate fingerprint registry with unique file and normalized-text hashes; private matches never participate.

Implemented shared-source path:

1. Check a file hash against public sources before uploading or extracting the same bytes again.
2. Recompute trusted file/text fingerprints server-side; client hashes are hints, not proof.
3. After extraction, normalize only encoding and insignificant whitespace, then check a text fingerprint. Keep the original text and source coordinates intact for excerpts.
4. Resolve one canonical public source/edition with database uniqueness and an atomic processing claim. Two users uploading simultaneously must join one job, not launch two model runs.
5. Keep different fingerprints separate. Title/author similarity is not a merge signal; fuzzy edition suggestions are outside this first version.
6. Scope reuse to public sources. A private-source match must neither disclose its existence nor turn it public.
7. Keep shared sources separate from a user's saved-library association. Removing a book from one user's shelf must not delete everyone else's source.

Reuse full extracted text, chapter maps, edition identifiers and passage coordinates. LLMs select source chapters and read originals when creating a guide; no keyword or vector ranking is introduced by duplicate detection.

## Release and remaining activation

Backend: the shared-library schema and five Edge Functions are deployed. APIs and model orchestration run on Supabase; native file extraction runs on the existing AWS worker. The browser and skill only hash/upload files and read API responses. Sources are stored in private storage and the database, with stable line coordinates.

Stripe: the existing CrowdListen account is configured. Live checkout and the dedicated portal were verified without submitting payment. The signed webhook accepts valid probes and rejects invalid signatures. A paid purchase, renewal and cancellation have not been exercised; see [activation evidence](../verification/hosted-guides-2026-11-06/stripe-activation.md).

Frontend/skill: local build and downloadable 0.8.0 package are ready. Publish the website, docs, and downloadable runtime together. All agent installation buttons use the same package, avoiding a second skill or a stale GitHub-main installer. Existing production frontend and docs have not been replaced by this local implementation.

Acceptance completed: local real-Postgres contention, deduplication, RLS, renewal/cancellation and webhook ordering tests; real handler tests with intercepted dependencies; mobile/desktop browser tests; hosted EPUB converter smoke; read-only hosted API checks. A fresh paid checkout, paid renewal/cancellation and a complete public multi-book guide remain untested live. No old private content was republished to populate the catalog.
