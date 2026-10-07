# Agent commands

The CLI release adds `books` (`list`), `ask` (`answer`), `upload`, and `status`, plus `login`, `logout`, and `download`. Public retrieval works locally without an account. Private uploads reuse `book-process` and its existing storage, quota, cache, and background worker.

## Account connection

`login` creates a random 256-bit credential locally and sends only its SHA-256 hash to start pairing. The browser shows a 12-hex-character code and requires an authenticated user to click Connect. The CLI polls using its secret. A locked SQL transaction activates a 30-day book-only session. No Supabase refresh token, password, or service key leaves the service. Login endpoints never return the CLI secret. Credentials are kept outside projects in a 0700 directory and 0600 file. `logout` revokes the server session before removing the file.

Pairing expires in ten minutes and is limited to five starts per gateway client-IP hash per ten minutes. Database tables have RLS with no browser access. The worker resolves either a website JWT or the hashed CLI session, then uses the same explicit owner checks. Operator and queue-runner actions retain their separate authorization. Source documents are evidence, never instructions to execute.

## Uploads

The CLI runs the pinned upstream adapter in a disposable Pyodide worker and uses PDF.js for PDFs. No Python installation or repo clone is needed. Extraction dependencies load only for upload. All sources use signed staged uploads and integrity verification before enqueue. Ten files become separate books. Each file is bounded to 50 MB and six million extracted characters. A failed item does not stop other items. SHA matches are checked before extraction; public title matches return saved-book choices without uploading, and `--process-file` explicitly selects full processing instead.

## Release order

1. Run SQL, handler, CLI, extraction, packed-install, and browser tests.
2. Apply `20261008001000_book_cli_access.sql` and deploy `book-cli-auth` with gateway JWT verification off (handler validates authorization), then `book-process`.
3. Verify pairing, revocation and cross-account isolation with temporary test accounts; no emails required.
4. Publish the CLI package and skill repository. Verify the published package in a fresh directory.
5. Publish the website with the matching command examples and `/connect-agent/` page.

A source upload alone is not proof of generated-artifact quality. Record actual release evidence separately.
