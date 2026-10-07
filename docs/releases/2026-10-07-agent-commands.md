# Agent commands release

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

## Production acceptance

The user approved publishing the complete release. Migration `20261008001000` is applied. `book-cli-auth` version 1 and `book-process` version 12 are ACTIVE. The new pairing-start endpoint is public; browser approvals validate the website user and private book actions validate the scoped credential inside the handler. Existing JWT clients and the worker gateway mode are preserved.

[Live acceptance receipt](../verification/agent-commands-2026-10-07/acceptance.json): the actual CLI connected through the browser, submitted two original sources in one batch, reused an identical source, waited for server-only completion, retrieved a private skill with numbered citations, downloaded a ZIP containing its source, and revoked access with logout. A second account could not access the jobs. Temporary accounts and files were removed; no emails were sent. This run used the local release frontend connected to production endpoints.

Package CI passed on GitHub: https://github.com/Crowdlisten/Crowdlisten_books/actions/runs/37578305565. The tested revision is `6b4df3a296e0938c3c704dc3a96faea500e939f7`.

npm 0.2.0 is publicly available with shasum `d279e74fc681bf24a1aee1228b2b6ed0ba20007e`, matching the tested package. A fresh npx install returned all 46 books, retrieved three relevant books and one published answer, and installed a working local API runtime. [Published-package receipt](../verification/agent-commands-2026-10-07/published-package.json). The npm version endpoint became available before the installation metadata; acceptance waited until normal npx resolution worked.

This website revision is released by the GitHub Pages workflow on main. Confirm its successful deployment in Actions; a pushed commit alone does not establish production availability.

Repeat hosted acceptance with `AWB_LIVE_CLI_TEST=1 AWB_TEST_CLI=/path/to/bin/answer-with-books.js node scripts/test-book-cli-live.mjs`. `AWB_TEST_ORIGIN` selects the frontend. This creates temporary accounts and makes real generation calls for two short original sources, then cleans up.
