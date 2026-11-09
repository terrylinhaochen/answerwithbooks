# Passage-first guide pipeline release

Readers may select books explicitly or ask for recommendations derived from inspected original passages. Automatic recommendations retain exact source ranges and edition hashes; readers confirm or edit the suggested books before generation. Sign-in resumes the original draft without reopening it on unrelated navigation.

Retrieval combines semantic and lexical search over chapter summaries, reviewed scene accounts, source-section summaries, and overlapping original-text windows. Mini shortlists navigation records, GPT-5.4 reads the original candidates, and GPT-5.4 reviews the final guide. Chapter matches are expanded into relevant source windows before inspection. Composition uses matched source context rather than repeatedly sending complete book maps.

Every new guide reserves provider cost before dispatch under a $1 provider budget, including room for the existing high-quality GPT Image 1.5 cover. Failed calls with unknown usage retain their reservations. Durable usage receipts include cache and reasoning-token counts; older guides do not retroactively gain missing receipts. These estimates are not provider invoice reconciliation or customer charges. Fixed-quality image calls use a conservative token allowance; an unexpected provider overrun is recorded and stops subsequent spending.

New public uploads create reusable chapter navigation after their source-reviewed map. Only explicit, defensible source headings are represented as chapters; books without trustworthy headings retain section and original-text retrieval. The database trigger indexes new or changed editions and removes archived/deleted editions from search. Private source records remain service-only and owner-filtered.

## Validation

- Node regression tests for source fidelity, passage boundaries, review failures, flexible lengths, sign-in drafts, pricing, and spending limits.
- Isolated PostgreSQL/PGlite migration checks: source references, public/private scope, invalidation, stable retry, and atomic reservations. The local vector operator is a cosine substitute; real pgvector requires production readback.
- Actual edge-handler tests with synthetic transport: account isolation, request idempotency, allowance enforcement, guide reading, and book completion including its new index checkpoint.
- Mobile browser checks for manual selection, automatic proposal evidence, editing, confirmation and sign-in recovery; synthetic account/API responses.
- Desktop rendering and production build.

Live deployment, full-index coverage and a real guide receipt are recorded separately after verification. No benchmark establishing recall at 300 books is claimed.
