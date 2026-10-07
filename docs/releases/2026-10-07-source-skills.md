# October 7: source skills, revisions, and hosted conversion

The source-processing release adds an account-scoped current book library, individually installable full-source skills, managed library synchronization, append/replace revisions with explicit review and activation, provisional source-chapter maps, hosted Docling technical PDF extraction, and DRM-free Kindle conversion through Calibre. Ordinary upload batches remain separate books and skills. Existing private source hashes reuse saved processing where appropriate.

The 46 public books remain editorial digests. Their full-source acquisition and backfill is deferred, and no claim of full-source public packages is made.

## Release evidence

- [Real account/CLI workflow](../verification/agent-commands-2026-10-07/acceptance.json): browser pairing, separate uploads, actual generation, semantic retrieval, individual installation, sync, append revision, activation, old-version preservation, revocation, and account isolation.
- [Native production acceptance](../verification/native-worker-2026-10-07/acceptance.json): actual private PDF and MOBI uploads through the dedicated converter and production generation to book, skill, cover, and complete source package. Temporary confirmed accounts were cleaned up; no email was sent.
- [Worker deployment](../verification/native-worker-2026-10-07/host.json) and [runtime/models](../verification/native-worker-2026-10-07/runtime-models.json): strict PDF/table/code/equation, MOBI and AZW3 converter tests, deployed artifact hash, runtime pins, and final service health.
- [Local and browser checks](../verification/native-worker-2026-10-07/local-checks.json): fresh static build, mobile, native routing, revision discard/review/activation, agent selection, and clipboard behavior. Browser processing responses are mocked; native and CLI receipts above exercise the actual backend.
- [CLI release](../verification/native-worker-2026-10-07/cli-release.json): default branch/tag, passing GitHub CI, public asset checksum, and a cold installation from the actual download URL.

## Installing the release

Version 0.3.0 is published as a [GitHub release](https://github.com/Crowdlisten/Crowdlisten_books/releases/tag/v0.3.0). Its package was downloaded and installed from an empty npm cache:

```sh
npx --yes https://github.com/Crowdlisten/Crowdlisten_books/releases/download/v0.3.0/answer-with-books-0.3.0.tgz install --skill --api
```

npm registry publication requires a new account verification and remains pending; registry latest was still 0.2.0 at release. Website commands, the generic skill, and the CLI's printed follow-up commands use the working GitHub package URL consistently. The website's static deployment is verified by the GitHub Pages workflow for the commit containing this document; a local build alone is not production deployment evidence.

## Practical boundaries

Read [the current architecture and parity differences](../BOOK_SOURCE_SKILLS.md) for limits and supported paths. Technical PDFs use CPU inference and can take several minutes; they are not equivalent in latency to text extraction. Native attempts have a 20-minute converter timeout and bounded retries. Layout recognition and generated interpretation remain fallible: short code snippets and nearby equations were misclassified in one fixture, while the representative technical fixture passed. Scans need OCR first, and DRM removal is not supported.

The worker uses its own fixed-CPU instance and encrypted configuration. It does not run on or alter CrowdListen production compute. Database changes are additive. The current skill remains usable while a revision is processing and until the reviewed revision is activated.
