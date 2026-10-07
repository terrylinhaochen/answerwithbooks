# Agent commands release candidate

Version: answer-with-books 0.2.0. Repositories: Crowdlisten/Crowdlisten_books (CLI) and terrylinhaochen/answerwithbooks (website and worker).

## Implemented

- `books`/`list`, `ask`/`answer`, `upload`, `status`, `download`, `login`, `logout`; prior install/serve paths preserved.
- Offline public retrieval; explicit private-book selection; bounded private notes with exact citation excerpts.
- Pinned upstream extraction through Pyodide plus PDF.js. Separate batched uploads, hash reuse before extraction, public-library matches, staged signed transport, per-file errors.
- Browser-approved, revocable book-only sessions; no password or Supabase user refresh token copied into CLI. Owner checks remain in the processing handler. CLI sessions cannot delete books or call operator actions.
- New browser connection page and preserved login/signup return path. Homepage animation uses the real `books` command without a server. Setup modal and Skills FAQ share the release version.

## Verified locally

- CLI/API: 14 initial tests passed, including actual extraction of six source formats and packed install into an empty directory. Follow-up tests cover bounded evidence and changed CLI paths.
- Actual Postgres migration tested for approval binding, expired codes, session expiry, start limits, role isolation, and account deletion cascade.
- Auth handler validation and credential resolution tests passed.
- Actual processing handler regression with intercepted dependencies passed, including CLI owner resolution, refused invalid sessions/operator actions, staged sources, cache, 77-section processing, export review, and existing JWT clients.
- Astro production build: 115 pages. Product surface audit passed.
- Browser connection test: signed-out return links, no automatic approval, matching code, expiry error/retry, successful connection and mobile layout passed.
- Existing agent picker/copy tests passed across eight choices and mobile sizes. No native third-party agent session is claimed by these browser checks.
- Skill frontmatter validation passed.
- Final changed-command and packed-install suite: six tests passed. The animated books → ask → apply flow passed keyboard, mobile, reduced-motion, no-JavaScript, and no-provider-call checks.
- Revocation and activation share a database lock so a concurrent poll cannot restore a revoked session.

## Release status

Production deployment has NOT occurred. Automatic approval review rejected the migration/function deployment and requires explicit user approval. The new function intentionally permits the unauthenticated pairing-start request; browser approval validates the Supabase user, and private calls validate their scoped credential inside the handler. Existing worker gateway mode is preserved.

npm authentication returned 401, so 0.2.0 has NOT been published. Do not push the website to production until the backend and published npm package pass acceptance. The local preview advertises the release candidate.

After approval: run `python3 scripts/deploy-book-cli.py --apply`, perform temporary-account pairing/upload/download/revocation acceptance, publish npm, verify the published install, then push the website and verify Pages. No test emails are required.
