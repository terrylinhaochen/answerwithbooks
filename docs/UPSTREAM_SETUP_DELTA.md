# book-to-skill vs Answer with Books: implementation delta

Audited October 7, 2026 (America/Los_Angeles). This compares the actual upstream skill, our deployed website/extractor, the published CLI, and the local development skill. It is not a claim of equal generation quality.

## Conclusion

We already execute the upstream parsers, sanitizer, structure heuristics, validator, and scanner. The major gaps are an integrated native technical-document path, source-aware updates, original-chapter structure, and an easy transition from a saved book to a persistently installed book skill. The public shelf is a lighter editorial-digest product. Semantic retrieval is our extension, currently local and unpublished.

This audit also reproduced integration limits that conflict with our newer long-book support. Those are more urgent than adding optional upstream features.

## Verified versions and reuse

- Upstream master: [`e180fc4`, v1.4.0](https://github.com/virgiliojr94/book-to-skill/tree/e180fc46365e8c1aab0120778cc8a40b9515324b), verified through GitHub API on the audit date.
- All **22 vendored files** match UPSTREAM.json checksums and the installed upstream copy byte-for-byte. No upstream-version delta was found in that selected code.
- Live `https://answerwithbooks.com/book-runtime/upstream.json` matches the local bundle exactly and contains the same pin, including our adapter.
- Website commit `87459c0b67fd434e996ffa5e122e85b14f728248`: [GitHub Pages workflow succeeded](https://github.com/terrylinhaochen/answerwithbooks/actions/runs/37578558621). Public worker health confirms 50 MB files, six million characters, ten-file batches, and staged/background processing. This is not a fresh authenticated end-to-end acceptance run.
- npm latest is **0.2.0**, gitHead `6b4df3a296e0938c3c704dc3a96faea500e939f7`. Local `match`, semantic chapter selection, and broader automatic-activation instructions are not in that release.
- [Machine-readable receipt](verification/upstream-setup-delta-2026-10-07/receipt.json).

## Capability delta

| Area | Upstream | Our setup | Assessment |
|---|---|---|---|
| Prose formats | Local Python parsers for EPUB, DOCX, HTML, RTF, Markdown/text and related extensions | Original parsers run inside Pyodide; PDF uses PDF.js | Substantial direct reuse; not a parallel prose-parser rewrite |
| Technical PDFs | Optional Docling and PDF inspection; technical chapter template preserves code, commands and tables | Browser/agent CLI use PDF.js text extraction; native adapter calls upstream with `text` hardcoded. No integrated technical-mode choice; schema lacks dedicated code/table fields | Real gap; vendored code alone does not activate dependencies or preserve technical structure |
| Kindle formats | MOBI/AZW/AZW3 through installed Calibre | Website and published agent upload reject these extensions. Developer native dispatcher can use installed Calibre | Hosted/agent-upload gap, not total absence of upstream code |
| OCR | Text extraction can reject scans; no automatic general-purpose OCR parity to inherit | Searchable PDFs required; scans need OCR first | Shared limitation; OCR would be an additional capability |
| Full conversion | User's host agent follows SKILL.md and writes a reusable skill | Hosted model distills numbered source sections; shared compiler writes digest and skill; cover generated separately | Implemented differently; host-model generation remains available only in developer ingest/compile flow |
| Analysis first | Analyze-only and generation from previous analysis | Website supports saved analysis and generation from it | Mostly present on web; CLI upload hardcodes `mode: full`, and agent-token actions do not expose generate/pause/retry |
| External analysis import | Agent can use supplied prior analysis | Reuses only the job's saved analysis | Missing external-analysis import |
| Depth and purpose | Study/reference, text/technical, purpose-guided generation | Study/reference and purpose controls exist, with upstream text-depth guidance | Partial; technical content type and technical depth are absent |
| Original chapter mapping | Agent reads structure and generates files per chapter; automatic detector is fallible | Processes size/heading-bounded units, labels them source sections, and always reports unverified original chapter coverage | Intentional honesty but less faithful navigation; original chapter → sections mapping is missing |
| Core skill content | Master SKILL.md contains selected core frameworks plus indexes | Master SKILL.md mainly contains thesis, instructions and indexes; actionable rules reside in reference files | Structural similarity, different initial context. Need extra reads to reach methods |
| Patterns/glossary/cheatsheet | Distinct chapter and supporting references | Same families exist; long references are paginated, source citations bundled | Already implemented. Our patterns largely repeat all ideas; no measured quality equivalence |
| Multi-source input | Files, folders and globs; combine sources into one skill | Up to ten selected/dropped files create separate jobs/books/skills; folders rejected | Separate outputs are the user's explicit choice. Folder traversal and optional collection synthesis are absent |
| Update/fold-in | Merge new sources into an existing skill and refresh references/indexes | No user append-source, conflict merge, or source-revision workflow. Fidelity repair is an operator repair, not fold-in | Real gap |
| Reuse | Checks filename/hash and extraction mode before resuming extraction | Owner-scoped original-file hash reuses the existing job. Public filename/title match can reuse an editorial digest | Different cache scope. Existing job options are preserved; same-title matching is not edition identity |
| Install generated book | Writes host-discoverable book skill, with host-specific path/link handling | ZIP plus INSTALL.md instructions; no first-class install/sync-one-private-book command | Main harness-experience gap. Installing answer-with-books installs the library connector, not every book as its own skill |
| Multi-agent setup | Host-aware generated-skill paths and verification guidance | Website has platform choices for installing the generic connector; book ZIP documents several paths | Partially present. No demonstrated automatic private-skill installation, custom-profile verification, or all-host acceptance |
| Copy prompt | Installed skill reads selected files on demand | Clipboard copies digest and all generated skill notes into a prompt; no persistent skill installation, and no raw citation source in the normal clipboard payload | Deliberate convenience path, not equivalent to installed skill. Source-line verification needs the downloaded source or private CLI evidence |
| Public books | Skill conversion works from provided source | 46 catalog books have editorial digests; full uploaded sources produce deeper private packages | Product distinction, not full-source skill parity for every public title |
| Retrieval | Host chooses relevant chapter by reasoning over its index | Published 0.2.0 uses lexical retrieval. Local development adds multilingual candidate matching, agent applicability reasoning, and explicit chapter reads | Our extension; unpublished. Upstream is not a drop-in vector retrieval library |
| Sharing/publishing | Optional host-agent GitHub publication workflow | Shelf/link/image sharing exists, but no generated-skill GitHub publishing | Optional gap; public shelf sharing is a different feature |
| Product services | Primarily local document-to-skill workflow | Authentication, private source storage, persistent queue, retries, covers, reader, shelf, source hashes and line citations | Our additions |

## Concrete findings from code and reproductions

### P0: Web validation caps packages at 100 files

`scripts/book-adapter/adapter.py:115` rejects a files dictionary over 100 entries. A supported long book can have up to 512 processing sections, plus supporting reference pages. `src/lib/private-book.ts:10–22` disables both Copy and Download until this validator succeeds; `paint()` passes stored artifacts to it at line 70.

Reproduced: one master plus 100 short chapter files fails with `Invalid skill bundle.` The original upstream scanner accepts that same package (its own file cap is 1,000). This is an AWB adapter limit, not an upstream rejection. The live extractor bundle contains the identical adapter. No claim is made that a specific user's production book currently exceeds the cap.

### P0: Native compilation caps the bundled source at 500,000 characters

The same adapter rejects any included `skill/` file over 500,000 characters (`adapter.py:123`). The native compiler explicitly includes `skill/source.txt` before validation (`src/lib/book-processing.mjs:60`). A 500,001-character plain source reproduces `Invalid skill reference.`; upstream's advisory scanner does not reject this text source.

**Scope correction:** the normal web reader validates stored artifacts without source.txt. Web export adds source.txt afterward in `book-export.mjs:11`, so this source-size limit does **not** establish a web-download failure merely because a source exceeds 500,000 characters. It blocks the native compiler and any full-bundle validation through the adapter. The 100-file limit above is the confirmed web-gate mismatch. The per-file cap can also affect an unusually large generated reference, but that was not reproduced through live generation.

### P1: Automatic book selection loses useful information

`book-artifacts.mjs:61` creates a book-specific `readIf` description, but `book-export.mjs:10` overwrites it with a generic instruction to use the book when relevant. Reproduced with a concrete interview-method description: the exported description loses the method-specific trigger language. This is information loss; its effect on activation accuracy has not been independently benchmarked.

Separately, the private list API returns title, author and status, but no methods, topics, thesis or applicability summary (`book-process/index.ts:101`). The local semantic matcher's private-book candidates therefore rely largely on title and author. Semantic chapter matching becomes available after a book is selected, but better library-level discovery needs richer private-book metadata.

### P1: Source sections do not preserve original chapter identity

Our adapter inherits the standalone-Roman-numeral detector gap. On the tested Bennett source, it returns zero headings and zero chapters; the production splitter makes **five source sections for twelve original chapters**, retaining all normalized lines. Text retention is not the same as chapter fidelity. An agent following upstream's whole workflow can recover the chapters by reading the contents; our hosted pipeline lacks that explicit reconstruction stage.

The earlier upstream batch-count bug is not directly imported into our normal batching, because each uploaded file is processed separately. Keep that product choice rather than introducing a combined-source bug in pursuit of numerical parity.

### P1: Model workflow is an adaptation, not the upstream generator

Our per-section prompt retains at most five ideas, uses 24K-character input units, and synthesizes an overview through groups of twelve for long sources. It adds a second model-assisted fidelity check. It does not execute upstream's entire generation workflow verbatim. The schema captures practical ideas, conditions, anti-patterns and worked examples, but has no typed code, formula or reference-table representation. Quality and full-book fidelity require comparison, not just equal filenames.

### P2: Documentation has stale status markers

`vendor/book-to-skill/README.AWB.md` still names old pin `c108d25...`; UPSTREAM.json and actual code correctly use `e180fc4...`. The opening of BOOK_TO_SKILL_INTEGRATION.md still describes the queue as pending despite the later recorded release and live health. These are documentation drift, not evidence of missing deployments.

## Recommended order

1. Align adapter validation with supported book sizes and package counts, preserving bounds and advisory checks; regression-test actual browser gating and native compile.
2. Finish the installed-skill path: preserve method-specific descriptions; add an explicit way to install or sync one downloaded private book to the chosen agent; keep Copy prompt as the lightweight alternative.
3. Add private-book applicability metadata, test fresh-agent relevance/abstention, then publish the local semantic retrieval and broader activation changes. Do not call local code shipped.
4. Recover original chapter identity, retain section-to-chapter/source mapping, and compare conditional-rule fidelity using the same source and questions across both generators.
5. Add a native technical parser route and optional Calibre support where useful; do not label extracted prose as preserved tables/code.
6. Add update/fold-in and source revision handling. Leave separate batch output as the default. Optional publishing/collection synthesis can follow actual demand.

Already implemented features should stay in place: batch queue, cached originals, analysis-first website flow, source-backed examples, citations, reader/skill shared generation, and covers. There is no reason to replace these with a wholesale copy of the upstream repository.

## Evidence and source pointers

- [Local reproductions](verification/upstream-setup-delta-2026-10-07/reproductions.json), [chapter/description results](verification/upstream-setup-delta-2026-10-07/compiler-deltas.json), and [reproduction script](verification/upstream-setup-delta-2026-10-07/reproduce.py).
- [Upstream skill, pinned](https://github.com/virgiliojr94/book-to-skill/blob/e180fc46365e8c1aab0120778cc8a40b9515324b/SKILL.md).
- [Adapter](../scripts/book-adapter/adapter.py), [section processing](../supabase/functions/_shared/book-sections.mjs), [distillation](../supabase/functions/_shared/book-distillation.mjs), [compiler](../supabase/functions/_shared/book-artifacts.mjs), [export](../supabase/functions/_shared/book-export.mjs), [reader gate](../src/lib/private-book.ts).
- [Earlier hosted acceptance and limitations](releases/2026-10-06-book-processing.md); [earlier parity review](BOOK_TO_SKILL_PARITY.md).

This audit added documentation and evidence only. It did not fix, publish, or deploy runtime changes. No private source, authentication credential, or user record was accessed for the reproductions.
