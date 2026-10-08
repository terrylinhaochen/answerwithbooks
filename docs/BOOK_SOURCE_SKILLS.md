# Source-based book skills and revisions

Updated October 7, 2026. This describes the implementation; deployment and live acceptance are recorded separately in `docs/verification/native-worker-2026-10-07/` and `docs/verification/agent-commands-2026-10-07/acceptance.json`.

## One private library, one discoverable skill per book

Uploads produce a private readable book, source-based skill package, and cover. A stable book ID identifies the book across immutable processing revisions. The account library lists only the current revision with its methods, tags, one-line description, and when to read it. The CLI uses multilingual semantic retrieval to propose relevant methods; the agent still decides applicability from the evidence and task.

`answer-with-books library install-book BOOK_ID` installs the complete current skill and its references. `answer-with-books library sync` updates managed skills from the signed-in account. Packages include `SKILL.md`, chapter references, topic index, patterns, cheatsheet, glossary, `source.txt`, source maps, and version metadata. Source citations resolve inside the installed package. Managed version directories are immutable; symlinks switch atomically after manifest/hash checks. Existing unmanaged or edited skills are not silently overwritten.

The 46 public-library entries remain editorial digests until their full sources are supplied and processed. They are not relabeled full-source skills. Acquiring and backfilling those sources was explicitly deferred. Uploaded/private packages do not become public automatically.

## Add a source or replace one

The private reader offers **Add source** and **Replace source**. A revision accepts one source at a time; ordinary batches still make separate books. Adding a source preserves earlier notes and source lines, analyzes the added material, and rebuilds the overview and package. Replacement processes a new source. Neither changes the current skill until the new revision is ready and the user reviews it and selects **Make current**.

The revision history retains the prior book, source, and artifacts. Pending revisions can be discarded after processing stops. A current revision with descendants cannot be deleted out from under their provenance. Database guards prevent activation, deletion, and concurrent append operations from racing. The CLI exposes `upload --book BOOK_ID --revision append|replace`, `revisions`, and `activate REVISION_ID --accept-review`.

Append is a source-preserving revision workflow, not an automatic reconciliation of contradictory claims. Users review changed methods and source evidence before activation. There is no free-form merge-conflict editor.

## Conversion and structure

The web uploader has one Create book & skill action and chooses extraction per file automatically. It checks the private cache before parsing, including PDF and Kindle sources. Ordinary PDFs, EPUB, DOCX, HTML, RTF, Markdown and text-family formats use browser extraction. PDF.js checks every page for structural tags and conservative table, equation, and code layout signals. Detected technical PDFs send the original private file to a dedicated native worker using Docling with table structure, code enrichment, and formula enrichment. DRM-free MOBI/AZW/AZW3 use the original upstream Calibre dispatcher on that worker. Generation continues after the upload finishes and the browser closes. Output mode, depth, and purpose remain under Customize the result; requirements are collapsed separately. Mixed batches route each file independently, and retries leave successfully saved sources alone.

The native worker checks original and extracted-file hashes, uses bounded leases and retries, and writes only to signed private storage locations. Provider and account credentials are not passed into converter subprocesses. Worker availability requires a recent heartbeat; the service starts only after actual Docling and Calibre fixture checks pass. It runs on its own instance with no inbound ports, separate from CrowdListen production compute.

Detected chapters retain source ranges independently of the smaller processing sections. The adapter adds conservative Roman-numeral/display-title detection. Labels are explicitly provisional. Deterministic code, table, and equation references preserve the extracted source text; model-generated notes cannot rewrite those references.

Extraction is not lossless PDF reconstruction. Layout classifiers can miss short code snippets or classify equations as headings. Scans need OCR first; automatic routing is not OCR. Routing heuristics can miss unusual technical layouts or send prose with structured material to Docling. The CLI still supports an explicit extraction override. Extremely wide extracted lines are normalized to the shared 1,000-character citation-line convention. Review extracted source and generated claims before relying on them. Enabling Docling does not guarantee every table, equation, or chapter is recognized.

## Limits and deliberate differences

- Up to ten separate files per batch, 50 MB each; ten new sources per account per rolling 24 hours.
- Six million extracted characters, 24 MB UTF-8 text, 1,500 PDF pages, and 512 processing sections per book. An appended revision must fit the combined limit.
- Private upload hashes reuse existing eligible jobs. A composite append revision is not incorrectly reused as if it contained only its newest source.
- Browser folder traversal/globs, optional public GitHub publishing, arbitrary external-analysis import, and a graphical merge editor are not implemented. Local upstream workflows remain available for those tasks.
- Generated output is reviewed for structural integrity and source support, but these checks are not a guarantee of factual or behavioral quality. Separate-book batches are the requested product choice, rather than upstream's combined-collection default.

## Upstream reuse

MIT-licensed `virgiliojr94/book-to-skill` v1.4.0, commit `e180fc46365e8c1aab0120778cc8a40b9515324b`, remains vendored unmodified with checksums and attribution. Original parsers, sanitation, chapter detection, token estimates, validation, scanning, and Calibre dispatch are executed. Our adapter configures Docling and adds chapter mapping; our application supplies private storage, accounts, queueing, revisions, generation, reader, covers, and installation/synchronization.

This is parity for the requested source-processing and reusable-skill workflows, with the explicit differences above. It is not a claim that every optional upstream workflow or all model outputs are equivalent.

## Verification

Automated coverage includes the original extraction/validation adapter, exact technical-reference preservation, long books, source append/replace and citation offsets, atomic activation, delete guards, actual PostgreSQL concurrency/RLS, actual Edge request handlers, browser native routing and revision review, managed CLI installation and account isolation.

Live CLI acceptance uses two original short sources and temporary confirmed users without sending email. It checks actual provider generation, real semantic retrieval, install/sync, append, explicit activation, retained old files, revoked credentials, and cross-account denial. Native converter and API receipts distinguish local contract tests, host model execution, and live upload-to-package acceptance. These fixtures are not a quality benchmark for all full-length books.
