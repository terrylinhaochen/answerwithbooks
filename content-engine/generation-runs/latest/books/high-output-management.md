# Regenerate Book Distillation

Use the content spec below to regenerate this book page as a complete Astro content Markdown file.
Return only the final Markdown file with YAML frontmatter. Preserve the slug and core metadata unless the current copy is clearly weaker.
Use paraphrase by default. Do not invent quotations.

## Content Spec

# Answer with Books Content Generation Spec

This is the canonical shape for generated public content. The goal is not a book summary
library. The goal is a shelf of human-authored books converted into useful judgment for
specific situations.

## Shared Standards

- Write for a smart, busy reader with a real problem, not for someone browsing summaries.
- Use paragraphs as the default. Lists are allowed only for checklists, scripts, or compact
  decision rules.
- Keep every claim tied to one of three inputs: CrowdListen demand, source-book ideas, or
  visible user behavior.
- Do not fabricate quotations. Use short verified excerpts only when the source text has been
  reviewed; otherwise paraphrase and label the idea.
- Do not reproduce chapters, long passages, or comprehensive substitutes for a book.
- End with a practical action a reader or agent can use immediately.

## Book Distillation Shape

Each book page should answer: when should this book be called, what does it help you see, and
what reusable lenses does it add to the shelf?

Frontmatter:

- `title`
- `author`
- `year`
- `oneLiner`: one sentence describing what the book helps the reader understand or do.
- `readIf`: one concrete situation where the book is worth reaching for.
- `tags`
- `featured`
- `order`

Body:

1. Opening hook: 1-2 paragraphs on why the book earns a slot in the shelf.
2. `## What the book is about`: 2 paragraphs, not a chapter-by-chapter summary.
3. `## Core lessons`: 3-5 named lessons, each with a paragraph explaining how to use it.
4. `## How to use it`: practical lenses, scripts, checks, or decision rules.
5. `## When this lens breaks`: limits, common misuses, or cases where the book is insufficient.
6. `## Best paired with`: adjacent books or answer situations when available.

Avoid standalone `How I’ve applied it` sections. Application belongs inside the practical
lenses and answer pages.

## Answer Shape

Each answer page should answer: what is the reader really trying to solve, which books clarify
the situation, and what should happen next?

Frontmatter:

- `question`
- `description`: the decision rule preview shown in cards and SEO snippets.
- `books`
- `date`
- `featured`
- `tags`

Body:

1. Opening demand frame: 2-3 paragraphs describing the recurring question or situation.
2. `## What is really going on`: diagnosis, not generic advice.
3. `## What the books add`: the specific source-book lenses and why they matter here.
4. `## The working move`: the main action, script, checklist, or operating rule.
5. `## What to watch for`: failure modes, false positives, or cases where the advice breaks.
6. `## Try this next`: one concrete next step the reader or an agent can execute.

## Background Engine Record

For high-priority answers, add a `content-engine/content-packets/*.json` packet with:

- demand signal
- published output path
- source books and roles
- triage schema: `who`, `what`, `why`, `what_changed`, `what_should_happen_next`
- agent use cases

The public Markdown is the reader artifact. The packet is the machine-usable system-of-record
artifact.


## Current Book Record

```json
{
  "id": "high-output-management",
  "frontmatter": {
    "title": "High Output Management",
    "author": "Andrew S. Grove",
    "year": 1983,
    "oneLiner": "A manager's operating manual for increasing the output of a team through leverage, clear processes, meetings, and coaching.",
    "readIf": "You manage people and need a practical model for delegation, one-on-ones, training, and team output.",
    "tags": [
      "management",
      "operations",
      "delegation"
    ],
    "featured": false,
    "order": 17
  },
  "headings": [
    "Core lessons",
    "Key frameworks",
    "When to reach for this book",
    "Memorable ideas and lines"
  ]
}
```

## Current Markdown Body

## Core lessons

**1. A manager's output is the output of the organization.**
Grove's most useful reframe is that management output is indirect. Your work matters through the decisions, clarity, and performance it creates in others.

**2. Managerial leverage varies.**
Some activities create large downstream effects: training, better processes, one-on-ones, and decisions that unblock many people. Others merely consume time.

**3. Task relevant maturity changes the management style.**
Delegation depends on the person's experience with that specific task, not their general seniority.

**4. Meetings are production tools.**
Bad meetings waste time, but Grove's point is sharper: recurring meetings and one-on-ones are tools for information flow and output when used deliberately.

## Key frameworks

**Leverage audit.** Ask which management activities multiply output and which only create motion.

**One-on-one as work system.** Let the report set much of the agenda; use the meeting to surface problems early and improve decisions.

**Task relevant maturity.** Match direction, coaching, and delegation to the task-specific maturity level.

## When to reach for this book

- When delegation keeps failing.
- When one-on-ones feel like status theater.
- When a manager is doing the team's work instead of improving the team system.
- When scaling creates coordination costs.

## Memorable ideas and lines

The practical question is always: which activity increases the future output of the team?
