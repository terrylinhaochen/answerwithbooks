# Reader digest v2 — executable contract

Canonical instructions: [`book-reader-prompt.json`](../../../supabase/functions/_shared/book-reader-prompt.json). The prompt version and SHA-256 of the instruction string are recorded in new `reader/digest.json` artifacts. Do not maintain a second copy of the prompt here.

Both managed `book-process` and CLI 0.7.0 call `compileReader` in [`book-reader.mjs`](../../../supabase/functions/_shared/book-reader.mjs). The CLI bundles the same module and prompt through `build-processing-runtime.mjs`; its manifest records file hashes.

Input: title, author, original cited excerpts, source scope and deterministic length bounds. All extracted sections receive a bounded evidence budget (140,000 characters total; up to 14,000 per section). Gutenberg trailing licensing material is excluded from the reader evidence. Extraction notes remain complete and separately retrievable. The evidence selection is not proof of exhaustive editorial coverage.

Output: `{oneLiner, readIf, evidenceIds, sections:[{heading, paragraphs:[{text,evidenceIds}]}]}`. Each paragraph and metadata claim must cite supplied evidence IDs. Original prose uses idea-led headings rather than skill/template labels.

Source-dependent bounds: under 2,000 source words uses 1–3 sections and 15–650 digest words (the exact minimum scales with source length); under 10,000 uses 3–4 sections and 600–1,000 words; longer sources use 4–6 sections and 1,200–1,800 words. Bounds are mechanical checks, not quality scores. Unsupported padding is forbidden and source-review failure requests repair.

`book_reader_review` applies the existing cited-fidelity prompt to each paragraph and only its own original excerpts. It must return one supported check per claim. This model-assisted review is fallible, not independent factual verification. An editorial failure saves targeted feedback and leaves already compiled skill artifacts intact.

Fixed output paths: `reader/digest.md` (reader prose), `reader/digest.json` (metadata, paragraph mapping, prompt identity and review provenance), `reader/evidence.json` (original line coordinates). Legacy `book.md` remains a reference artifact, not the displayed digest. Customer-agent uploads use these same render/validation functions but receive `customer-agent` review provenance.
