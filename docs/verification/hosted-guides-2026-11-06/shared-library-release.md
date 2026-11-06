# Shared library and subscription implementation — 2026-11-06

## Scope and status

Implemented the agreed $24/month, 20-guide plan, free public uploads, a shared catalog, subscriber original-text spans, one hosted reading skill and legacy UI cleanup. The front page and catalog layouts remain; generated guides retain the existing editorial template and contents rail.

Backend deployed to Supabase project yozeqanibszoxnowmvsm:

| Function | Live version |
| --- | --- |
| reader-subscription | 1 |
| shared-library | 1 |
| reading-guides | 11 |
| book-native | 7 |
| book-process | 31 |

Shared schema migration: 20261106072605_shared_library_subscription.sql, applied once via the Supabase migration tool. The reading-guides v11 bundle SHA-256 is 42896cf4acab27c3ab2bb649b92af337eed3957cbf38261026f079b987a812e8.

The existing AWS native worker (us-east-2, i-019e8912ea055c71b) was updated in place after confirming no active extraction. The service restarted successfully and extracted a synthetic EPUB with its exact original sentence preserved. No model call or catalog record was created by this smoke test. Database/API/model orchestration stays on Supabase in us-east-1.

## What changed

- Exact file fingerprints and normalized text fingerprints join one public edition across accounts. Private-source matches do not leak or publish old books.
- New uploads save original text and reviewed chapter/scene maps, a short orientation/summary and questions. They bypass the old per-book essay and skill generator.
- Public projection excludes owner, source files, private artifacts, worker state and credentials. Subscriber source requests return 1–500 original lines, coordinates and hash. No source-file download route.
- Guide confirmation reserves one allowance atomically. Failure/source gap releases it; deleting a completed guide does not refund it. Renewals use verified provider periods.
- Webhooks verify the raw-body signature, refresh canonical Stripe state, deduplicate events and apply state with a version check. Checkout requires the exact USD 24 monthly price; neither redirects nor unpaid invoices activate access.
- Shared guide progress/feedback belongs to each reader. Removing a finished public guide hides it from Your guides without deleting it for others.
- Upload UI has one hosted flow, public notice and processing links. Book pages show three questions, then expand. Billing shows the plan and usage, with old receipts under Previous billing.
- CLI 0.8.0 packages one skill and four small runtime modules, with zero external dependencies. Agent-specific installation uses that same artifact and preserves differing existing instructions/references. No local PDF/OCR/Python/embedding runtime or per-book skill install.
- Removed browser extraction worker, runtime build hooks, local-route/combined-upload modules and obsolete UI tests; CI now covers the shared reading path. Retained historical private/billing compatibility code and records.

## Verification

Passed:

- Real isolated PostgreSQL: 24 simultaneous confirmations admit exactly 20; idempotent confirmations; failure refund; completed deletion accounting; renewal/cancellation; owner denial; file and text deduplication across accounts; private collision isolation; shelf association; raw-text RLS; immutable shared sources; webhook deduplication and stale-read rejection.
- Actual native Edge handler with intercepted dependencies: public EPUB prepare/finalize/complete, free admission, cross-account duplicate reuse with no repeated upload, exact source preservation. Existing private/revision/lease tests also pass.
- Actual book-process Edge handler: public map/review and orientation/review complete without legacy essay or skill artifacts; cover queued. Existing private financial admission, source fidelity, 77-section processing, repair and receipt tests pass.
- Subscription signature/price/entitlement tests, source-access handler tests, guide ownership/confirmation/feedback tests and guide selection/review tests.
- Browser fixtures: public book reader, top-three expandable questions, simple upload, guest/subscriber plan, installer clipboard and fallback, seven host installations, mobile fit. Prior generated-guide reader checks also pass.
- CLI execution from isolated installations and reference-edit preservation. Build emits 119 pages. Product-surface checks pass.

Live read-only acceptance:

- Shared public catalog and public guide list return 200 with zero entries. Six old private books and two old private guides remain private.
- Existing private guide returns 200 to its owner, 401 anonymously; its private source returns 404 from the public library.
- Plan returns priceCents 2400, limit 20, used 0, active false, checkoutAvailable false. Checkout returns 503 honestly while unconfigured.
- Native worker is online and reports PDF/EPUB/Kindle/DOCX/HTML/RTF/TXT/Markdown support.
- Supabase security advisor: new service-only tables intentionally have RLS without browser policies. Existing leaked-password-protection warning remains unrelated to this change; see https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Release boundary

Frontend, docs and CLI artifact are local, not published to production. The package URL is included in the prepared website build and becomes available when that build ships. The production site still has its prior frontend.

Stripe account choice is authorized: existing CrowdListen account acct_1RHSafA3c3cnLmTh. Credentials are inaccessible in this session, so no Stripe objects were created and no card was charged. Required secret names: AWB_STRIPE_SECRET_KEY, AWB_STRIPE_PRICE_ID, AWB_STRIPE_WEBHOOK_SECRET. Configure a dedicated plan/webhook and verify a suitable portal configuration before activation. No live subscription purchase, renewal/cancellation or complete public multi-book generation was performed; local tests do not substitute for those acceptance checks.


## Book-to-guide modal follow-up

The local Books catalog and book pages now use Find an excerpt. A single reusable dialog starts with the book, accepts a question and allows up to four shared books. The existing Guides question form opens this same dialog after submission. Suggestions, time confirmation, progress, errors and completion stay inside it. A finished guide opens only when the reader chooses Read your guide. Closing the dialog does not cancel background work; unfinished guide cards resume it.

Shared-book question links prefill both question and source. Static digest pages resolve only an exact normalized title/author match to a ready shared edition; missing originals show an upload path, never invented source text or a substitute summary. Multiple editions require explicit selection. The source choices are distinct from model reasoning over the selected text.

The hosted proposal accepts optional 1–4 public ready bookIds, validates them before request consumption, and snapshots their scope in existing progress storage. Requested books cannot silently disappear in proposal or final passage refinement. No schema migration was needed. Updated reading-guides deployed as v13.

Passed: 23 guide-engine tests; actual Edge-handler selected-book validation and retry tests; modal browser fixtures (preselection, extra book, source scope, missing source, subscription error, close/Escape, background completion without navigation, catalog CTA, mobile fit); shared-book question handoff; existing complete guide-reader browser checks; 119-page build and product-surface checks. Browser tests use intercepted API/model results. No live paid generation ran. Frontend is still local preview; Stripe activation remains pending.
