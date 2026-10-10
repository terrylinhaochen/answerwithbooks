# Reader and management acceptance — 2026-10-10

The private reader now displays an editorial digest separately from the skill/reference notes. It reuses public overview, purchase and agent-prompt components. Manage Skills provides archive, restore and confirmed deletion of an entire book history. The queue spans the page width.

Validation:

- 79 cross-route flow tests: same local/managed reader prompts and controlled outputs, source-specific reviews, import validation and existing billing gates.
- 46 CLI tests; 70 pipeline tests; 18 billing tests.
- Actual processing-handler tests with intercepted providers: saved skill stage, editorial generation/review, resume and metering. These are orchestration fixtures, not real-model quality scores.
- Isolated PostgreSQL and pgvector tests: owner isolation, retrieval exclusion/restoration, active processing/billing guards, all revisions, retryable deletion and the restore/delete race guard.
- Authenticated local browser against deployed services at 1440, 390 and 320 pixels: reader sections, matching copy prompts, closed skill card, Amazon search link, no source/download controls, no horizontal overflow, and full-width queue. Archive, restore and confirmed delete were exercised on disposable test accounts. Original source and index cleanup verified. No email sent.
- Production migration and book-process/book-import deployment completed. Mintlify validation and Astro build passed. The production Pages deployment passed (run 38092381972), followed by the same signed-in acceptance checks against https://answerwithbooks.com. See `production.json`. CLI 0.7.0 passed CI and its freshly downloaded release executed successfully; the downloaded tarball matched the built SHA-256. Live Mintlify library docs include Manage Skills.

Existing Smith full-text and Chapters 1–3 entries received original editorial digests authored by the current agent from saved source excerpts. Paragraph evidence coordinates are saved privately. The identical full-text duplicate was updated only after source equality was verified. Covers, sources, skill artifacts and billing were preserved; no new text/image generation charge. This backfill is labeled customer-agent provenance, not independent hosted verification.

Limits: no new paid full-book model run or independent semantic judge was executed in this release. Broader proposed editorial-scoring prompts remain design references. Other legacy private books without a reader artifact honestly show a missing-summary state. Offline commands remain optional; later local revision sync remains outside scope.
