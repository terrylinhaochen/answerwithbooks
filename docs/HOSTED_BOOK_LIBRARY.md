# Hosted generation and private-library retrieval

The hosted workers and retrieval/completion migrations were deployed on October 8, 2026. CLI 0.4.0 is published and installed; fresh-client retrieval, live account isolation, browser pairing, failed-cover exports, usage display and mobile layout passed. The full 117-section Smith acceptance run is documented separately in the completion verification report.

## How generation works

Supabase owns the durable job queue, leases, retry/backoff, section progress, revision activation, and artifact storage. The worker makes ordinary HTTPS requests to OpenAI Chat Completions with structured JSON schemas. This is not the Agents SDK, Assistants API, or a hosted agent session. Our code selects the next step and validates/compiles the result. A source section has a generation call followed by a cited-claim review call. Completed sections feed synthesis and its review; long books also have bounded overview groups. Deterministic compilation creates the book reader and skill files. An Images API call supplies the cover.

Following model selection, the repository default is now `gpt-5.4-mini` for both generation and review, with reasoning effort `none` for generation and `low` for review, matching the completed benchmark runs. Explicit deployment settings still override these defaults. Production is configured to these selected settings. Generation and review have independent `BOOK_PROCESSING_MODEL`, `BOOK_REVIEW_MODEL`, `BOOK_REASONING_EFFORT`, and `BOOK_REVIEW_REASONING_EFFORT` settings. Models beginning `gemini-` use Google's fixed OpenAI-compatible endpoint and `GEMINI_API_KEY`; OpenAI models use only `OPENAI_API_KEY`. Cover generation still requires OpenAI. The Gemini adapter is contract-tested but live Gemini generation is unverified because the available Google credential was rejected.

`BOOK_SECTION_CONCURRENCY=1|2|3` controls parallel sections inside one book; the library default remains **1**, while production is explicitly configured to **3**. The existing queue permits four books globally and two per account. With concurrency 3, there can be twelve simultaneous section requests globally; budget for provider RPM/TPM limits before enabling it. Each section's review waits for its generation. Final synthesis waits for every section. The 140-second book lease retains the existing two 60-second provider-call envelope. A failed sibling does not discard paid, reviewed successes: they are persisted under the lease, cursor remains at the first gap, and retries skip accepted sections. Pause and stale-lease checks remain in place.

## Cheap and fast model experiment

All rows use the same 39,877-character, three-section public-domain Smith source and the same generation/compiler/review code. There are no automatic benchmark retries. These are pipeline outcomes, not general model intelligence rankings. Automatic source checks themselves can be mistaken.

| Model and settings | Section concurrency | Time | Estimated provider cost | Outcome |
| --- | ---: | ---: | ---: | --- |
| GPT-5.4 nano, generation none / review low | 3 | 30.8 s | $0.0225 | Source checks rejected two sections; incomplete |
| GPT-5.4 mini, none / low | 3 | 20.9 s | $0.0803 | Eight calls; all model checks passed |
| GPT-5.5, none / low | 3 | 51.2 s | $0.5381 | Source checks rejected two sections; incomplete |
| Gemini 2.5 Flash-Lite | 3 | — | Unknown | Provider rejected credential; no valid timing comparison |
| Gemini 3.5 Flash-Lite | 3 | — | Unknown | Provider rejected credential; no valid timing comparison |
| GPT-5.4 mini, none / low, repeat | 1 | 41.8 s | $0.0581 | Source check stopped after two accepted sections |
| GPT-5.4 mini, none / low, repeat | 3 | 23.1 s | $0.0695 | Eight calls; all model checks passed |

