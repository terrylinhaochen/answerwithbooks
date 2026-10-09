# Existing books free; new hosted conversions quoted once

This change adds two genuine generation routes. Hosted processing uses the service's provider and shared account wallet. Customer-agent processing uses the customer's current agent to answer resumable JSON generation/review requests locally; it does not call an AWB model, upload a source, or require login. Both routes use the same extraction and text artifact compiler. Core's `build-processing-runtime.mjs` copies the dependency closure and records hashes.

Public editorial digests and the owner's existing completed books remain free to read, retrieve, download, and install. This is not cross-account deduplication or permission to publish private content. New editions, sources and revisions can incur new hosted generation. Source intake supports user uploads and authorized downloaded copies.

## Hosted billing behavior

Upload/extraction precedes the quote. The server binds the quote to the owner, source and generation options, with a 24-hour expiration. `accept-price` reserves the exact accepted quote and queues work atomically. The database guard rejects alternate queue/claim paths without a reservation. Native extraction also hands off into staging, never automatically into paid generation.

The existing `awb_skills.call_ledger` remains the one USD wallet. `awb_shared_held` includes book reservations alongside other products. No second Stripe account, wallet, subscription, multiplier, or provider-cost charge is introduced. The optional retail tariff is a fixed quote calculated from extracted characters; changing its amount requires a new version. New source processing is unavailable until an operator enables an approved tariff.

Charge only when a ready job contains both `book.md` and `skill/SKILL.md`. Analysis-first work retains its reservation until full generation is ready. Failures and cancellation release held funds. Pausing preserves the hold. Repeated completion/acceptance cannot double-charge. Financial records survive source deletion; active workers prevent deletion. Existing jobs are grandfathered free by the migration. Failed optional covers do not block text delivery or settlement.

Account navigation exposes Billing and API keys again. The same personal API keys resolve to the owner for book processing and retrieval; malformed, revoked or workspace identities cannot cross into a personal library. The billing screen lists book holds and charges in addition to the shared balance.

## Rollout gate

Implementation and local verification do not activate payments. Before release, select and approve retail rates, verify that the personal AWB Stripe top-up/account access policy is available to the intended customers, apply the migration, deploy `book-process`, `book-native`, and `book-library`, then ship the matched CLI and web release. Test against an isolated test wallet before any live customer acceptance. The migration contains NO enabled rates and performs NO customer charges.

A possible tariff for review with the current mini default is a $1 minimum and $0.50 per 100,000 extracted characters, rounded up to the cent, with a $30 maximum quote. That would quote $2.50 for 500,000 characters and $11.23 for the measured 2,245,854-character Smith source. This is a proposal, not an enabled price. A Flash-based tariff should follow a full-book quality/reliability check; the small sample below is insufficient for automatic default replacement.

## Verification and limits

- Real PostgreSQL/PGlite tests: grandfathered access, unconfigured tariff rejection, exact price/owner/source/expiry binding, insufficient funds, duplicate reservation, existing cross-product holds, actual text delivery before settlement, analysis hold, single charge, failure/deletion release, and mandatory rate-version changes.
- Browser: fresh configured build, desktop/mobile, hosted and own-agent choices, no automatic price acceptance, exact accepted price once, visible account links. API/auth responses are mocked; this is not live financial acceptance.
- CLI: generation and review resume separately, strict response schema/citation bounds, rejected review triggers repair, original source preserved, final offline install discovers exactly one skill. Real public-domain opening excerpt also completed through the current agent without hosted model calls. That local demonstration is one source section, not a full-book benchmark.
- Hosted pipeline and CLI regression suites pass. The new commercial migration, tariffs and payment flow are not yet live.

See `verification/processing-routes-2026-10-08/model-comparison.json` for live bounded model receipts. Latency includes generation, cited-claim review, synthesis and synthesis review, with concurrency three and up to two repairs per stage. It excludes extraction, upload, queues, covers, indexing, human evaluation, and installation. Rates are provider estimates, not customer bills or reconciled invoices. One successful sample does not establish general factual accuracy or full-book performance.
