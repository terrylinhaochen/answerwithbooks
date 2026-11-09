# How guide retrieval and composition work

## Retrieval today

The normal website flow calls `suggestGuideBooks` with every eligible public book’s saved orientation and question contributions (current catalog cap: 100 books). A model recommends 1–3 books by meaning. Its prompt explicitly says these are starting points, not verified passage matches; it returns a gap when nothing fits. This fast suggestion step reads summaries, not entire books, and does not use a vector-similarity threshold.

After confirmation, `selectReading` reads the selected books’ saved section maps. These maps describe people, events, choices and outcomes with original line references. The model nominates up to eight candidate source ranges. It then reads the actual text in those ranges, with numbered lines and cumulative word counts, and chooses continuous excerpts with natural boundaries. It may use several excerpts from one book or omit a book. Two, three and five-plus passages are soft targets for short, medium and long readings; relevance outranks count. Resource ceilings still apply (eight passages, 110,000 source characters, duration-dependent upper word budgets).

The older queued discovery path scans book maps individually, compares candidate original scenes in batches, then proposes books for confirmation. It also skips irrelevant books; it no longer requires every selected book to contribute.

## The relevance rubric

There is no numerical relevance score or arbitrary similarity cutoff. Prompts ask:

1. Do the original events, decisions, consequences or tensions illuminate this specific question? Shared vocabulary is insufficient.
2. Does each excerpt contribute a distinct perspective, rather than repeat another passage?
3. Is the connection supported by the original, rather than manufactured in commentary?
4. Is the direction right—for example, receiving help versus providing help?
5. Are limitations and counterexamples represented honestly, rather than presented as universal advice?

These are model judgments, not a measured accuracy guarantee. The current guide exposed real failures: a truncated Fastenal excerpt, swapped commentary for two Shoe Dog excerpts, and overconfident connections. More explicit prompts improve the contract but need ongoing evaluation against examples readers flag.

## Text integrity and proofreading

Stored book text, source coordinates and hashes remain immutable. Edition-specific repairs are guarded by the uploaded PDF hash and exact original line hash. The Green repair manifest recovers missing ligatures directly from the PDF character mappings; it is not free-form spell correction.

A separate bounded proofreading call runs on selected excerpts before editorial writing. Its default model is `gpt-4.1-mini`, configurable with `BOOK_PROOFREAD_MODEL`. It proposes exact changes for missing ligatures, whitespace, line-wrap hyphens and obvious OCR I/vertical-bar confusion. Code rejects rewrites, unknown/ambiguous substrings and invalid indices. The repair set is bound to the excerpt hash. Ambiguous defects or apparently missing content return feedback for a fresh selection with more context, rather than invented text. The final reviewer sees both extracted and repaired versions.

This is excerpt proofreading, not an exhaustive proofread of every uploaded book. Proper names, ambiguous spelling and genuinely missing text still require source inspection. Mechanical page reflow is presentation-only, shared by HTML and Markdown.

## Building a learning sequence

The writer gets the question, selected originals and source-grounded book maps. Its prompt asks for a progression: introduction → scene setup → original passage → contribution and limits → connection to the next passage → synthesis. Setup identifies unfamiliar people, roles, relationships and stakes. Saved book overviews appear separately on source cards; those are reused, not generated anew.

Each editorial section must return the exact `sectionIndex` of its excerpt. Validation requires a one-to-one mapping and aligns by ID, preventing array-order swaps. The final source review checks relevance, fidelity, scene completeness, setup, coherence, redundancy and overclaiming. It can reject the reading and request a new selection; retries are bounded. A pass is still a single model’s judgment, not independent human certification.

This yields a guided reading, not yet a full syllabus. A stronger syllabus would explicitly name a learning objective, distinguish foundational scenes from contrasts, explain the progression, and include an optional application exercise and a later transfer check. Those learning-design features should be tested separately rather than implied by fluent prose.

## Verification for this change

- Checked the user-reported Richer, Wiser, Happier glyph defects against its PDF; recovered 1,761 exact matching damaged lines, including all six damaged lines in the cited excerpt.
- Checked Shoe Dog PDF page transitions 80→81 and 139→140: no missing words at the reported gaps.
- Extended the clipped Fastenal scene to its natural end and restored its earlier setup in the existing guide.
- Regression checks cover immutable source hashes, unsafe/ambiguous proofreading edits, model routing, page reflow, and commentary returned in reversed order.
