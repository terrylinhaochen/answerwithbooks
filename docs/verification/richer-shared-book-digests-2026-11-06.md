# Richer shared-book digests — November 6, 2026

The public upload branch previously asked for a brief summary using chapter maps. It now uses the existing reader-digest-v2 editorial prompt and compileReader: full books get 4–6 idea-led sections and 1,200–1,800 words, with original-text evidence and paragraph-level review. A writing budget gives the model a midpoint target and paragraph allocation. Length repairs use the retained editorial workflow’s complete-rewrite approach, expanding supported explanations instead of applying the factual-review instruction to narrow every draft. Short sources retain their proportional bounds.

Reviewed editorial artifacts are checkpointed before orientation/questions. Public map.summary and book.md contain the rich digest. The catalog orientation remains short. Existing book maps, full source, questions and covers are retained during operator refresh; a replacement publishes atomically only after review. Refresh requires the queue runner or operator, and skips already upgraded books. Rejected drafts persist repair feedback; source repairs patch only rejected paragraphs or metadata and preserve approved prose; failed refreshes leave the published summary intact.

Shared book pages render Markdown H2 blocks as text-safe h2 nodes and body blocks as text-safe paragraphs, inside the existing BookReadingPanel. No arbitrary HTML parsing.

## Verification

- 33 reader/guide unit tests passed, including original-text checks, invalid evidence rejection, shared artifact composition, refresh preservation and scene evidence.
- Actual HTTP handler mock suite passed: authentication, isolation, saved repairs, staged processing, billing, public map → editorial → orientation checkpoints, refresh authorization and idempotent skip.
- Hosted book-process v47 deployed by patching only three files in the fetched production v42 bundle; unrelated local edits were not deployed. Canonical reader prompt unchanged. Editorial generation uses BOOK_READER_REASONING_EFFORT (default low); mapping and review retain their existing settings.
- Live How to Be Rich refresh succeeded; local browser reads the hosted result: 1,549 words including orientation, six sections, no browser errors. Heading typography matches The Structure of Scientific Revolutions at 1280px and 390px. Three questions remain; no horizontal overflow.
- Frontend renderer change is verified on local preview; no frontend production deployment in this task.
- Deno static typecheck reports existing Supabase query typing errors throughout this untyped handler (never table/column types). Runtime handler tests and live refresh passed; do not describe the full typecheck as passing.

All five previously finished public books were refreshed and read back successfully: Shoe Dog, Open, Invention: A Life, How to Be Rich, and The Presentation Secrets of Steve Jobs. The final database check shows each ready, with reviewed reader/digest.json and no remaining generation feedback. Original processing for the other eight uploads continues separately using the new digest phase.
