# Clear AI handoff and automatic long-book processing

2026-10-06. Local implementation on top of `fc6bb65`; production infrastructure deployment approval is still pending. This does not claim the live site has these changes.

## Customer experience

The homepage section immediately after “Turn what you read into how you work” now demonstrates the action with The Mom Test:

1. Edit a concrete task, such as planning customer-interview questions.
2. Inspect the complete prompt: the public editorial digest, instructions, and the task.
3. Copy it, open an AI chat, paste, and send. The response shown in the demo is explicitly illustrative, not a live or simulated provider run.

“Copy prompt for your AI” replaces “Copy to agent” on the main book, shelf, and skills surfaces. Helper text explains what is copied and the next action. Copy uses the clipboard; it does not connect an account, send a request to an AI provider, or install anything.

A short expandable explanation distinguishes the reusable download. Uploaded sources produce a `skill/` directory, with `SKILL.md`, on-demand references and `INSTALL.md`. Installing that package in a compatible agent makes it available for later tasks. Copying is the immediate chat workflow; installation is a separate, explicit action. Public editorial digests are not presented as complete source-derived skill packages.

## What upstream supports

Current upstream remains `e180fc46365e8c1aab0120778cc8a40b9515324b`. Its [`SKILL.md`, Step 2.6](https://github.com/virgiliojr94/book-to-skill/blob/e180fc46365e8c1aab0120778cc8a40b9515324b/SKILL.md#step-26--repl-style-access-for-large-books--50k-tokens) explicitly describes bounded, section-by-section access for large books. Its extraction code has no equivalent to our 1.2-million-character cap. It is an agent-directed workflow, not a hosted background processing service that can be deployed unchanged.

Tested the user's locally available **The 48 Laws of Power.pdf** with the actual upstream extractor in an isolated Python environment with pypdf. Results: 31,058,156 bytes, 476 pages, 235,518 words, 1,374,684 extracted characters, approximately 314,024 estimated tokens. No text was sent to a provider, and no book text or PDF was added to this repository.

The actual browser PDF.js/Pyodide path extracted 1,827,812 characters across 30,871 normalized lines, automatically arranged into 117 processing sections. The extractor outputs differ, including whitespace/layout choices. This verifies extraction and transport, not perfect OCR, layout reconstruction, or semantic completeness. Both exceed the old limit. The previous 60-section limit was a second independent blocker.

## Processing changes

- Six million extracted characters, up to 24 MB of UTF-8 extracted text, with the existing 50 MB original-file and 1,500 PDF-page limits. Limits remain finite; this is not an unlimited-document claim.
- Sources above one million characters use `prepare` → signed original/text uploads → `finalize`. The Edge Function JSON contains a manifest, hashes and headings, not the entire large text. Both uploads remain in the existing private bucket.
- Finalize verifies owner access, original hash, extracted-text byte count and hash, then normalizes and sections the saved text. It claims a lease before writing progress. Generation cannot run against the staging placeholder. Re-selecting the same source reuses the pending job.
- Source text is processed in bounded sections. Short incidental headings in large documents no longer force tiny work units. Dense headings fall back to size-based sections rather than rejecting a readable source. Every normalized source line remains in exactly one processing section; citations refer to the retained normalized text.
- The worker saves each section's notes. For more than twelve sections, it builds checked, bounded overview groups of twelve. Overview progress is saved separately and reused after interruption. The final synthesis reads these compact groups while the reader artifact and skill retain every original section note and source reference. No section is silently discarded to fit a model call.
- Long books still yield **one book, one skill, and one cover per original file**. Separate batch files remain separate jobs.
- The preflight UI explains automatic sectioning and background processing. The private reader distinguishes reading source sections from assembling the book-wide overview. Sources are uploaded before background generation; extraction and upload still require the browser to remain open.

Migrations and rollout: the queue migration remains required, followed by `20261007013000_long_book_processing.sql` (expanded text constraint, import manifest, saved overview notes). `scripts/setup-book-queue.py --apply` handles both, only after deployment approval. No production changes have been made. Deploy the worker/schema before the new upload frontend. A capability check explains an older server instead of blaming the user's valid file.

## Validation

- Exact PDF: actual browser parsing plus mocked private-storage/worker transport, original and extracted-text SHA-256 verification, every page marker, complete source-line coverage, and successful transition to a queued book. No real provider calls or storage uploads in that test.
- Actual Edge Function handler with networking disabled: an authored long source completes 77 sections, seven persisted overview groups, final assembly and a cover response using synthetic provider responses. The exported source equals the original extracted fixture and all section reference files are present. Corrupt text uploads and cross-account finalization are rejected; staging cannot be enqueued prematurely.
- Isolated PostgreSQL with the actual migrations: a 1.5-million-character source persists successfully. Existing lease, owner-isolation, quota, pause/retry and scheduler-wake tests remain in place. Hosted pg_net/cron behavior still requires deployment acceptance.
- Large-source unit tests retain final-line evidence, bound dense-heading fragmentation, validate overview references and reject failed fidelity checks or oversized overview outputs.
- Interactive demo: edited tasks appear in the copied prompt; full public digest is included; no AI request is made; denied clipboard access exposes a manual-copy fallback. Responsive screenshots and browser checks cover desktop and mobile.

Live provider generation of the user's copyrighted book was **not** run. The local tests establish extraction, source retention and orchestration; they do not claim a completed production conversion or a factual-quality evaluation of that book's generated skill.
