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
npm run engine:report
npm run engine:ingest -- --candidate obviously-awesome --source /path/to/source.pdf
npm run covers
npm run covers:gemini
```

`npm run engine:report` reads the sibling core queue at
`../core/research/crowdlisten-handoff-queue.json`, compares it with the current shelf and answer
pages, and writes `content-engine/content-engine-report.json`.

Use the report as the work queue:

- `ready_to_publish`: demand, books, and source matches exist; draft or materialize the answer.
- `blocked_missing_books`: acquire/upload the source book, ingest it, then generate covers/assets.
- `published`: write back impressions, clicks, saves, and follow-up questions.
- `candidate`: evaluate whether demand justifies adding the book to the shelf.

## Source Asset Pipeline

For each new book:

1. Add or upload the source file to the core ingestion layer.
2. Run `npm run engine:ingest -- --candidate <book-id> --source <file>` to extract source text.
3. Review `content-engine/ingestion-jobs/<book-id>.json` and `content-engine/book-drafts/<book-id>.md`.
4. Distill the draft into a public book page in `src/content/books`.
5. Run `npm run covers` for deterministic covers.
6. Run `npm run covers:gemini` when model-generated cover art is desired.
7. Match the book to CrowdListen demand packets and publish answer candidates.

The ingestion command supports `.pdf`, `.txt`, and `.md`. PDF extraction uses the bundled Codex
runtime's `pypdf` package when available and writes text into the sibling core ledger at
`../core/research/book-text/<book-id>.txt`.
