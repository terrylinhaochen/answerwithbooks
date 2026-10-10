# Bring your own agent → private hosted retrieval

Status, October 10: implemented and tested locally. **Not deployed or released.**
Automatic approval review rejected the production migration/deployment because
the request to test did not explicitly authorize persistent production changes.
No workaround was attempted. No live private book was created or charged.

## Prepared behavior

Managed generation remains the web default. In the development CLI, choose
`local prepare FILE --output DIR --destination library` after connecting the
account. This explicitly selects private upload of the extracted source and
structured results when generation completes. `--destination device` remains
local-only. The account selected at intake is pinned; changing accounts blocks
automatic synchronization.

For an existing completed workspace, `local publish DIR` imports the saved
source and structured generation results. It replays cached compilation responses
without invoking a model. Upload failure leaves the generated workspace ready;
`local next DIR` retries automatic synchronization, while `local publish DIR`
retries an explicit upload. The same package is idempotent per account.

The server validates source coordinates, metadata, application labels and skill
structure, renders only fixed paths, strips client review claims, and records
customer-agent provenance. It stores the extracted text as agent-source.txt; it
does not upload the original PDF or arbitrary files from the workspace. It does
not execute generated skills or accept raw archives. The 16 MB request limit is
explicit; larger imports need a future staged-upload protocol.

A ready import enters the existing book_library_entries trigger and authenticated
book-library search. Lexical retrieval is available after insertion; embeddings
are queued asynchronously. The response reports indexing coverage rather than
claiming embeddings are already ready. Client-authored content remains untrusted
evidence and is not labeled server-reviewed. Plain import makes no hosted text
or image calls and creates no conversion reservation. Later paid actions retain
the existing spending-approval guard. Embeddings still have an operating cost.

## Evidence

- 11 Node checks passed: local next/respond/install, cached import, sync failure
  recovery, automatic library destination, account pinning, server validation,
  fixed paths, HTTP authentication, scope and storage retry.
- The isolated PostgreSQL + pgvector suite passed, including real SQL indexing,
  source citations, cross-account isolation, concurrent duplicate imports,
  service-only RPC access and no generation usage for the imported fixture.
- Deno type-check passed for the endpoint.
- An existing rate-limit test crossed a minute boundary and failed; it now runs
  its 31 requests in one transaction, keeping the time window fixed.
- Production migration and endpoint deployment: **blocked by approval review**.
- Live authenticated retrieval, browser display and installed release: **not
  verified**. The prepared live test uses one public Smith taxation excerpt,
  generated via this agent's authored responses, not a separate paid text API.

## Scope and limitations

This closes the local-workspace-to-library bridge in code; it does not implement
an arbitrary book-to-skill ZIP importer, independent factual review, the separate
editorial-v2 reader pipeline, automatic public catalog publication, or imported
revision merging. Changed packages create separate import identities. Existing
book.md remains the reference-style artifact. The server reconstructs artifacts
from structured saved responses, so manual edits to generated Markdown files are
not imported. Earlier workspace versions with incompatible cached prompts need
an explicit adapter; they are rejected rather than silently regenerated.

No published CLI version should be documented as supporting these new commands
until the endpoint is deployed and the CLI release is verified. Live acceptance
must check the normal private book page, duplicate import, hybrid retrieval,
exact citations, zero text-generation operations and zero conversion debit.

Prepared deployment: `python3 scripts/deploy-book-agent-import.py --apply`.
This adds only migration 20261010081943 and book-import, retaining all existing
models, billing configuration and private access policies. Run only after the
user approves the production change. Then run the prepared
`scripts/test-book-agent-import-live.mjs` with the connected account; it stores
its private result locally without printing credentials.
