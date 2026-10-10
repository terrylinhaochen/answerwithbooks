# Reusable book prompts

Status: documented on 2026-10-09. These files do not change the running generator.
The legacy digest template records the existing editorial approach. The v2
source-brief, digest and review templates are proposed inputs for the split
reader/agent pipeline in [the implementation plan](../../../docs/BOOK_EXPERIENCE_PLAN.md).

| Purpose | Prompt | Current executable source |
| --- | --- | --- |
| Public research brief | `researchPrompt` | `scripts/generate-book-wave.mjs` |
| Human-readable editorial digest | [editorial-digest-v1.md](./editorial-digest-v1.md) | `draftPrompt` and `repairPrompt` in that script |
| Brief from uploaded source evidence | [source-brief-v2.md](./source-brief-v2.md) | Proposed; not wired into hosted/local generation |
| Editorial digest from that brief | [reader-digest-v2.md](./reader-digest-v2.md) | Proposed; not wired into hosted/local generation |
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

Use one versioned prompt loader for hosted and customer-agent generation. Record
prompt ID, prompt-file SHA-256, editorial-spec SHA-256, model/provider, source hash,
source revision, evidence-brief hash, review result and token usage per artifact.
Do not silently replace the deployed prompts by editing this directory. Switch
versions deliberately after evaluation. Never label locally supplied review
reports as independent hosted verification.

Keep separate artifacts: `reader/digest.md` for the editorial page,
`reader/evidence-map.json` for its claim references, and `skill/` plus structured
chapter notes for retrieval and offline installation. Preserve legacy `book.md`
as a reference/export artifact during migration; never present concatenated
chapter notes as the finished editorial digest.

## Why two kinds of prompts

The old draft prompt targets approximately 1,500 words, paragraphs and idea-led
headings. The private renderer currently concatenates every section summary and
method into `book.md`. The distinction is purpose, not a demonstrated model-quality
ranking. Retain exhaustive source extraction for the agent, and use the editorial
contract to write the reader artifact from the same grounded evidence.
