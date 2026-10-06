# Book-to-skill parity review and separate batch uploads

Reviewed 2026-10-06 against upstream `e180fc46365e8c1aab0120778cc8a40b9515324b` (v1.4.0), https://github.com/virgiliojr94/book-to-skill. This is a code comparison, not a claim of equal output quality.

**Release status: implemented and tested locally; not deployed.** Production remains at the previous release. Activating the queue requires approval for the production migration, Vault/function runner credential, and scheduler. The scheduler allows provider charges to continue after a browser closes. No real provider calls or emails were made during this change's tests.

## What changed

- Select or drop up to ten files, each up to 50 MB. Each file produces a separate book and skill, per the user's decision. Review word/token estimates before generation. Invalid files and per-file failures do not discard valid uploads.
- After upload, jobs persist in an owner-scoped queue. A queue page and the private reader expose progress, pause, and resume. Closing the browser after upload does not need to stop generation once the scheduler is deployed.
- Bounded claims: four workers globally, two per owner, a 140-second lease, delayed retries, and a stop after five unsuccessful attempts. Ten new sources per rolling 24 hours; duplicate originals reuse their existing job. One source remains limited to 1.2 million extracted characters and 60 processing sections.
- Choose full generation or analysis first, study or reference depth, and a purpose. Analysis is downloadable with its cited source. Generating from saved analysis reuses section notes instead of extracting and analyzing again.
- Added an alphabetical topic index, source-supported anti-patterns and worked examples, and installation instructions. Large supporting files are divided into on-demand reference files without deleting entries. Copy-to-agent remains a portable context prompt; installed skills use on-demand files.
- Original upstream validation still runs in Python in the browser. Flagged passages now require explicit review before copying/downloading. A tested JavaScript port of the upstream advisory content rules also gates the server export route. Factual fidelity remains a separate, fallible model-assisted check.
- Refreshed the pinned upstream code and checksums. This imports upstream's new structural-heading filtering, Gujarati/Odia heading support, DOCX ordered block extraction, and additional invisible-character filtering. The browser still uses the upstream stdlib DOCX path; the ordered python-docx improvement applies to native extraction.

## Capability matrix

“Local” below means implemented here but awaiting deployment. “Existing” describes the preceding implementation, not a new live verification.

| Capability | Upstream behavior / evidence | Answer with Books status |
| --- | --- | --- |
| PDF, EPUB, DOCX, HTML, RTF, text, Markdown, RST, AsciiDoc | `book_to_skill/parsers/`, `utils.py` | Existing: original Python parsers except PDF.js for browser PDF extraction. |
| MOBI, AZW, AZW3 | `parsers/calibre.py`; requires local Calibre | **Web gap.** Native upstream dispatcher is vendored, but these uploads need a native converter deployment or explicit agent-side conversion. |
| Technical PDF layout, tables, code | `parsers/pdf.py`; optional Docling / PDF inspector | **Web gap.** Browser text extraction cannot promise preserved layout/code/table structure. Native dependencies and deployment are still needed. |
| Scanned PDFs | OCR first | Same constraint. Upstream does not provide automatic general-purpose OCR as part of this workflow. |
| File/folder/glob/list input | `resolve_inputs` and source aggregation in `utils.py` | **Local: multiple selected/dropped files.** Folder traversal/glob syntax remains an agent/local capability. |
| Combine sources into one skill | Multi-source extraction and merged chapter indexing | **Deliberate difference:** user selected separate books and skills for batches. No combined collection skill is claimed. |
| Preflight | source fingerprints, token estimates, structure | **Local: review before processing.** Word/token/heading estimates; not a price guarantee. Images/layout loss and unknown extraction completeness remain limitations. |
| Analyze only | `SKILL.md`, workflow modes | **Local:** analysis persists with source-backed section notes, ideas, examples and anti-patterns. No book/skill/cover is generated until requested. |
| Generate from prior analysis | `SKILL.md`, workflow modes | **Local:** reuse the job's saved analysis. Importing arbitrary externally generated analysis is not supported. |
| Update / fold into an existing skill | `SKILL.md`, “Update / fold-in” | **Open gap:** no browser merge editor, conflict handling, or append-source revision workflow. Existing source-fidelity repair preserves old artifacts but is not fold-in. |
| Purpose, study/reference depth | `SKILL.md`, purpose/depth guidance | **Local:** explicit controls and generation guidance. Exact word/token targets are guidance, not guaranteed output quality or hard token metering. |
| Frameworks / decision rules / mental models | `SKILL.md`, extraction guidance | Existing structured ideas and decision rules; purpose now informs extraction. Every retained item needs source references. |
| Anti-patterns and worked examples | `SKILL.md`, chapter structure | **Local:** typed, source-bounded fields checked by the fidelity pass. No invented example is required to fill a quota. |
| Topic and chapter indexes | `SKILL.md`, generated skill structure | **Local:** alphabetical framework/concept index points to source section files. Section IDs are not asserted to be original chapters. |
| Small core, on-demand references | `SKILL.md`, token budgets | **Local improvement:** long patterns/glossary/cheatsheet files are paginated, and a long chapter index moves to a linked file. Budgets use character heuristics, not exact model tokens; a single entry remains whole. Clipboard mode deliberately includes full context. |
| Structural validation and advisory review | `tools/validate_skill.py`, `tools/scan_generated_skill.py` | **Local improvement:** original Python + explicit reader acknowledgment, plus matching server content rules. Scanner findings can be legitimate quotations; acknowledgment is not proof of safety or truth. |
| Installable skill | `SKILL.md`, installation instructions | **Local improvement:** archive includes `INSTALL.md`, all reference files, readable skill name, and private `source.txt` for citations. Host-specific installation paths documented; no host runtime was launched during these tests. |
| Skill-only archive | Upstream primarily outputs a skill folder | Complete archive contains an independently installable `skill/` folder; a separate skill-only download button is not present. |
| Optional GitHub publishing | Agent workflow; private by default, explicit publish | **Not implemented in the website.** Generated private source bundles are never automatically published. |
| Crash recovery and batch failure isolation | source fingerprints and resumable local workflow | **Local:** database leases, per-file retries, pause/resume, protected scheduler wake-ups. Source extraction/upload still requires the page to stay open until upload is done. |
| Books, covers, shelf, account isolation | Outside upstream's skill-only workflow | Existing Answer with Books features retained; the same checked section notes feed both reader and skill. |

