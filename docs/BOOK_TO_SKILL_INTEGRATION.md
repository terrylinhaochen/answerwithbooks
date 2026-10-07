# Book uploads and companion skills

**Current architecture (October 7):** see [Source-based skills and revisions](BOOK_SOURCE_SKILLS.md) for the dedicated Docling/Calibre worker, account-scoped skill installation, and append/replace revisions. The dated architecture and acceptance below are historical and do not describe the new native path.

## Architecture

**2026-10-06 update:** the separate batch queue and expanded skill workflow are implemented locally, pending infrastructure deployment approval. See [the parity review](BOOK_TO_SKILL_PARITY.md) for the exact matrix, limitations, tests, and rollout order. The historical release evidence below describes the preceding live version.

The website uploads a full source into a private Supabase bucket and creates an owner-scoped processing job. `book-process` is a dedicated authenticated Edge Function. The browser extracts readable PDF pages with PDF.js, or uses the original upstream Python parsers for EPUB, DOCX, HTML, RTF, and text formats, retains the original file in private storage, and enqueues an owner-scoped job after the upload completes. The queue uses server-only claims and a protected scheduler, pending deployment. Source extraction/upload needs an open page; generation can then continue without it.

Each source section is distilled once into original notes with bounded source-line references. A shared pure compiler creates `book.md`, `skill/SKILL.md`, chapter reference files, patterns, cheatsheet, glossary, and provenance. The reader and skill use that same intermediate representation. Source sections are not presented as verified original chapter boundaries. Extraction completeness and model fidelity are explicitly unverified; outputs are drafts. A generated cover is a separate last step, so a failed cover does not discard the book or skill.

The UI is Select sources → Review extraction → Upload → Background queue → Your book. Each file becomes a separate job; analysis-only jobs can generate a book and skill later. No title search, cover identification, match confirmation, or cover picker. Metadata is inferred from the first source section. One Copy to agent prompt includes the readable artifact and all skill references. A ZIP preserves file paths for agent installation. Original sources and generated drafts are not published into the public catalog.

## Upstream reuse

Reference: https://github.com/virgiliojr94/book-to-skill at e180fc46365e8c1aab0120778cc8a40b9515324b (1.4.0), MIT licensed.

The integration now executes upstream code. Unmodified Python sources and tools are vendored with MIT attribution and SHA-256 checksums. The browser runs fixed adapter operations in an isolated, disposable Pyodide Web Worker; the native ingest/compile CLI calls the same adapter in Python. The runtime and source bundle are served from AWB's own origin. No book text is sent to a third-party extraction service. Original sources and extracted text are saved privately to AWB for generation.

| Upstream capability | AWB adaptation |
| --- | --- |
| EPUB, DOCX, HTML, RTF, text parsers | Original code runs in the upload worker; EPUB spine order and DOCX table order are retained. |
| PDF extraction and optional Docling | Browser retains PDF.js; native CLI uses upstream's dispatcher and available local dependencies. OCR remains external. |
| Invisible-character sanitizer | Original Python on extraction; server Unicode ranges generated from the same original function. |
| Chapter/structure detection and token estimates | Original functions analyze extraction. Validated numeric heading positions guide bounded processing sections; detection is explicitly provisional. |
| Agent generation workflow | Selected original philosophy, decision-cheatsheet priorities, and quality rules guide AWB's structured distillation. |
| Skill validator | Original validator checks exports and native compilation. Structural errors disable copy/download pending repair. |
| Generated-skill scanner | Original scanner runs before browser export and during CLI compilation; findings are visible and require explicit review before export. A tested port of the advisory content rules also gates the server export. |
| SKILL.md + chapters + patterns/glossary/cheatsheet | AWB's shared compiler creates these alongside the reader artifact, from one distillation. Source-supported decision rules appear in the cheatsheet. |
| Calibre / Kindle, folder/glob input, multi-book synthesis, agent installation | Not added to the website. Optional native single-file Calibre support is inherited when installed; no browser parity is claimed. |

