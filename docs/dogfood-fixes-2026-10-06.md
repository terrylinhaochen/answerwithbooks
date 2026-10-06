# Dogfood remediation, October 6, 2026

Both reports were used as regression cases. This document records implemented behavior and separates unverified outcomes.

| Finding | Change | Evidence / boundary |
| --- | --- | --- |
| B1 broken install | Self-contained CLI/skill runtime and corpus. No server required for asking. | Exact documented GitHub npx command worked in an empty directory with an empty npm cache; installed skill ran successfully. |
| B2 mismatched package/docs | Website, README, CLI help, and skill use the pinned GitHub v0.1.3 release. | CLI commit 6039060; GitHub Actions run 37436524781 passed. Publishing npm is blocked by npm E401; npm 0.1.0 remains stale and is not the canonical install. |
| B3 approval dead end | Existing API page offers Request research access with a prefilled mail subject and required account/task details. | This opens the user's mail client. Approval is manual; public book skills and private uploads do not need research approval. API/Billing remain outside normal navigation. |
| B4 signup/consent | Create one goes to account signup. Newsletter makes only its own request. Added password setup/recovery, honest request-vs-delivery copy, confirmation resend cooldown. Terms/Privacy reflect current behavior. | Desktop/mobile browser tests verify separated calls and preserve aliases. Supabase accepts production recovery redirect. Real alias inbox delivery is unverified; no emails sent during this release acceptance. |
| B5 irrelevant/filler results | Both retrieval endpoints use the same conservative relevance floor, published answers only, sorted book scores, no on-demand filler generation. | Reported Mars/junk/France/injection/Bitcoin/deadline cases abstain; customer interviews, salary, validation, and Deep Work positive controls pass. English-only limitation is disclosed. |
| Input and toggle bugs | 400 malformed JSON, 64 KB body cap, 2,000-character query cap, validated source IDs and toggles honored. | CLI endpoint regressions pass; deployed worker also returns 400 for malformed JSON. |
| Question privacy | Queries are unsaved by default. Operator queue, saved-question ID lookup, signals, and mutations need an explicit token. Public content excludes drafts. | Unauthorized requests fail; explicit authenticated capture is tested. This release does not deploy a public CLI HTTP service. |
| Generated packaging | Readable skill names/descriptions, heading cleanup, exact extracted source bundled as skill/source.txt, citation explanation. | New and historical export-format tests pass. Real mobile browser ZIP download has the exact source and resolvable lines. Historical source claims are not silently rewritten. |
| Meaning drift | Section notes and final synthesis must pass a separate source-support check before acceptance. Generation prompts preserve prerequisites and modal strength. | Live original deadline fixture completes and retains clarification/recording rather than discarding an undated action. Model-based checks reduce risk; they are not a guarantee or a blind agent benchmark. |
| Smaller UI findings | Visible Speed read label, removed misleading copy arrow, signed-in upload status, explicit no-file error, visible onboarding controls and focus/scroll on step changes, profile shelf preference, private auth routes excluded from sitemap and analytics. | Responsive browser checks pass at 1440 and 390px. |

## Validation

- CLI: 9 tests including actual packed install, installed skill execution, local HTTP startup, both API contracts, privacy, invalid input, and useful retrieval controls; syntax and skill validation passed.
- Web pipeline: 15 processing/worker unit tests and 6 upstream Python adapter tests passed.
- Browser: account/newsletter separation, recovery requests, alias preservation, cooldown, native newsletter error/retry/rate-limit success, onboarding navigation, no overflow, and no-JavaScript newsletter fallback passed. Auth/email service responses were mocked for these consent tests.
- Source extraction: actual searchable PDF, Markdown, and text extraction; empty, oversized, too-short, and OCR-required files rejected before job creation. Backend creation was mocked for extraction tests; no provider requests were made by those tests.
- Live worker: real authentication, source upload, generation, cover, authorized export, cross-account rejection, three-book limit, same-source retry, and mobile ZIP download passed. Small original two-section source completed in 27 seconds. Worker receipt is in `verification/dogfood-2026-10-06/worker-and-download.json`.
- Test accounts, jobs, and stored fixtures were deleted. No real subscriber was emailed or changed.
- Astro build: 113 pages; product surface audit passed (46 public books, 6 task examples, 3 guides).

## Remaining boundaries

1. npm publication requires a publisher login. The pinned GitHub install is verified and usable now.
2. Mailbox delivery, including the evaluator's plus alias, needs an inbox-side retest. An accepted request is no longer called delivered.
3. Older generated statements remain the user's saved revision. Downloads repair packaging and include source evidence; they do not retroactively certify or regenerate old claims.
4. Retrieval is English lexical retrieval with conservative abstention, not multilingual semantic retrieval. Full independent agent behavior and broad mobile/topic-filter evaluation remain separate follow-up work.