**Full parity is not achieved yet.** Native conversion needs a hosting decision. Fold-in/revision editing and optional publishing remain separate implementation work. Separate batch output is the requested product choice, not an accidental attempt to emulate upstream's combined-source mode.

## Queue deployment

Files: `supabase/migrations/20261007003000_book_processing_queue.sql`, `supabase/functions/book-process/index.ts`, `scripts/setup-book-queue.py`.

1. Review and approve the infrastructure activation. `python3 scripts/setup-book-queue.py` prints the plan without accessing credentials or changing anything.
2. After approval, `python3 scripts/setup-book-queue.py --apply` installs the migration and records it atomically, enables pg_cron/pg_net, stores a dedicated runner token in Vault, and configures the same token as `BOOK_QUEUE_RUNNER_SECRET` in the Edge Function. It reuses an existing runner token and skips an already recorded migration.
3. Deploy `book-process` with `supabase functions deploy book-process --project-ref yozeqanibszoxnowmvsm --use-api --no-verify-jwt`. The function validates owner tokens itself; drain is restricted to the dedicated queue credential. The gateway setting is unchanged from the existing deployment.
4. Run a synthetic authenticated background-processing acceptance case, with the browser closed after upload, and verify artifacts and source access from a fresh owner client. Check that another account cannot read or mutate the job. No email is necessary.
5. Deploy the static frontend only after the new worker/schema are ready. Old single-upload clients retain the explicit `process` path during rollout.
6. Verify the live UI, `cron.job`, queue completion and error handling. Disabling `answerwithbooks-processing` stops scheduled recovery; pause queued rows before turning off all background work, because active workers can also wake the next job. Do not drop the additive columns to roll back the UI.

The database wake-up uses pg_net after the transaction commits. The one-minute cron is recovery, not a browser polling loop. No source content, user session token, or service-role key is embedded in the cron command. Drain responses expose only job ID/status, not artifacts.

## Verification completed locally

- Python extraction adapter: 8 tests, including original parser behavior, archive bounds, and 50 MB inputs.
- Node compilation, worker contracts and parity: 22 tests. JavaScript advisory rule IDs/line positions agree with the original Python scanner on a seeded fixture.
- Actual Deno request handler, with network disabled and synthetic HTTP dependencies: authentication, JSON errors, source upload gate, analysis, reuse, cover, private exports, review gate, pause during provider failure, retry/backoff, and legacy client compatibility.
- Isolated PostgreSQL 14 using the actual migration/claim functions: concurrent claims, capacity, expired/stale leases, pause/backoff, attempt limit, owner RLS, RPC privileges, duplicate reuse and daily cap. pg_net/Vault/cron are local recording stubs in this test; hosted scheduling is **not verified**.
- Real Chrome/Pyodide/PDF.js: mixed batch upload, failed-file isolation, preflight, separate jobs, option persistence, mobile queue, pause/resume, analysis-to-generation UI, original advisory scan and accepted ZIP export. Storage/job/provider responses are mocked in these UI tests.
- Build and rendered product catalog checks. Responsive checks at 320, 390 and 1280 px. No full-length book quality evaluation or live background provider run yet.
