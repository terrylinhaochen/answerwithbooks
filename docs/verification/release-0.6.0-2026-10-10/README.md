# Answer with Books 0.6.0 release verification

The release adds managed one-guide/separate-books selection, local multi-source guides and incremental source updates, and initial local-workspace sync to the private library.

## Release artifacts

- [CLI 0.6.0 and package checksum](https://github.com/Crowdlisten/Crowdlisten_books/releases/tag/v0.6.0)
- Core commit: `6f159986fccf85e8b36c8a9f6e32f38c833f7c4d`.
- Website implementation: `1faf860`; merged with prior documentation in `6690ee9`.
- Migration: `20261010081943_book_agent_import.sql` applied and recorded exactly; import RPC is service-only and security-invoker.
- Deployed functions: `book-import`, `book-process`, `book-library`. Live processing health advertises combined-source support.
- Website build and Pages deployment passed at `de66bc3`, [run 38084934216](https://github.com/terrylinhaochen/answerwithbooks/actions/runs/38084934216). Live `/tools/` exposes both upload choices; live `/SKILL.md` points to 0.6.0; Mintlify documents the released workflow. The mobile browser regression passed against the deployed assets with a mocked backend.
- [Website deployment history](https://github.com/terrylinhaochen/answerwithbooks/actions/workflows/deploy.yml).

## Checked

46 CLI tests and 75 shared workflow regressions pass. Isolated PostgreSQL with pgvector covers concurrent import idempotence, owner isolation, citation hydration, both source sections in one guide, retrieval and zero generation usage. The shared test runner prints TAP on failures and uses the operating system temporary directory on macOS and Linux. Mintlify validation passes.

Authenticated production acceptance used the connected CLI account with public Smith text and synthetic source policies. Local completion automatically imported a private guide. Repeating the import returned the same book. The index embedded its section and hybrid retrieval returned source excerpts. A new process running the actual GitHub 0.6.0 package retrieved it. Production records confirmed zero model-usage and provider-operation rows for that import.

A second imported guide preserved conflicting daily and weekly source policies. Both were independently returned with their source filename, line range and citation. These are controlled content fixtures; this test does not score a model's ability to discover disagreements.

Real managed intake uploaded an originals archive and normalized combined text, persisted two source identities, produced a spending-limit quote, and stayed in staging with zero generation calls. No spending limit was accepted. Temporary acceptance books and source objects are removed after checking them.

## Boundaries

No new paid full managed conversion or billing settlement was performed. Automated compiler parity and existing processing/billing regressions do not replace that live check. Fresh-process CLI retrieval is proven; new-session harness discovery/selection is not. UI browser regression uses mocked authentication/backend; live backend intake and retrieval are checked separately with real CLI authentication.

Separate editorial-summary generation remains unfinished. Covers are not automatically generated for local imports. Arbitrary third-party skill packages and hosted sync of later local revisions are out of scope by user decision.

See [machine-readable results](results.json). No credentials or account identifiers are included.
