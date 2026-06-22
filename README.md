# Answer with Books

> Global books, local questions for Japan and Korea.

A content-first site that distills books into actionable answers for Japanese and Korean readers.
Each book becomes a distilled "insight page" with the visible reader-facing material, and
question-led articles answer local problems by drawing on 1-3 global books. The heavier book text
lives in the core backend corpus for matching and generation, not as visible UI copy.

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

## Content

- `src/content/books/*.md` — one distilled page per book. Frontmatter: `title`, `author`, `year`,
  `oneLiner`, `readIf`, `tags`, `featured`, `order`.
- `src/content/answers/*.md` — question-led articles. Frontmatter: `question`, `description`,
  `books` (array of book slugs), `date`, `featured`, `tags`.
- `src/lib/topics.ts` — canonical topic grouping for browse pages. Keep this intentionally broad:
  Career, Relationships, Health, Technology, Business, Negotiation, Productivity, and Decisions.
- `src/lib/glocal.ts` — shared Japan/Korea positioning copy. Update this first when changing the
  site-wide glocalization lens.

Add a markdown file, push to `main`, and the Actions workflow rebuilds and deploys.

## Demand and Matching

The public site is the publishing layer. CrowdListen and the core API are the demand and matching
layers:

1. CrowdListen researches topics people repeatedly ask about and exports demand packets.
2. The core API syncs those packets, turns them into concerns, and matches them against the hidden
   book corpus.
3. The web app publishes the selected books and answers as static pages.

Visible topic pages should stay small, familiar, and Japan/Korea-aware. Detailed concern clusters,
evidence trails, and full book text belong in the backend/research layer.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for GitHub Pages setup and the GoDaddy DNS records for
answerwithbooks.com.
