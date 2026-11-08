# Skills release and remaining-change audit — 8 November 2026

Production still showed “Turn what you read into how you work” and the retired question/method/FAQ sections. The requested redesign existed only in uncommitted tools.astro edits and an untracked SkillFeatureDemo.astro; neither was in the last production release. The deployment surface check also still required the old headline.

This release includes the new headline, three illustrated feature examples, shared catalog jackets, and removal of the obsolete sections. The examples are explicitly illustrative and do not pretend to be live agent output. The install action still copies the existing shared-skill setup prompt. The shared footer is preserved.

An isolated checkout of origin/main was used to exclude unfinished personalization work. The build, existing product-surface check and rendered-cover check passed. Browser checks at 320, 390, 768, 1024 and 1440 pixels verified three demos, seven decoded covers, the same artwork as the Books catalog, no horizontal overflow, no browser exceptions, and the actual copied install prompt. Screenshots were visually inspected at phone and desktop sizes.

The release pipeline repeatedly failed before handler tests because GitHub's Deno release download returned HTTP 504. Both workflows now install the official npm package pinned to the same Deno 2.8.3. This changes the download route, not the runtime or checks. The npm install and version were verified locally; CI verifies Linux and the full suite.

## Remaining work discovered

- PR #18: completed batch/source-boundary/digest/cover-recovery changes. The worker is already deployed and all ten books verified, but the repository merge was blocked by the Deno download failure. Recheck after the release tooling repair.
- Profile-only LinkedIn import and personalization: local Profile/ReadingPersonalizer changes, new client/component/helper/function/tests and reader_personalization migration. The migration was applied during earlier work, but the key transfer/backend deployment was blocked by automatic approval review. Those files are excluded from this release. See the local docs/experiments/linkedin-personalization.md for the recorded approval boundary and pending authenticated acceptance.
- Personalization changes to guide-suggestions and reading-guides depend on that backend and remain excluded.
- Archived portrait and texture studies are experiments, not production assets awaiting activation. The original landing artwork remains in use.
- docs/research/founders-books-recovered.md is a local research artifact; the separate Founders progress checkpoint and completed batch records are already tracked.