Costs use returned input/output/cache usage and [official standard rates](https://developers.openai.com/api/docs/pricing), verified in the official page's pricing data on October 8, 2026. Output usage already includes reasoning tokens. Mini: $0.75/$0.075/$4.50 per million input/cached/output tokens; Nano: $0.20/$0.02/$1.25; GPT-5.5: $5/$0.50/$30. These are provider estimates, not invoices or customer charges. They exclude cover generation and infrastructure and must not be presented as prices for a full book. A rejected response with no usage is unknown, not a measured zero-cost generation.

**Mini is the deployed default; this is not a claim of complete quality validation.** It completed two parallel runs in 21–23 seconds, but the sequential run failed a source check. A Codex source spot-check of the first accepted run found that its pin-factory example drops “when they exerted themselves” from the twelve-pounds/day claim, and a derived transport recommendation overgeneralizes the historical water-carriage argument. Its automatic review accepted those claims. The repeated run avoids the numeric pin claim, but a few spot-checks are not a full quality evaluation. No human review is claimed. Nano's reviewer sometimes demanded explicit author prescriptions even for correctly marked derived applications; review rejection alone is not ground truth.

The failed sequential run is not a valid successful-runtime baseline, so **no measured 2×/3× speedup is claimed**. The old AWB versus upstream trial also mixed models, outputs, and orchestration. Parallel sections shorten independent work; they do not make extraction, final synthesis, or covers parallel or free. Further model selection needs multiple source genres and a calibrated claim-level evaluation, including judge false positives and review misses.

Receipts: [model results](verification/book-routing-2026-10-08/model-results.json). The harness records requested/actual model, elapsed time, usage, source hash, and pipeline hashes without source contents or credentials. Reproduce with `scripts/benchmark-book-models.mjs --source EXTRACTED_SAMPLE --output NEW_DIRECTORY --profiles 5.4-mini,5.4-nano,5.5 --concurrency 3 --run`; omit `--run` for a dry run. Keep keys in the subprocess environment.

## One local guide; hosted evidence on demand

The user can say “Use my books to help me design this team” or mention `$answer-with-books`. The generic local guide routes the task; the current agent writes the answer. It does not need a locally installed skill for every book, a repository clone, or another hosted generation call for each answer.

```text
User's task
  -> one local Answer With Books skill
  -> authenticated book-library search
  -> account's current, ready chapter-method index
  -> up to six chapter matches from at most three books
  -> exact bounded source citations and derived-application labels
  -> current agent judges relevance and applies the methods
```

CLI 0.4.0 provides `search "QUESTION" --json`, `match --private`, and `ask --private [--book ID]`. Search is one client request. Public `match` remains a local embedding workflow. `ask --book ID --chapters RETURNED_CHAPTER_PATH` remains available when the agent needs more evidence. Individual local book installations are optional for favorite books and offline use; the full folder includes `SKILL.md`, chapter notes, glossary, patterns, cheatsheet, provenance, and citation source. Listing/searching does not install a skill.

CLI 0.4.0 contains the new search command. The installed guide checks `--help` and describes the legacy fallback for older installations. An unavailable endpoint is reported rather than silently substituting a public shelf or another account.

## Retrieval, privacy, and cost

- PostgreSQL indexes generated chapter summaries/methods using English full-text search plus `text-embedding-3-small`, reduced to 512 dimensions. Reciprocal-rank fusion combines up to 30 lexical and 30 semantic candidates, returning 24 candidates for the Edge selector. The final payload contains at most six chapters, at most three books, and at most three chapters per book unless a single book was explicitly selected.
- Vectors are ranked **after filtering the owner and current ready revisions**. This uses exact pgvector search rather than a global approximate index whose post-filter can drop an account's best matches. A 1,000-book synthetic test is an initial scale check, not an unlimited-library performance claim; larger libraries need further profiling and possibly partitioned ANN.
- PostgreSQL extracts bounded, numbered citation excerpts before sending results to Edge. The full book is not exported to the client or copied to Edge for a search. Each chapter gets at most six excerpts and a 3,000-character excerpt budget, with explicit truncation. Notes also have bounded fields; `chapter_path` permits deeper retrieval. Search operates at chapter level; a bounded shortlist is not complete chapter coverage.
- The authenticated session supplies the owner ID. Index tables and RPCs are service-only. Search, hydration, revision switches, pending deletion, and cascading deletion enforce ownership/current-state boundaries. Results use `Cache-Control: no-store`. Questions are sent to the embedding provider but are not stored by this service. Embedding access is not a new grant to use other users' books.
- New/changed ready books get lexical entries transactionally. A separate durable queue embeds up to 16 sections per call, at most two active batches globally and one per account, with 90-second leases, a 30-second provider timeout, backoff and a five-attempt stop. Hash/lease guards reject stale writes. Indexing never blocks generation or the cover. Existing books are backfilled lexically by the migration; paid embeddings wait for the separately enabled runner URL.
- Query embedding is one small call with an eight-second timeout; no hosted generative model is invoked by search. Thirty searches per account per minute are allowed. If no embeddings are ready or the provider fails, results disclose keyword-only coverage. Similarity is a candidate signal; the agent must reject unrelated results rather than treating the nearest book as an answer.
- Embeddings cost $0.02 per million input tokens at the verified [standard rate](https://developers.openai.com/api/docs/pricing). The live fixture embedded nine chapter/distractor entries and six queries in one call: 3,472 tokens, about **$0.000069** and 764 ms. This combined fixture timing is not a measurement of production query latency. Hosted database/Edge costs and customer billing are separate.

## Verification and rollout

Local verification: 58 Node pipeline tests, 38 CLI tests and syntax checks, both Deno workers type-checked, actual generation and library HTTP handlers exercised with intercepted dependencies, and a 115-page Astro build. The generation handler completed 77 sections at concurrency 3 with seven overview groups and a complete citation bundle. PostgreSQL 14 plus a temporary build of pgvector 0.8.2 exercised the real migration, RLS/RPC permissions, owner boundaries, current revisions, pause/delete races, rate limits, atomic indexing claims, stale writes and scheduled recovery. Synthetic 10,001-section searches took **187–199 ms** in the completion run including psql startup, excluding network/provider latency.

The real embedding fixture found the expected chapter at rank one in **5/6** queries and within the top three in **6/6**. The Chinese market-extent question ranked the desired third chapter below chapters one and two. The final candidate policy preserves three chapters per book; this is useful recall for agent judgment, not perfect multilingual ranking. The fixture is small, uses three sections from one book plus synthetic distractors, and is not a broad relevance benchmark. Logs are under [verification](verification/book-routing-2026-10-08/database.txt).

Database reproduction: build pgvector 0.8.2 in a temporary directory against the installed Postgres, then run `BOOK_LIBRARY_DB_TEST=1 PGVECTOR_TEST_ROOT=/path/to/pgvector python3 scripts/test-book-queue-db.py`. The test loads the temporary shared library directly without modifying the system installation. Add `BOOK_RETRIEVAL_FIXTURE=/path/to/fixture.json` for the optional paid-model vectors generated by `scripts/benchmark-book-retrieval.mjs` from the public three-section notes. pg_net/Vault/cron are recording stubs in this local database test, so it does not establish live scheduler or network acceptance.

Production release procedure (completed October 8, 2026; see the completion report for acceptance evidence):

1. Apply migration `20261008160000_book_library_retrieval.sql`; ensure pgvector is in `extensions`. Deploy `book-library` with platform JWT verification disabled, as for `book-process`, because the handler validates both browser sessions and revocable `awb_cli_` sessions itself.
2. Configure the existing Supabase credentials, `OPENAI_API_KEY`, and `BOOK_QUEUE_RUNNER_SECRET` in Edge. Add Vault `book_library_url` with the deployed `/functions/v1/book-library` URL to enable paid background indexing. Reuse the existing `book_queue_runner` Vault secret. Cron recovery runs each minute; each successful batch also wakes the next. Omitting the new URL leaves lexical retrieval available without automatically embedding the backlog.
3. Verify authenticated account search, index coverage, real scheduler recovery, expired sessions, revision activation/deletion, and fresh CLI reads with two accounts. Validate billing and monitoring; never log source text, queries, provider error bodies, or keys. Entries stopped after five embedding failures need an operator to correct the configuration and reset those entries' attempts/next-attempt time.
4. Deploy the generation worker with concurrency 1, then opt into 2 or 3 after verifying provider capacity and partial-retry behavior. Use the selected Mini settings (`BOOK_PROCESSING_MODEL=gpt-5.4-mini`, `BOOK_REVIEW_MODEL=gpt-5.4-mini`, `BOOK_REASONING_EFFORT=none`, `BOOK_REVIEW_REASONING_EFFORT=low`); check for older explicit deployment overrides before rollout. Preserve source-review gates and monitor rejected or overgeneralized claims. Gemini additionally needs a valid API key and a successful live schema/quality trial.
5. Publish the matching CLI/skill release and test a fresh consumer install. Release 0.4.0 and both installed runtimes passed this gate on October 8, 2026.


## Completion and recovery

Source-review failures retain the draft and claim-level findings for a targeted correction; they do not incur provider-outage backoff. A failed section does not occupy otherwise available parallel slots with already accepted work. Five failed review attempts stop the job without accepting the draft. Provider errors still use bounded backoff. Saved overview and final synthesis reviews also retain correction feedback.

Text completion marks the book and skill ready independently of the cover. A separate leased cover queue retries illustrations without regenerating notes. `retry-cover ID` resumes only that queue. Model usage is saved per job and available through `usage ID --json` and the reader. These are provider estimates, not customer invoices. Recorded GPT-image-1.5 image calls are priced separately from text calls using returned text-input, image-input and image-output usage. Missing or unpriced usage remains unknown; retrieval embeddings, infrastructure, taxes and service charges are excluded.

The reader has an explicit connected-agent route and an optional local/offline installation route. The generic skill retrieves relevant hosted methods; the user's current agent applies them. A remote book package does not run as an independent agent. The website never publishes a private upload to the curated public shelf.

The selected mini reviewer passed all eight [targeted live regression cases](verification/book-completion-2026-10-08/review-calibration.json). This covers the previously observed conditional quantity, citation, invented obligation and application-label cases; it is not a general accuracy estimate. Three additional [aggregate-review direction cases](verification/book-completion-2026-10-08/summary-calibration.json) passed: omitted source detail is allowed, supported source detail is accepted, and invented obligations are rejected. Gemini comparison was explicitly deferred by the user after its configured credential was rejected.
