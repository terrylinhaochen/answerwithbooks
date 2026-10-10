# Book workflow evaluation and capability design

## Evidence and goal

The supplied experience is upstream book-to-skill, running extraction locally and using the current agent for interpretation. The saved test report and installed Smith package corroborate its claimed layout and edition scope; this evaluation does not rerun or take credit for the reported 808 upstream tests. The edition is Jonathan Bennett's modernization, Book I only. No PDF contents have been copied into this repository.

The product goal is one intake producing a reader digest and reusable knowledge skill, with managed generation as the recommended route and bring-your-own-agent as the alternative. Both should use the same output contract and private retrieval. The UI and agent offer one guide or separate books. Multiple sources can form one guide; they must retain distinct source identities, scopes, citations and disagreements. This last requirement came from the current user request, not an example in the pasted transcript.

## Executable acceptance

`../core` must be the matching CLI checkout. From web, with Node 22:

```sh
node scripts/eval-book-flow.mjs
```

The runner executes local/managed prompt parity, real text extraction, package/installation, source normalization, cited-review repairs, import authentication/retry, retrieval and metered-billing unit tests. Responses are controlled fixtures, deliberately not a model-quality score. It writes TAP and machine-readable status in `docs/verification/book-flow-2026-10-10/`.

For real PostgreSQL + pgvector integration, run the Node suite first to produce the import fixtures, then:

```sh
BOOK_LIBRARY_DB_TEST=1 BOOK_AGENT_IMPORT_DB_TEST=1 PGVECTOR_TEST_ROOT=/path/to/pgvector python3 scripts/test-book-queue-db.py
```

That suite verifies import idempotence, per-owner permissions, both sections of one combined guide, existing citation hydration, vector/keyword indexing infrastructure, revision behavior and zero text-generation usage records on import. It is an isolated database, not a hosted acceptance test. Embedding provider availability, live token settlement and fresh-session harness activation remain separate checks.

## Experience cases and quality gate

`scripts/fixtures/book-flow-eval/cases.json` versions 16 cases, labels their provenance and separates automated checks, semantic judgments, fresh-client checks and missing features. It includes file-name correction, edition coverage, progressive disclosure, LLM-specialization analogy, external-source attribution, tutoring, multi-source disagreement, resume/repair, private sync and managed parity.

For real model evaluation, run the same cases and prompt revision for managed and own-agent routes, three repeats each. Retain source hashes, exact requests, responses, model/provider IDs, latency, usage and price date. Blind the independent judge to route/model; score fidelity, scope/attribution, usefulness and progressive disclosure from 1–5. Require every score >=4 and no invented citations, wrong scope, hidden disagreements or private-data disclosure. Calibrate the judge with deliberately bad answers. A missing judgment is `not_run`, never a pass. A regex or passing JSON schema cannot establish semantic quality.

Do not silently use another provider or expand the earlier cumulative evaluation budget. No new provider charges were made by this workflow suite. Prior open-model evaluations did not establish quality parity; this suite does not overturn that finding.

## What changed

- Local preparation accepts up to ten files, directories or quoted globs with an explicit `--combine TITLE`.
- Both routes normalize each extracted source before assigning collection coordinates; long lines and CRLF cannot shift the next source's citations.
- Correct source headings are passed to section detection. Managed preparation now persists the source manifest through finalization instead of dropping it.
- Every source retains filename, original fingerprint and combined-source line range; originals stay in the local workspace or managed upload archive. Fingerprints supplied by a customer are provenance declarations, not proof of authorship or authenticity.
- Local and managed use the same collection guidance, section/review/synthesis prompts and compiler. Collection titles are not replaced by the first document's inferred title.
- BYOA import validates declared source ranges, persists them and reconstructs source attribution. Hosted retrieval includes the matching source names and line ranges alongside cited evidence.
- Import does not execute uploaded instructions or accept client review claims as server certification. It does not incur hosted text or cover generation.

## Capability matrix