Supported web inputs: PDF, EPUB, DOCX, RTF, HTML/HTM/XHTML, TXT/TEXT, MD/MARKDOWN, RST, ADOC/ASCIIDOC. Limits: 50 MB raw file, six million extracted characters, 512 processing sections. Archives are bounded before parsing (2,000 members, 100 MB expanded total, 12 MB per member, and compression-ratio checks). Scanned PDFs need OCR before upload. The original DOCX DTD/entity rejection remains active. These checks do not guarantee extraction completeness or semantic accuracy.

The Python runtime adds an initial download of roughly 14 MB and is loaded only for extraction or export validation. A fresh worker isolates each operation and terminates after 90 seconds. Book contents are never evaluated as code. The native adapter disables automatic dependency installation.

AWB continues to own authentication, private storage, resumable processing, book rendering, shelf placement, covers, and the single Copy to agent experience. Purpose and depth are upload controls; installation instructions are included in the download. Repository publishing and local OS commands are not performed by the website.

## Runtime and access

Project: yozeqanibszoxnowmvsm. Function: book-process. Bucket: private-books. Table: public.book_processing_jobs.

Server secrets: OPENAI_API_KEY; optional BOOK_PROCESSING_MODEL (default gpt-4.1-mini), BOOK_COVER_MODEL (default gpt-image-1.5). Never place provider or service-role keys in frontend configuration.

The function verifies the bearer token with Auth getUser and checks job ownership on every private action. Its gateway JWT check is off because authentication is handled in the function. Health returns only availability and public limits. Database reads use owner RLS. Clients cannot insert/update jobs or call the service-only quota RPC. Storage is private and clients receive signed upload/download URLs. The original-file hash is checked before processing. Leases and version guards prevent two tabs from advancing the same checkpoint concurrently. Ten new sources per user per rolling 24 hours after queue deployment; at most five attempts for a failed stage. Signed downloads expire after one hour.

Actions: health, create, enqueue, status, pause, retry, generate, analysis-export, export, process (legacy), delete, repair (operator), drain (private scheduler). Delete removes the source, cover, and job. Authenticated user generation and cover costs are paid by the configured provider account.

## CLI path

`npm run engine:ingest -- --book-id example --title "Example" --author "Author" --source /path/to/book.pdf` prepares a private `.book-processing/` job. An agent follows its PROCESS.md once, then `npm run engine:compile -- --job /path/to/job --distillation /path/to/distillation.json` creates both artifacts. CLI and hosted worker share validation and artifact rendering.

## Verification

`npm run test:book-processing` checks 8 integrity/compilation scenarios, including original upstream validation and decision-rule preservation. `node --test scripts/test-book-worker.mjs` checks chunk coverage, detected-heading boundaries, citation boundaries and portable handoff. `node scripts/test-book-upload-ui.mjs` checks desktop/mobile upload-only UI and real clipboard behavior with fallback. Hosted acceptance uses isolated synthetic accounts and an authored source fixture; distinguish these checks from a full-length book quality evaluation.

Release acceptance on 2026-10-05: 8 compiler integrity tests and 3 worker contract tests passed; the complete existing UI smoke suite passed, plus desktop/mobile upload and guide clipboard regressions. Two synthetic accounts verified worker/database/storage isolation. An authored Markdown source completed real provider-backed book, skill, and image generation, with fresh-client readback and ZIP validation. This does not certify full-length books, scans, or semantic accuracy across a corpus.

## Adaptation verification (2026-10-05)

The pinned upstream repository baseline passed 777 tests with 5 optional tests skipped, and `ruff check .` passed. AWB adapter tests cover EPUB reading order, DOCX paragraph/table order and entity rejection, HTML/RTF cleanup, archive limits, Unicode cleanup, fenced-heading exclusion, native dispatch, and original validation/scanning. `node scripts/test-upstream-browser.mjs` exercises those original Python modules in real Chrome. Use `AWB_TEST_ORIGIN` for a hosted runtime test. These are authored fixtures, not a full-length book quality benchmark.

Authenticated adaptation acceptance: an authored two-chapter EPUB completed real provider-backed extraction → distillation → book/skill → cover → fresh-page/fresh-client readback → clipboard → ZIP. Original upstream validation ran before export. A second synthetic account was denied access through the function, database, and storage. Production worker version 4 carries the adaptation. The built static site passed the format-worker suite and existing UI regressions.
