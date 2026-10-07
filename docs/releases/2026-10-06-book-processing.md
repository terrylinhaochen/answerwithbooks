# Book processing and skill demo release · October 6, 2026

## Scope

This release includes the full pending branch after `333a64e`: separate batch uploads, long-source staging and sectioned generation, saved-book reuse, clearer AI prompt actions, the single animated list/ask/apply conversation, and matching cream-panel book jackets with visible page edges.

The website is published by the GitHub Pages workflow for this commit on `main`. Match the deployed workflow SHA to the Git history when auditing the release; pushing alone is not deployment evidence.

## Production backend

- Supabase project `yozeqanibszoxnowmvsm`; `book-process` version 11 is active.
- Recorded migrations: `20261007003000_book_processing_queue` and `20261007013000_long_book_processing`.
- Dedicated Vault/Edge Function runner credential configured without exposing it. The one-minute `answerwithbooks-processing` cron job is active and recorded successful executions. Workers also wake the next queued step directly.
- Existing authentication configuration preserved: user requests validate their JWT inside the handler and restrict access to the owner. Queue requests require the separate runner credential. Anonymous status returned 401, invalid user JWT 401, invalid runner credential 403, and malformed JSON 400.
- Health reports 10 files per batch, 50 MB per original file, six million extracted characters, background processing, and staged uploads. The storage bucket remains private with its 50 MB limit.
- The queue setup initially failed because Supabase's read-only role cannot decrypt Vault entries. The setup script now performs that SELECT using the operator role; no secret value is logged or committed.

## Acceptance

[Machine-readable receipt](../verification/book-processing-2026-10-06/acceptance.json).

The real acceptance test used the built local release frontend connected to the deployed production worker and storage. Two short original Markdown sources were uploaded as one batch, then the browser was closed. Both generated separate books, skills, and covers without browser-driven processing. A fresh browser rendered the private reader, loaded the cover, copied the AI prompt, and downloaded a ZIP containing the cited source and skill files. Re-selecting identical bytes with a different filename reused the existing book without upload or generation. A second account could not read the jobs, database rows, or source files. All temporary accounts and files were removed. No emails were sent.

The first test attempt expected a transient upload-dialog success message, but a fully successful batch redirects to `/processing/`. The test was corrected to inspect that queue; it did not require a product-code change.

The first Pages build stopped before publishing because Deno tried to resolve the worker’s exact Supabase SDK version from Astro’s npm installation. CI now uses Deno’s separate dependency cache (`--node-modules-dir=none`), the verified Deno 2.8.3 runtime, and a committed dependency lock. The handler checks passed with a fresh cache before rerunning CI.

Local release checks also passed:

- 27 Node processing, fidelity, cache, option, and long-book tests; 8 original Python adapter tests.
- Actual Deno handler tests with provider and storage responses intercepted, including 77 sections and seven persisted overview groups.
- Actual migration SQL in isolated PostgreSQL: four global claims, two per owner, lease recovery, pause/backoff, quota, owner isolation, and large source persistence.
- Browser batch, cache, agent-demo, responsive, reduced-motion, no-JavaScript, and rendered-product checks; authentication template checks; live signup routing without an email.
- Astro build: 114 pages.

Repeat the opt-in hosted acceptance from the checkout with `AWB_LIVE_QUEUE_TEST=1 node scripts/test-book-queue-live.mjs`. It uses operator credentials from the existing local Supabase login, creates temporary test accounts, makes real provider calls for two short sources and covers, and cleans up. `AWB_TEST_ORIGIN` can point it at the deployed site.

## Limits

The authored demo makes no live AI requests. Public shelf reuse provides saved editorial digests; uploaded sources produce the fuller downloadable skill. The live acceptance used short original text, not the user's full copyrighted PDF or a factual-quality benchmark. Long-book orchestration has full-source fixture coverage and real browser extraction evidence; the user's full book was not generated during release. Native-only MOBI/Calibre, advanced PDF layout, and update/fold-in gaps remain documented in the parity review.
