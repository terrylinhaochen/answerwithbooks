# Book wave runbook

This is the repeatable publication path for adding a reviewed group of books to the public shelf. The approved manifest is the queue; source briefs, public digests, and cover prompts remain inspectable artifacts.

## 1. Approve the shelf

Add the exact title, authorship, original publication year, public slug, tags, shelf order, and required concepts to `approved-book-wave-1.json`. Validate that every slug and order value is unique before generating anything.

## 2. Build source briefs

```sh
npm run books:research
```

Research uses current web search, prioritizes official author, publisher, institutional, and interview sources, and blocks summary apps and anonymous discussion sites. It writes the editorial brief to `source-briefs/<slug>.md` and retains the raw response and source provenance in `source-briefs/raw/<slug>.json`.

Review each brief for metadata, central argument, mechanisms, book-grounded examples, qualifications, and source quality. A thin or weakly sourced brief must not advance to drafting.

## 3. Draft and gate the digests

```sh
npm run books:generate
```

The generator follows `CONTENT_GENERATION_SPEC.md` and `../docs/EDITORIAL_STYLE.md`. A public digest must:

- deliver the book's argument as a self-contained reading experience;
- use four to six idea-led sections and substantially more prose paragraphs than list items;
- stay near 1,500 words, with a local publication range of 1,200–1,850 words;
- use only examples supported by the source brief;
- avoid generic recap headings, preview language, invented examples, and unverified quotations;
- include valid catalog frontmatter and a specific `oneLiner` and `readIf`.

Failed drafts receive focused repair passes. Completed books are cached, so rerunning the command resumes the wave. Use `--ids=slug-a,slug-b --force` only for intentional regeneration.

Run the deterministic audit on the wave before covers:

```sh
npm run content:eval -- --collection=books --ids=<comma-separated-slugs> --strict
```

The audit is a publication gate, not a substitute for editorial reading. Spot-check every opening, heading sequence, book example, and ending against its source brief.

## 4. Generate the cover set

Define one memorable symbol and one distinct high-contrast palette per slug in `../scripts/generate-cover-assets.mjs`, then mirror that palette in `../src/components/BookCover.astro` so the title overlay belongs to the art.

```sh
npm run covers:gemini -- --ids=<comma-separated-slugs> --concurrency=2
```

The generator uses the existing text-free sticker-cover system and records every provider prompt in `../public/covers/prompts.json`. Review the full set at thumbnail size for text leakage, repeated compositions, weak contrast, cropped symbols, and conflict with the title overlay. Regenerate only failed slugs.

## 5. Verify the public shelf

```sh
npm run build:local
npm run audit:seo
npm run test:rendered-catalog
npm run test:ui
```

Finally, open representative new detail pages and every catalog page in a real browser. Confirm that each route renders, each cover loads, the digest sits inside the white reading card, pagination includes the complete wave, and mobile and desktop layouts remain readable.
