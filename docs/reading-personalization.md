# Shared reading personalization

Books, book-grounded guides (the existing `/answers/` URLs), and hands-on `/guides/` tutorials render the same `ReadingPersonalizer.astro` component. The common page order is reading content, Personalize, Q&A, feedback, then related reading when present. Existing canonical URLs and editorial content are preserved.

- ChatGPT, Claude, Gemini and Grok use one shared provider picker and `awb:preferred-ai` browser preference.
- The action copies the complete prompt and opens the selected provider's base page. No prompt is put in a URL or automatically submitted to an AI provider.
- If clipboard access is blocked, the readable prompt opens and selects its text for manual copying.
- Book prompts retain their existing self-contained Book URL Contract. `BookDigestPersonalizer.astro` is a thin payload adapter, not a second UI implementation.
- Guide prompts contain the guide's question, decision rule and full editorial brief, plus available source-book editorial digests. Hands-on prompts include all workflow steps, fictional practice data, exercise prompt, expected distinctions, review checks and variation.
- The guide contract separates source claims from applications and prohibits invented personal context, quotes, approvals and results. It does not claim the AI has read original books. Skill installation and link retrieval are not required.
- Tutorial copy buttons and saved self-review checkboxes remain available. Tutorials reuse the existing `answer` feedback category; no feedback schema or backend behavior changed.

`scripts/test-unified-personalizer.mjs` checks the shared component on every generated book/answer page, and tests two books, two book-grounded guides and all three tutorials interactively. It covers section order, all four destinations, exact clipboard content, full source inclusion, remembered choice, blocked-clipboard fallback, mobile layout, save controls, and tutorial checkboxes. External AI destinations are mocked: these tests do not submit user data or verify an AI-generated response.

The changes are local until separately committed and deployed.
