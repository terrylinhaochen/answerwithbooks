# Private library status and source identity

The private shelf refreshes every five seconds while visible, on focus, after uploads, and after account changes. Requests from a previous account cannot replace the current shelf. Failed refreshes keep the last visible state and report the refresh problem. Saved request cards update during the same refresh.

Private cards show the uploaded filename, processing-section count, and source-line count. Explicit chapter ranges in filenames are labeled as excerpts. Neither source length nor a successful conversion proves that an upload contains a complete published book. The API retains `source_kind: full-source` for compatibility with installed clients; its scope note explicitly means the uploaded source, which may be an excerpt.

Only exact extracted-text fingerprints group uploads. Ready results are preferred; other uploads remain available in an expandable history. Original files, generated packages, revisions, and billing receipts are preserved. Different editions, OCR variations, changed whitespace, and translations are not fuzzy-matched. Append/replacement revisions are not grouped as separate duplicate uploads.

Intake checks both the uploaded-file fingerprint and extracted-text fingerprint within the authenticated account before creating signed uploads or using a provider. Native extraction can compare text only after extraction; when it finds a completed match, it saves the original and pauses before generation. Price approval and manual resume reject an identical source that already has a completed package. This is not a global cache and never exposes another account's books.

Cover status is independent of book/skill readiness. A missing, skipped, pending, or failed cover is no longer labeled ready. Reading a private book page does not automatically enqueue a saved conversion.

The metadata migration backfills exact source hashes and compact counts. It retains the latest failure message and timestamp when a run enters failed/paused with an error; later retries preserve this diagnostic. Errors already cleared before this release cannot be reconstructed.

## Verification

- Unit tests: status/cover states, excerpt labels, grouping without deleting uploads.
- Actual handlers with all external HTTP intercepted: owner isolation, cross-format reuse, reuse with providers unavailable, blocking repeat billing/retry, native extraction duplicate pause, revision preservation.
- Isolated Postgres: migration/backfill, matching SHA-256, source counts, retained errors after retry, restricted trigger privileges, existing queue and revision checks.
- Browser with synthetic accounts and intercepted backend: live shelf refresh, duplicate history, excerpt/cover labels, mobile layout, sign-out clearing, read-only page loads.

No new hosted conversion or paid provider call is needed for these checks.

## Release acceptance — 2026-10-09

- 68 pipeline/unit checks passed, alongside all billing tests, both actual-handler suites, and isolated Postgres queue/revision/metadata tests.
- Production metadata migration and both Edge functions deployed successfully. Authenticated lookup against the existing full-book text returned its ready package; the API reported 117 sections, 35,100 lines and a ready cover. This acceptance used lookup/list only.
- Supabase security advisors reported no new findings; existing server-only tables without client policies and the pre-existing leaked-password-protection setting remain unchanged.
- Browser fixture checks passed on a fresh build with production public configuration. Private account data was not embedded in the test fixtures.
