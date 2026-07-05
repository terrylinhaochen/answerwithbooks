# 锦囊妙计 - Answer with Books

![Watercolor illustration of a sealed strategy pouch, books, and an agent harness](docs/assets/jinnang-miaoji-watercolor.jpg)

**Helping answer your top of minds with insights from books.**

Answer with Books turns books into practical insight packets for the questions you are already trying to solve. The site starts with real reader questions, finds the books with the right lens, and turns them into useful answers instead of generic summaries.

The metaphor is **锦囊妙计**: in *Romance of the Three Kingdoms*, Zhuge Liang gives Zhao Yun sealed pouches with strategies to open at the right moment. Answer with Books is the same idea for modern agents and readers: open the right book-grounded insight when the situation calls for it.

Live at **[answerwithbooks.com](https://answerwithbooks.com)**.

## What You Can Do

| Use case | What Answer with Books helps with |
| --- | --- |
| Founder judgment | Separate real customer evidence from compliments and wishful thinking |
| Career decisions | Turn a vague next-step question into options, constraints, and small tests |
| Team decisions | Use books on judgment, groups, and systems to avoid predictable mistakes |
| Productivity | Make habits and focus survive real weeks, not ideal calendars |
| Product strategy | Connect messy feedback to sharper product and positioning decisions |
| Agent context | Give your agent harness book-derived lenses before it answers or acts |

## How It Works

1. Start with a top-of-mind question.
2. Match it to books with relevant ideas, frameworks, and examples.
3. Return a book-grounded answer with a practical next move.
4. Save the question, books, and answer so the shelf gets more useful over time.

## Install the Agent Skill

```bash
npx answer-with-books install --skill --api
```

The agent skill lets Codex, Claude Code, Cursor, or another agent retrieve book-grounded context before answering.

## Run the Website

```bash
npm install
cp .env.example .env
npm run dev
```

Local site:

```text
http://localhost:4321
```

Build:

```bash
npm run build
```

On this workspace, `npm run build:local` uses the known-good Node 22 runtime.

## Content

| Path | Purpose |
| --- | --- |
| `src/content/books/*.md` | Distilled source-book pages |
| `src/content/answers/*.md` | Question-led answers from the shelf |
| `src/lib/topics.ts` | Broad browse categories |
| `content-engine/` | Repeatable content-generation specs and runs |
| `public/covers/` | Generated book cover assets |
| `public/answer-covers/` | Generated answer-card assets |

## Demand Loop

CrowdListen supplies demand: repeated questions, objections, and debates people keep having online. Answer with Books turns the strongest demand into book-grounded answers, source-book pages, and reusable agent context.

```text
CrowdListen demand -> book lenses -> answer -> reader behavior -> better demand
```

## Deployment

This repo deploys the static site with GitHub Pages and GitHub Actions. See [DEPLOY.md](./DEPLOY.md) for setup and DNS notes.
