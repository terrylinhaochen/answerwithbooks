# Saved guide source access and shelf loading — 2026-11-06

## Cause and fix

Guide 190e348b-2fa8-4f01-9028-8364905f35a2 remained ready but its private Wealth of Nations source was archived. Original text still existed. Source reads excluded archived books, so the owner's saved guide could not hydrate.

Existing private guide reads and context now allow the owner's archived source. They still require ready status, no pending deletion, permitted ownership/public visibility, the original edition and passage hash. Discovery and new guide generation still exclude archives. Archived source metadata is shown without a dead book-detail link. No source was restored to the shelf or made public.

The personal shelf previously awaited public-list, then subscription status, then list. The three requests now start independently. Your Guides displays a loading state, and failures have a visible retry. Responses from an earlier account or request cannot overwrite the current shelf. The list API runs state and guide queries concurrently. The UI requests includeBooks:false to skip unused metadata and signed book covers. Existing API clients retain the default books response.

## Verification

- Hosted reading-guides deployed version 19. Only index.ts and guide-worker.mjs differ from deployed version 18; the other five bundled files are identical.
- Authenticated live get returned ready, three hydrated passages, 2,590 original words, archived source metadata, no source error.
- Fresh authenticated compact list included the guide, returned no book payload, and completed in 617 ms in this single measured request (not a latency benchmark).
- Headless Chrome with the existing authorized account credential opened the guide from the local shelf against live APIs: three original sections, visible Personalize card, no unavailable-source error. Screenshot: /private/tmp/awb-restored-guide-live.png. No generation or payment was triggered.
- test-guide-loading.cjs: personal shelf renders while public-list and billing remain deliberately blocked; their failures do not remove it; shelf failure/retry works; mobile fits; guest has no private shelf fetch.
- test-guide-ui.cjs: existing create/confirm/processing/reader, four-provider handoff, remembered preference, clipboard fallback, context, feedback, related guides and desktop/mobile checks passed using fixtures.
- test-reading-http.ts: archived owner source and context work; another account cannot get it; pending deletion blocks hydration; compact list performs no source/book-cover query. Existing auth and confirmation checks passed.
- test-reading-guides.mjs: 25 tests passed. Astro build passed.
- Full Deno static checking remains blocked by existing Supabase client type inference errors (never/deep instantiation). Checking the unchanged deployed entrypoint in the same local dependency environment also fails (38 diagnostics; changed entrypoint 39 including the added typed filter). Runtime handler, deployment and live verification passed; static checking is not claimed to pass.

Frontend changes are in the rebuilt local preview, not a new production frontend deployment. The source-access and API list fixes are live on Supabase.
