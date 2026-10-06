# Collector homepage

The user selected the collector's table on October 5, 2026 and asked to extend its visual treatment through the landing page. The local homepage now uses that hero by default, without the lab switcher. `/shelf-lab/` retains both directions for comparison; `/shelf-preview/` mirrors the updated homepage.

## Design

- The dark, inset, full-viewport collector's table leads into a warm paper surface.
- The signup and three existing insights remain directly below the hero. The insight carousel now changes on request so a reader can finish the current note; focus follows its visible controls.
- Three explanatory steps, eight source books, the book-skill handoff, six answer briefs, the question invitation, reading activity, and all five FAQ entries remain.
- Book illustrations and typography use the same dimensional jacket throughout the site. Older PNG covers are supported, longer titles have a smaller type treatment, and below-fold images load lazily.
- The skill panel and footer echo the hero's dark green. The rest uses cream and sage surfaces, serif headings, soft shadows, and restrained hover movement.
- Main navigation, signup/account behavior, clipboard action, source links, native FAQ controls, purchase pages, and consent-based analytics remain connected to their existing implementations.

`collector-theme.css` is imported by the shared Base layout, which defaults to the collector theme on every route. It owns materials, navigation, footer, shared cards/forms, reading typography, and account surfaces. `collector-home.css` now contains homepage-specific rules only. The shared BookCover component wraps BookJacket, so library, topic, and reading-page covers use separated artwork and type plus dimensional boards. Existing cover palettes are retained in `book-palettes.ts`.

## Validation and release status

Astro build passes. Browser checks cover 1440, 768, 390, and 320px; default hero; one h1; original section counts; first viewport reserved for the shelf; fitting book typography; image availability; insight selection/focus; clipboard; FAQ; signup modal; book detail; and shared theming on book pages. Existing purchase and touch/reduced-motion checks are also run. No newsletter submission is made by these checks.

The collector redesign, personal shelf, and Amazon purchase cards form one release. Deployment status is established by the GitHub Pages workflow and production acceptance, separately from these local checks.

## Skills positioning and site-wide extension

The homepage now explains methods applied to real tasks. Its concise dark skill panel has one “Explore skills” CTA; the former extra Mom Test example and competing book link are removed. Navigation calls the product “Skills.” Picking a shelf book shows a specific task and makes “Copy to agent” primary, with “Open the book” secondary. Library cards and both ends of each book page offer the same source-and-task handoff. Homepage featured books keep linked covers and titles, without extra action buttons. `/tools/` is a Skills product page with six keyboard-accessible examples and clipboard fallbacks, the real upload dialog, artifact/skill/reference explanations, and clear public-digest versus uploaded-skill boundaries. Guides retain their existing content, with book-grounded answers now featured first. Profile gains an upload entry point; API-key management remains available for legacy research access. Known old research setup callbacks continue to `/api-keys/`.

The prior general directory is preserved under `integrations/crowdlisten-skills-directory/` (42 source files, SHA-256 manifest, README, and AGENT_PROMPT.md), also copied into `/Users/terry/Desktop/crowdlisten_files/integrations/crowdlisten-skills-directory/`. The package is outside the Astro build. No environment files or user credentials are included.

Validation: `npm run test:book-skills` checks 23 public routes plus profile at 1440, 390, and 320 px, theme continuity, overflow, first-screen shelf, copy contents, keyboard tabs, clipboard failure fallback, upload dialog, library filtering, and mocked account UI. `npm run test:ui` covers retained filters, reader, forms, mocked sign-in/up, callback, profile, feedback, and content mapping. `npm run test:book-purchases` covers all 46 Amazon destinations, placement, responsive rendering, consent controls, DNT/GPC, and no-JavaScript navigation. Ten shared capability/auth/OAuth/access checks pass. Browser account/API calls are stubbed; no real account or provider job was created for these design checks.

Final verification: all 109 non-redirect content pages carry the shared collector theme. All 46 catalog jackets have fitting, separate title/author regions and decodable images at 1440, 390, and 320 px. Known legacy research return links reach API-key management; unknown agent values remain on the Skills page. The mobile illustration caption is below the note card.

## Source upload and agent actions

The upload dialog says “Upload a source” and accepts one PDF, EPUB, DOCX, Markdown, HTML, RTF, or text document up to 10 MB. Books, research papers, and notes use the same existing pipeline. PDFs require selectable text; the extractor now also gives the explicit OCR message for short PDFs with no readable text. The form states that source text goes to the generation provider and artifacts stay private. This does not add automatic OCR, folder or multi-file ingestion, or MOBI/AZW support.

Public copy prompts include the existing editorial digest, attribution, and a concrete task; they do not claim full-book extraction. Source uploads generate the private artifact and skill files. `public-book-agent.ts` keeps shelf, card, and reader prompts aligned. Clipboard-denied cases expose a selectable prompt.

Additional checks: `npm run test:book-agent-actions` exercises the single CTA, all five shelf tasks, book switching, manual copying, card link isolation, matching reader prompts, and source dialog at 1440, 390, and 320 px. `npm run test:source-upload` sends original PDF, Markdown, and text fixtures through the real browser extractors with mocked job creation, and checks that unsearchable PDFs stop before generation. Neither test creates a provider job.

The library cards omit category-tag links to keep the agent action prominent; search and the category filter still use the unchanged book metadata. Skills examples cover customer interviews, decisions, habits, focused work, career moves, and difficult conversations. The six selectors stay in one horizontally scrollable row with keyboard tab navigation, and each copies its own source digest and task.

## Personal shelf

The hero has a small Personalize button. Visitors sign in or create an account, then return to the picker. Readers choose exactly five books from the existing public catalog using search, removable selections, and a recommended-set shortcut. Saving writes only `answer_with_books_shelf: { version: 1, books: [...] }` to the current Supabase user metadata. No schema change or new provider secret is required. Canceled edits and failed saves retain the previous collection. Invalid saved selections fall back to the recommended set, and sign-out restores it.

Book jackets are cloned from inert catalog templates, preserving the shared 3D rendering. Public task prompts for newly selected books load from static `/book-prompts/{slug}.json` files when opened, so the homepage does not embed every full digest. The original drag controls remain bound to the five shelf positions.

`npm run test:shelf-personalization` covers the visitor gate, login email return URL, password sign-in return, catalog search and selection limit, metadata writes, reload, fresh-browser readback, personalized task copying, keyboard movement, failed saves, mobile layout, account isolation, and sign-out reset. Authentication and writes are mocked. Live production account persistence is checked separately from the mocked suite. Existing UI smoke checks also pass. Interface copy and public card blurbs have been edited to remove em dashes; source reading material is retained.

Signed-in readers see a personal heading such as Terry’s shelf. It uses their profile’s first name, full name, or name, with a simple email-name fallback and otherwise Your shelf. New readers are invited to customize the starting collection; saved collections show Edit shelf and personal supporting copy. Signing out clears the name and restores the public heading. Names are inserted as text, never HTML.

The personal shelf title is one line, with the reader’s current local date immediately underneath. The date updates at local midnight and when the tab becomes visible again; it is not a book update timestamp. Very long names truncate to keep the title on one line. The date stays hidden for signed-out visitors.
