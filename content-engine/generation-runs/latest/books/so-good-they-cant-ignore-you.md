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
  "id": "so-good-they-cant-ignore-you",
  "frontmatter": {
    "title": "So Good They Can't Ignore You",
    "author": "Cal Newport",
    "year": 2012,
    "oneLiner": "A career argument that rare and valuable work usually comes from building rare and valuable skills first.",
    "readIf": "You are trying to choose a career path and suspect that advice to simply follow your passion is too thin to guide real decisions.",
    "tags": [
      "career",
      "work",
      "skill-building"
    ],
    "featured": false,
    "order": 19
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

**1. The passion hypothesis is incomplete.**
Newport argues that loving your work is often an outcome of mastery, autonomy, and impact, not a starting instruction.

**2. Career capital comes first.**
Rare and valuable jobs require rare and valuable skills. Building those skills creates leverage for control, mission, and better work.

**3. The craftsman mindset beats the passion mindset.**
Instead of asking what the job offers you, ask what valuable skill you are producing for the world.

**4. Control has traps.**
People want more autonomy, but pursuing control before having enough career capital can backfire.

## Key frameworks

**Career capital audit.** What rare and valuable skills do you have, and where are they compounding?

**Deliberate practice.** Improve specific skills through feedback, difficulty, and repetition rather than passive time served.

**Control test.** Ask whether you have enough leverage to support the autonomy you want.

## When to reach for this book

- When career advice feels too vague.
- When someone wants autonomy before skill leverage.
- When a career change needs a practical bridge.
- When the question is how to become valuable, not just how to feel inspired.

## Memorable ideas and lines

The useful reframe is to stop asking only what work you want and start asking what capabilities can earn better work.
