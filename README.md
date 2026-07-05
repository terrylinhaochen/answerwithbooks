# Answer with Books

> Every book you've read, ready to answer.

A content-first site that distills books into actionable answers. Each book becomes a distilled
"insight page" with the visible reader-facing material, and question-led articles answer real
problems by drawing on 1-3 books. The heavier book text lives in the core backend corpus for
matching and generation, not as visible UI copy.

Live at **[answerwithbooks.com](https://answerwithbooks.com)**.

## Stack

- [Astro 5](https://astro.build) — fully static output, content collections for books & answers
- [Tailwind CSS 4](https://tailwindcss.com) — via `@tailwindcss/vite`
- [Supabase](https://supabase.com) — client-side email/password auth (`@supabase/supabase-js`)
- GitHub Pages + GitHub Actions for hosting and deploys

## Development

```bash
npm install
cp .env.example .env   # fill in Supabase URL + anon key
npm run dev            # http://localhost:4321
npm run build          # static build into dist/
```

Requires Node 18.17+ (Node 22 recommended). On the desktop workspace, `npm run build:local`
uses the known-good Node 22 path.

## Analytics and Search Console

Set `PUBLIC_GA_MEASUREMENT_ID` for the Answer with Books GA4 stream
(`G-FNWRC3EMV4` in the Crowdlisten account). If the site needs to report to more than one GA4 property, set
`PUBLIC_GA_MEASUREMENT_IDS` to a comma-separated list. Set
`PUBLIC_GOOGLE_SITE_VERIFICATION` to the Search Console HTML tag token.
GitHub Pages deploys include the production GA4 ID and Search Console token;
`ANSWERWITHBOOKS_GA_MEASUREMENT_IDS` can still be set as a repository variable
if the site needs to report to additional GA4 properties.

## Content

- `src/content/books/*.md` — one distilled page per book. Frontmatter: `title`, `author`, `year`,
  `oneLiner`, `readIf`, `tags`, `featured`, `order`.
- `src/content/answers/*.md` — question-led articles. Frontmatter: `question`, `description`,
  `books` (array of book slugs), `date`, `featured`, `tags`.
- `src/lib/topics.ts` — canonical topic grouping for browse pages. Keep this intentionally broad:
  Career, Relationships, Health, Technology, Business, Negotiation, Productivity, and Decisions.

Add a markdown file, push to `main`, and the Actions workflow rebuilds and deploys.

## Source Assets

Book covers are generated assets, not hand-coded placeholders.

```bash
npm run covers          # generate local SVG covers and prompt manifest
npm run covers:prompts  # update only model prompts
npm run covers:gemini   # render PNG covers with Gemini/Nano Banana when GEMINI_API_KEY is set
```

The generator reads the book frontmatter, creates `public/covers/*.svg`, and writes
`public/covers/prompts.json` for image-model rendering. PNG covers take precedence over SVG covers
at render time, so a generated model asset can replace the deterministic cover without changing
book content. Prompts ask the image model to create art without text; exact title, author, and year
stay deterministic in the site component.

## Demand and Matching

The public site is the publishing layer. CrowdListen and the core API are the demand, matching, and
catalog-expansion layers:

1. CrowdListen researches topics people repeatedly ask about and exports demand packets.
2. Demand packets become ranked content opportunities: questions, use cases, source gaps, and
   suggested books to add.
3. New books are acquired through permitted sources only: licensed files, user-provided files,
   public-domain works, publisher/author permission, or other rights-cleared access.
4. The ingestion pipeline extracts text, chunks it, distills frameworks and examples, and generates
   reusable shelf assets such as covers, prompts, answer candidates, and agent-skill context.
5. The web app publishes selected books and answers as static pages.
6. Reader behavior and follow-up questions feed back into CrowdListen so the next catalog expansion
   is demand-led instead of manually guessed.

Visible topic pages should stay small and familiar. Detailed concern clusters, evidence trails, and
full book text belong in the backend/research layer.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for GitHub Pages setup and the GoDaddy DNS records for
answerwithbooks.com.
