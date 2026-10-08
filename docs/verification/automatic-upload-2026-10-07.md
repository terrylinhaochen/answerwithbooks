# Automatic source upload acceptance

Checked October 7, 2026 against a fresh production build served locally.

## Behavior

- The upload dialog has no extraction selector and uses one Create book & skill action.
- PDF.js inspects every page for technical structure; ordinary prose stays on the browser path, detected tables/equations/code use the existing Docling worker, and Kindle files use native conversion.
- Private cache lookup precedes parsing and upload, including native formats.
- Output settings and file requirements are collapsed. Privacy information stays visible.
- Native-reader unavailability is isolated per file; retry does not resubmit saved sources.

## Passed checks

- `node --test scripts/test-pdf-processing-route.mjs`: five routing cases covering ordinary prose, nested technical tags, aligned tables, two-column prose/page furniture, code and equations.
- `node scripts/test-source-upload.mjs`: real PDF.js/Python extraction for prose PDF, Markdown and text; drag/drop, batching, 12 MB PDF, exact 50 MB boundary, empty/short sources and OCR-required handling.
- `node scripts/test-book-parity-ui.mjs`: real technical PDF fixture detection, all three Kindle extensions, original-byte preservation, cache-before-native, native retry, mixed native/plain batch isolation, source revisions and explicit reviewed activation.
- `node scripts/test-book-cache-ui.mjs`: public/private reuse and same-batch deduplication.
- `node scripts/test-book-batch-ui.mjs`: single-action batch submission, isolated failures, advanced options, queue controls, saved analysis and reviewed export.
- `node scripts/test-book-upload-ui.mjs`: sign-in guard, collapsed optional controls and layout at 320, 390 and 1280 pixels.
- `npm run build`, `node scripts/check-product-surface.mjs`, `git diff --check`.
- Desktop and mobile screenshots visually reviewed.

## Evidence boundary

Browser tests mock authentication, processing APIs and storage responses. Real PDF parsing and the standard Python extraction/audit runtime are exercised where noted; no new model generation or real storage upload was performed for this UI change. Native conversion and generation code is unchanged. Its earlier live acceptance is recorded separately under `native-worker-2026-10-07/`. Routing is heuristic, not a guarantee that every technical layout is recognized; scanned PDFs still require OCR.
