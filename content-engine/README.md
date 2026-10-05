# Answer with Books Content Engine

This folder is the local operating layer between CrowdListen demand and the public Answer with Books site.

## Loop

```text
CrowdListen demand packet
  -> concern and source-evidence queue
  -> matched book lenses
  -> book/source ingestion jobs
  -> cover and media assets
  -> answer or digest artifact
  -> reader behavior and follow-up questions
  -> next CrowdListen demand packet
```

## Commands

```bash
npm run content:plan
npm run content:eval
npm run engine:report
npm run engine:ingest -- --candidate obviously-awesome --source /path/to/source.pdf
npm run covers
npm run covers:gemini
```

`npm run content:plan` reads the canonical generation spec, current book pages, current answer
pages, and available content packets, then writes a prompt pack under
`content-engine/generation-runs/`. Use this as the dry-run step before regenerating public
Markdown in batches.

`npm run content:eval -- --collection=books --ids=the-mom-test --strict` checks the public
Markdown against the content-quality bar: required sections, minimum substance, paragraph/list
balance, placeholder text, and short-quote limits.

`npm run engine:report` reads the sibling core queue at
`../core/research/crowdlisten-handoff-queue.json`, compares it with the current shelf and answer
pages, and writes `content-engine/content-engine-report.json`.

Use the report as the work queue:

- `ready_to_publish`: demand, books, and source matches exist; draft or materialize the answer.
- `blocked_missing_books`: acquire/upload the source book, ingest it, then generate covers/assets.
- `published`: write back impressions, clicks, saves, and follow-up questions.
- `candidate`: evaluate whether demand justifies adding the book to the shelf.

## Content Packets

`content-engine/content-packets/*.json` stores durable background records for published
answers. A packet connects the CrowdListen demand signal, matched source books, page asset,
triage schema, and agent-use cases so the public page can also function as machine-usable
context.

## Source Asset Pipeline

For each new private book:

1. Run `npm run engine:ingest -- --candidate <book-id> --source <file>`.
2. Follow `.book-processing/<job-id>/PROCESS.md` to create one grounded distillation.
3. Run `npm run engine:compile -- --job <job-directory> --distillation <distillation.json>`.
4. Review both `artifacts/book.md` and `artifacts/skill/`, including references and coverage gaps.
5. Publication into `src/content/books` is a separate editorial decision. Private uploads are not published automatically.
6. Public cover commands: `npm run covers` uses Gemini; `npm run covers:svg` generates deterministic SVGs.

The CLI supports PDF, TXT and Markdown; PDF extraction uses pypdf. Extracted text stays in the ignored private job directory. The hosted upload uses the dedicated `book-process` worker, private storage, resumable processing, automatic cover generation and a shared book/skill compiler. See [BOOK_TO_SKILL_INTEGRATION.md](../docs/BOOK_TO_SKILL_INTEGRATION.md) for runtime limits and upstream reuse boundaries.