| Capability | Current evidence | Remaining requirement |
|---|---|---|
| Local extraction/generation/review/resume | Automated fixture + real text extraction | Broad PDF/OCR/technical corpus testing; semantic quality |
| One skill, chapter/topic notes, glossary/patterns/cheatsheet | Local install and package tests | Fresh-session harness discovery/selection |
| Multiple sources → one guide | Local + managed compiler parity; live managed two-source intake and private retrieval attribution | New paid conversion and genuine model disagreement test |
| Local workspace → private retrieval | Deployed import endpoint/migration; live private import, idempotence and retrieval; zero generation usage | Broad corpus and semantic quality |
| Managed spending limits | Existing metered-billing regressions | Paid live run settlement, not covered by isolated tests |
| Hosted activation | Live owner-scoped retrieval; methods/citations read by the published 0.6.0 CLI in a fresh process | New harness session discovery/selection |
| Append/replace hosted source | Existing revision/ownership/citation tests | Browser-to-server acceptance after release |
| Add sources to existing local guide | Released in CLI 0.6.0 and regression-tested | Hosted sync of later local revisions is out of scope |
| Import upstream/manual skill packages | Out of scope by user decision | No implementation planned |
| Editorial reader digest separate from skill | Prompt design exists; runtime still uses reference-style book.md | Wire editorial generation/review into both routes and reader UI |
| Analyze-only / resume analysis | Managed analysis exists | Local analyze-only and continuation UX parity |
| Cover | Existing separate hosted image pipeline | Optional approved cover for imported guide; import currently has none |
| Book I edition scope | Installed upstream artifact clearly records it | Explicit edition/coverage metadata in AWB intake and quality eval |

## Target experience

1. Choose sources or upload files. If more than one is selected, offer **one guide** versus **separate books**, with one-guide title and purpose. Preserve an already explicit choice. Verify the actual edition/body scope before generation.
2. Offer **Managed (recommended)** or **Bring your own agent**. Managed shows a spending ceiling and waits for acceptance. BYOA chooses **private library** or **device only**. Source upload must not publish to the public catalog.
3. Extract once, record source metadata, generate source-specific knowledge notes and cross-source synthesis. Preserve disagreements; distinguish source instructions from derived applications. Separate editorial digest from skill extraction.
4. Complete and validate; sync automatically if private library was selected. Import retries reuse the same identity and do not repeat generation. Use the AWB workspace as the canonical record; manually edited package files are not imported.
5. One generic AWB skill discovers hosted books/guides, retrieves relevant methods and excerpts, and lets the user's current agent reason with them. No remote SKILL.md execution occurs. Offline use installs the generated package as one local skill.
6. Adding/replacing sources creates a revision of the same guide. Keep old citations stable on append, rerun only affected extraction/notes and regenerate synthesis/indexes. Local fold-in is implemented. Private-library sync is a one-time handoff; syncing later local revisions is out of scope by user decision.

## Prompt ownership

Runtime knowledge-engineering prompts: `_shared/book-distillation.mjs`, `_shared/book-fidelity.mjs`, `_shared/book-overview.mjs`. Multi-source guidance: `_shared/book-collections.mjs`. CLI assets are generated with `core/scripts/build-processing-runtime.mjs`, with hashes in `core/assets/processing/manifest.json`; the new eval compares actual requests byte-for-byte.

Editorial reference: `content-engine/prompts/book-digest/editorial-digest-v1.md`. Candidate reader contract: `reader-digest-v2.md`, with evidence-brief proposal `source-brief-v2.md`. These are different purposes from a skill and must not be substituted by concatenating chapter methods. Reader-v2 is not yet runtime-wired.

## Release boundary

CLI 0.6.0 is published. The private-import migration and `book-import`, `book-process`, and `book-library` functions are deployed. Authenticated production checks cover initial private sync, idempotent retry, hybrid retrieval with citations and distinct source attribution, and managed combined-source staging through its spending-limit quote. A fresh process using the GitHub release package retrieved the imported guide. Generated test content is controlled fixture content; these checks do not establish model quality.

See [0.6.0 release verification](verification/release-0.6.0-2026-10-10/README.md) for deployment and test evidence. No new paid end-to-end managed conversion was run in this release acceptance. Separate editorial generation, broad corpus quality, and fresh-session harness discovery remain unverified or unfinished as shown above. Later local revisions remain local by user decision.
