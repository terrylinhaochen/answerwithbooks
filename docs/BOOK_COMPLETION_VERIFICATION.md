# Book completion release verification — October 8, 2026

GPT-5.4 mini is the selected hosted generation and review model. The full Smith acceptance run completed its reader, skill, cover and retrieval index. CLI 0.4.0 is published, installed and verified with a fresh consumer. The Gemini comparison was deferred by the user. This report distinguishes completed checks from accuracy and performance claims that the evidence does not establish.

## Closed workflow and implementation gaps

| Area | Implemented behavior | Evidence |
| --- | --- | --- |
| Selection and consent | Outside book recommendations are allowed. The guide asks a native multiple-choice selection, waits for a submitted response, then offers summary/skill processing. No automatic selection on timeout. | Published guide and CLI tests; previously submitted Smith selection authorizes this run. |
| Source intake | User-uploaded files, folders and quoted globs; lawful web copies remain an alternative. Files are separate by default; explicit `--combine` preserves originals and source boundaries in one package. | CLI source expansion, ZIP manifest and fresh-package tests. |
| Extraction | The pinned upstream book-to-skill adapter is retained; native Python avoids WASM startup when available, with a WASM fallback. | Full EPUB output exactly matches across both runtimes: 2,245,854 characters; 2.04 versus 6.31 seconds in one trial. [Receipt](verification/book-completion-2026-10-08/extraction-comparison.json). |
| Generation | Ordinary OpenAI Chat Completions plus structured schemas; Supabase owns scheduling, leases and saved work. Independent sections run at concurrency 3. Generation effort `none`, review effort `low`. | Actual worker tests plus deployed full run. No Agents SDK/API dependency. |
| Repair and recovery | Rejected drafts retain their findings and receive targeted corrections. Accepted work survives. Other available sections fill parallel slots. Review failures do not incur outage backoff; provider failures do. Five review failures stop safely; explicit retry preserves findings and resets its attempt budget. | Real HTTP-handler tests and production recovery during this run. |
| Long books | Twelve-section overview groups, legal processing-ID enums, bounded summaries, saved final synthesis, and explicit candidate-against-evidence review direction. | Full run: 117 accepted sections, 10 overviews, final synthesis accepted. Caught and fixed chapter-label confusion and reversed aggregate review during acceptance. |
| Outputs | One intake produces the web reader and a complete skill with chapter notes, glossary, patterns, cheatsheet, topic index, source map and original extracted citation text. Long reference files are paginated; the main SKILL.md stays small. | 315 exported files, 117 section files, 3,854-byte main skill; source hash equality and 4,989 citation-range bounds checked. |
| Covers | Independent leased queue; text can be downloaded/installed/searched during cover failures. `retry-cover` does not regenerate the book. | Live failed-cover browser fixture and full-book cover ready on its first cover attempt. |
| Usage | Owner-only saved token receipts price known text/image usage and explicitly separate unknown usage, service charges and customer pricing. | Full-run receipt: 331 calls; text $4.80926865 + image $0.022299 = **$4.83156765**. This includes acceptance-run repairs, excludes embeddings/infrastructure/taxes/unreported usage and is not a customer bill. Customer pricing is unconfigured. |
| Hosted activation | One local generic Answer With Books guide searches relevant methods across ready current private books; the current agent applies them. Book packages stay remote. No per-book clone/install is required. | Published installed runtime queried the completed book using hybrid retrieval. All 117 entries embedded, zero failed; market-extent and productivity sections ranked first and second. |
| Local activation | Optional `install-book` saves a complete account-scoped skill and source references. A new agent session may be required for automatic discovery; explicit file loading works immediately. | Published package download, actual personal skill installation and installed-source readback. Relevant chapter files and source excerpts were read to produce a specialization example. |
| Reader activation | The completed reader explains remote use, supplies a lightweight task prompt, and shows optional offline installation. | Astro build; release browser acceptance is recorded below. |
| Privacy and sessions | Owner/current-revision checks, revocable CLI sessions, bounded retrieval excerpts, source files private, rate limits and index leases. | Production cross-account status/export boundaries, no-match search, invalid/revoked sessions and temporary browser-account cleanup; local SQL tests include deletion/races/quotas. |

## Full source acceptance

[Sanitized full-run evidence](verification/book-completion-2026-10-08/full-run.json) records the text and image receipt, coverage and index outcome. The extracted source has 35,100 newline-based lines and SHA-256 `7e4feb57694c123215687cc4468a9a14671b0cf72b4d062737662dcec90b542f`. The export and installed copy match exactly.

The run started at 08:10:28 UTC and reached text-ready at 09:09:25 UTC: about **59 minutes including diagnosis, deployments and stopped time**. This is a recovery/acceptance run, not a steady-state speed benchmark. It does not establish that this system is faster or cheaper than upstream across books. The earlier mixed-model upstream comparison is not a controlled speedup measurement.

“117 sections” means all extraction units, including edition front/end matter, not 117 original chapters or an independently audited edition. The package retains that distinction. Citation bounds and automated review coverage do not prove that every factual claim is correct. Eight claim-level [regression cases](verification/book-completion-2026-10-08/review-calibration.json) and three aggregate [direction cases](verification/book-completion-2026-10-08/summary-calibration.json) passed with the selected mini reviewer; these are targeted tests, not general accuracy scores.

## Validation boundaries

- 58 pipeline tests and 38 CLI tests passed. Both workers type-check. The actual HTTP generation handler completed 77 synthetic sections, seven overview groups and a full bundle; the actual library handler tests passed.
- PostgreSQL plus pgvector tested claims, leases, owner boundaries, revisions, quotas, citation bounds, index recovery, usage privacy/cascades and independent covers. Synthetic 10,001-entry database searches took about 187–199 ms including process startup, excluding network/provider latency.
- A fresh consumer installed CLI 0.4.0 and retrieved hosted evidence. The existing personal installation was upgraded with a backup. The full Smith download and personal per-book installation succeeded.
- Production browser acceptance used a temporary authenticated account and a public-domain three-section fixture with a deliberately failed cover. Browser pairing, reader rendering, usage, download, desktop/mobile layout, logout and revoked-session rejection passed; the temporary account and fixture were removed. This fixture test is distinct from the actual 117-section user job checked through the CLI.
- Core release PR1, backend release PR1 and scheduling PR2 are merged. This completion PR contains the final reader/assembly fixes and this report. The backend worker has been deployed from the tested branch; GitHub Pages deploys the reader after merge. Final CI and live activation-card evidence belongs in the release receipt.

## How users activate books

With the generic skill installed and connected, ask:

> $answer-with-books Use The Wealth of Nations from my private library to help decide which responsibilities our team should specialize.

The local guide calls hosted retrieval, receives relevant methods and cited source excerpts, and the current agent applies them. A hosted book is stored knowledge, not an independently running agent. Multiple books are routed by the hosted retrieval layer instead of adding every full book to the prompt.

For offline or direct use, run `answer-with-books install-book BOOK_ID`. Use the returned local skill, or start a new session and ask the agent to use that book. No repository clone is needed. The local package includes the extracted source; keep it private unless redistribution is permitted.
