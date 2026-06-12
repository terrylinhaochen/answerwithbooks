# Answer with Books

> Every book you've read, ready to answer.

A content-first site that distills books into actionable answers. Each book becomes a distilled
"insight page" (core mental models, key frameworks, when to reach for it, how it's been applied),
and question-led articles answer real problems by drawing on 1-3 books.

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

Requires Node 18.17+ (Node 22 recommended).

## Content

- `src/content/books/*.md` — one distilled page per book. Frontmatter: `title`, `author`, `year`,
  `oneLiner`, `readIf`, `tags`, `featured`, `order`.
- `src/content/answers/*.md` — question-led articles. Frontmatter: `question`, `description`,
  `books` (array of book slugs), `date`, `featured`, `tags`.

Add a markdown file, push to `main`, and the Actions workflow rebuilds and deploys.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for GitHub Pages setup and the GoDaddy DNS records for
answerwithbooks.com.
