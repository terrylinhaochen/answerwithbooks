# Book processing routes and billing

## Current pricing decision — October 9

The user selected CrowdListen's existing provider-usage policy, superseding the earlier flat/character-based book tariff proposal. No further selection among those old price options is required.

Customer charge = 4 × metered provider list cost, rounded upward once per complete run to the nearest cent (`ceil(providerCostUsd × 400)` cents). This targets 75% margin over those provider costs, before payment processing, hosting, storage, support, taxes or refunds. It is a 300% markup, not a 75% markup. Input, cached-input and output tokens use their respective model rates. A $0.10 provider subtotal yields a $0.40 customer charge.

Verified against CrowdListen's `agents/services/usage_pricing.py`, the Skills API `src/task-pricing.ts`, and the deployed PostgreSQL chain `crowdlisten_credits` → `crowdlisten_credits_before_center` → `crowdlisten_credits_before_selfserve`. The deployed settlement uses `ceil(cost*400)` and policy `crowdlisten-usage-2026-09-19-v3`. Current self-serve credit deposits are 1:1 USD; historical discounted credit packs reduce effective cash margin and must not be silently imported into AWB's USD wallet.

**Implementation gap: the draft below still implements a fixed character-based quote, not this selected token tariff. Do not activate it as the customer's approved pricing.** Replace it with a customer-approved spending ceiling, metered settlement and release of unused reservation. Meter all included generation, review, repair and optional provider operations; keep rate/version evidence. Persist each operation before provider I/O and reconcile missing receipts instead of treating them as zero. The current AWB usage recorder logs after calls and merely logs persistence failures, so it is diagnostic telemetry, not yet a reliable charging ledger. CrowdListen may charge consumed provider work even if the overall run fails; matching that behavior also requires replacing AWB's draft blanket failure waiver and customer copy.

Existing book reuse and own-agent generation remain free from AWB. Live personal payments stay disabled pending the metering rewrite, complete Stripe acceptance and coordinated production rollout.

## Earlier fixed-quote draft (superseded pricing, retained implementation history)

This change adds two genuine generation routes. Hosted processing uses the service's provider and shared account wallet. Customer-agent processing uses the customer's current agent to answer resumable JSON generation/review requests locally; it does not call an AWB model, upload a source, or require login. Both routes use the same extraction and text artifact compiler. Core's `build-processing-runtime.mjs` copies the dependency closure and records hashes.

Public editorial digests and the owner's existing completed books remain free to read, retrieve, download, and install. This is not cross-account deduplication or permission to publish private content. New editions, sources and revisions can incur new hosted generation. Source intake supports user uploads and authorized downloaded copies.

## Hosted billing behavior

Upload/extraction precedes the quote. The server binds the quote to the owner, source and generation options, with a 24-hour expiration. `accept-price` reserves the exact accepted quote and queues work atomically. The database guard rejects alternate queue/claim paths without a reservation. Native extraction also hands off into staging, never automatically into paid generation.

The existing `awb_skills.call_ledger` remains the one USD wallet. `awb_shared_held` includes book reservations alongside other products. No second Stripe account, wallet, subscription, multiplier, or provider-cost charge is introduced. The optional retail tariff is a fixed quote calculated from extracted characters; changing its amount requires a new version. New source processing is unavailable until an operator enables an approved tariff.

Charge only when a ready job contains both `book.md` and `skill/SKILL.md`. Analysis-first work retains its reservation until full generation is ready. Failures and cancellation release held funds. Pausing preserves the hold. Repeated completion/acceptance cannot double-charge. Financial records survive source deletion; active workers prevent deletion. Existing jobs are grandfathered free by the migration. Failed optional covers do not block text delivery or settlement.

Account navigation exposes Billing and API keys again. The same personal API keys resolve to the owner for book processing and retrieval; malformed, revoked or workspace identities cannot cross into a personal library. The billing screen lists book holds and charges in addition to the shared balance.

## Rollout gate

Implementation and local verification do not activate payments. Before release, select and approve retail rates, verify that the personal AWB Stripe top-up/account access policy is available to the intended customers, apply the migration, deploy `book-process`, `book-native`, and `book-library`, then ship the matched CLI and web release. Test against an isolated test wallet before any live customer acceptance. The migration contains NO enabled rates and performs NO customer charges.

An earlier unapproved tariff proposal for Mini is a $1 minimum and $0.50 per 100,000 extracted characters, rounded up to the cent, with a $30 maximum quote. That would quote $2.50 for 500,000 characters and $11.23 for the measured 2,245,854-character Smith source. This is not an enabled price or user approval. The user selected GLM-5.3 Flash for the candidate on October 9; neither a Flash retail tariff nor payment activation has been approved. Flash rollout remains gated by the quality audit and a full-book reliability check.

## Verification and limits

- Real PostgreSQL/PGlite tests: grandfathered access, unconfigured tariff rejection, exact price/owner/source/expiry binding, insufficient funds, duplicate reservation, existing cross-product holds, actual text delivery before settlement, analysis hold, single charge, failure/deletion release, and mandatory rate-version changes.
- Browser: fresh configured build, desktop/mobile, hosted and own-agent choices, no automatic price acceptance, exact accepted price once, visible account links. API/auth responses are mocked; this is not live financial acceptance.
- CLI: generation and review resume separately, strict response schema/citation bounds, rejected review triggers repair, original source preserved, final offline install discovers exactly one skill. Real public-domain opening excerpt also completed through the current agent without hosted model calls. That local demonstration is one source section, not a full-book benchmark.
- Hosted pipeline and CLI regression suites pass. The new commercial migration, tariffs and payment flow are not yet live.

See `verification/processing-routes-2026-10-08/model-comparison.json` for live bounded model receipts. Latency includes generation, cited-claim review, synthesis and synthesis review, with concurrency three and up to two repairs per stage. It excludes extraction, upload, queues, covers, indexing, human evaluation, and installation. Rates are provider estimates, not customer bills or reconciled invoices. One successful sample does not establish general factual accuracy or full-book performance.

## October 9 model and billing verification

The candidate default is now GLM-5.3 Flash with low reasoning for generation and review. Explicit environment overrides still take precedence. See [quality findings and reproducible evaluations](verification/flash-quality-2026-10-09/README.md). A completed pipeline run is not a quality pass: a source comparison found a wagon-tonnage error and misattributed procedural steps in the saved Flash output. Do not deploy this candidate as quality-approved.

A fresh read-only production query found no `book_processing_prices` table, no `book_payment_reservations` table, and no `billing_required` column. This confirms the new book-charging migration is not deployed. Local database tests and mocked browser tests do not establish live Stripe/top-up/payment acceptance.

## Personal checkout adapter and current release state

The paired Skills API change adds a separate personal-book billing adapter. Verified personal accounts can create AWB book API keys and buy USD credits without being added to the managed-tool allowlist. Managed-tool authorization and native workspace prepaid billing remain independently enforced. A live-only startup check refuses to enable credit purchases if the approved book tariff is missing or disabled.

The upload handoff now stops before paid enqueue, including resumed CLI uploads. Billing retains an owner-bound return link to the selected book across Stripe checkout. Adding funds never accepts a book quote automatically. Credit terms explain one-time deposits, reservations, delivered-result charges, optional covers and failed-job release to the account balance.

See [October 9 payment acceptance evidence](verification/billing-2026-10-09/README.md) for current test boundaries and deployment blockers. The Stripe sandbox checkout opens, but its verification challenge prevented completed remote payment proof. Live personal payments remain disabled pending retail approval and completed acceptance.
