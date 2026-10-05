# Book uploads and companion skills

## Shipped architecture

The website uploads a full source into a private Supabase bucket and creates an owner-scoped processing job. `book-process` is a dedicated authenticated Edge Function. The browser extracts every readable PDF page (or reads TXT/Markdown), retains the original file in private storage, and drives checkpointed processing requests. Keep the book page open; closing it saves progress and reopening resumes. This version is not an unattended background queue.

Each source section is distilled once into original notes with bounded source-line references. A shared pure compiler creates `book.md`, `skill/SKILL.md`, chapter reference files, patterns, cheatsheet, glossary, and provenance. The reader and skill use that same intermediate representation. Source sections are not presented as verified original chapter boundaries. Extraction completeness and model fidelity are explicitly unverified; outputs are drafts. A generated cover is a separate last step, so a failed cover does not discard the book or skill.

The UI is Upload → Processing → Your book. No title search, cover identification, match confirmation, or cover picker. Metadata is inferred from the first source section. One Copy to agent prompt includes the readable artifact and all skill references. A ZIP preserves file paths for agent installation. Original sources and generated drafts are not published into the public catalog.

## Upstream reuse

Reference: https://github.com/virgiliojr94/book-to-skill at c108d25b0cb58e1bdc361f3de02ed9f37075152f (1.4.0), MIT licensed.

We have NOT vendored or executed upstream code. We adapted its entry skill + chapter references + patterns/glossary/cheatsheet organization. Its Python CLI extracts files; an agent follows its skill workflow to generate skills. It does not supply our hosted upload UI, private storage, resumable jobs, AWB book renderer, or cover generation.

Upstream accepts PDF, EPUB, DOCX, RTF, TXT/TEXT, Markdown, RST, AsciiDoc, HTML/XHTML and Kindle files through Calibre. Folders and globs are supported by its CLI. This release accepts only PDF, TXT and Markdown, up to 10 MB / 1.2 million extracted characters. Scanned PDFs require OCR first. No EPUB, DOCX, Kindle, folder, or batch parity is claimed.

## Runtime and access

Project: yozeqanibszoxnowmvsm. Function: book-process. Bucket: private-books. Table: public.book_processing_jobs.

Server secrets: OPENAI_API_KEY; optional BOOK_PROCESSING_MODEL (default gpt-4.1-mini), BOOK_COVER_MODEL (default gpt-image-1.5). Never place provider or service-role keys in frontend configuration.

The function verifies the bearer token with Auth getUser and checks job ownership on every private action. Its gateway JWT check is off because authentication is handled in the function. Health returns only availability and public limits. Database reads use owner RLS. Clients cannot insert/update jobs or call the service-only quota RPC. Storage is private and clients receive signed upload/download URLs. The original-file hash is checked before processing. Leases and version guards prevent two tabs from advancing the same checkpoint concurrently. Three new sources per user per day; at most five attempts for a failed stage. Signed downloads expire after one hour.

Actions: health, create, status, process, delete. Delete removes the source, cover, and job. Authenticated user generation and cover costs are paid by the configured provider account.

## CLI path

`npm run engine:ingest -- --book-id example --title "Example" --author "Author" --source /path/to/book.pdf` prepares a private `.book-processing/` job. An agent follows its PROCESS.md once, then `npm run engine:compile -- --job /path/to/job --distillation /path/to/distillation.json` creates both artifacts. CLI and hosted worker share validation and artifact rendering.

## Verification

`npm run test:book-processing` checks 8 integrity/compilation scenarios. `node --test scripts/test-book-worker.mjs` checks chunk coverage, citation boundaries and portable handoff. `node scripts/test-book-upload-ui.mjs` checks desktop/mobile upload-only UI and real clipboard behavior with fallback. Hosted acceptance uses isolated synthetic accounts and an authored source fixture; distinguish these checks from a full-length book quality evaluation.

Release acceptance on 2026-10-05: 8 compiler integrity tests and 3 worker contract tests passed; the complete existing UI smoke suite passed, plus desktop/mobile upload and guide clipboard regressions. Two synthetic accounts verified worker/database/storage isolation. An authored Markdown source completed real provider-backed book, skill, and image generation, with fresh-client readback and ZIP validation. This does not certify full-length books, scans, or semantic accuracy across a corpus.
