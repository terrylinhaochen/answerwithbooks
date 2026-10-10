# Reusable book prompts

Status: reader generation wired on 2026-10-10. The public shelf retains its historical editorial prompt. Private managed generation and CLI 0.7.0 now use the executable v2 reader prompt described below. Proposed source-brief and broader editorial-review templates remain design references, not deployed stages.

| Purpose | Prompt | Current executable source |
| --- | --- | --- |
| Public research brief | `researchPrompt` | `scripts/generate-book-wave.mjs` |
| Human-readable editorial digest | [editorial-digest-v1.md](./editorial-digest-v1.md) | `draftPrompt` and `repairPrompt` in that script |
| Brief from uploaded source evidence | [source-brief-v2.md](./source-brief-v2.md) | Proposed; not wired into hosted/local generation |
| Editorial digest from original cited excerpts | [reader-digest-v2.md](./reader-digest-v2.md) | `book-reader.mjs` and canonical `book-reader-prompt.json`; shared by managed and local routes |
| Editorial and source review | [reader-review-v2.md](./reader-review-v2.md) | Proposed; retain current cited-claim checks too |
| Agent methods and reference extraction | `distillSection` system prompt | `supabase/functions/_shared/book-distillation.mjs` |
| Whole-source metadata and thesis | `compileDistillation` synthesis prompt | Same module; this is not an editorial-digest prompt |
| Agent fidelity checks | `citedFidelityInstructions`, `summaryFidelityInstructions` | `supabase/functions/_shared/book-fidelity.mjs` |
| Applying retrieved evidence to a task | `bookAgentPrompt` and retrieval guidance | `supabase/functions/_shared/book-handoff.mjs`, `book-library.mjs` |

The editorial contract lives in `docs/EDITORIAL_STYLE.md` and
`content-engine/CONTENT_GENERATION_SPEC.md`. Templates use `{{variable}}` markers;
input evidence must be passed as data, never interpolated into a higher-trust
instruction message. None of these templates grants permission to publish a
private source or initiate a paid generation call.

## Integration contract

The shared reader module records prompt version, instruction SHA-256, source hash, paragraph evidence IDs, source line coordinates and review provenance. Managed provider/model/token receipts remain in the existing usage ledger. Separate editorial-spec and evidence-brief hashes are not currently emitted.
Do not silently replace the deployed prompts by editing this directory. Switch
versions deliberately after evaluation. Never label locally supplied review
reports as independent hosted verification.

Keep separate artifacts: `reader/digest.md` for the editorial page,
`reader/evidence.json` for its claim references, and `skill/` plus structured
chapter notes for retrieval and offline installation. Preserve legacy `book.md`
as a reference/export artifact during migration; never present concatenated
chapter notes as the finished editorial digest.

## Why two kinds of prompts

The old draft prompt targets approximately 1,500 words, paragraphs and idea-led
headings. The earlier private renderer displayed the concatenated section notes in `book.md`; the reader now displays the separate `reader/digest.md`. The distinction is purpose, not a demonstrated model-quality
ranking. Retain exhaustive source extraction for the agent, and use the editorial
contract to write the reader artifact from the same grounded evidence.
