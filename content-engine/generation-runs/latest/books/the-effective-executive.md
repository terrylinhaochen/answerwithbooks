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
  "id": "the-effective-executive",
  "frontmatter": {
    "title": "The Effective Executive",
    "author": "Peter F. Drucker",
    "year": 1967,
    "oneLiner": "A compact management classic about time, contribution, strengths, priorities, and decision effectiveness.",
    "readIf": "You are busy, responsible for outcomes through other people, and unsure whether your activity is actually producing contribution.",
    "tags": [
      "management",
      "leadership",
      "priorities"
    ],
    "featured": false,
    "order": 16
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

**1. Effectiveness can be learned.**
Drucker separates intelligence, personality, and activity from effectiveness. The executive's job is contribution, not busyness.

**2. Know thy time.**
Time is the limiting resource. Until you know where it goes, you cannot manage contribution.

**3. Build on strengths.**
The effective executive asks where a person's strengths can produce results instead of trying to build an organization around the absence of weakness.

**4. Concentration matters.**
Do first things first and second things not at all. Strategy becomes real through concentration.

## Key frameworks

**Time audit.** Record where time actually goes, then eliminate, delegate, or consolidate low-contribution work.

**Contribution question.** Ask what results the organization needs from you, not what activity feels appropriate to your role.

**Decision discipline.** Treat decisions as commitments to action, responsibility, and follow-up.

## When to reach for this book

- When a manager is drowning in meetings and status work.
- When the question is what deserves executive attention.
- When delegation is weak because contribution is unclear.
- When the team needs fewer priorities with stronger ownership.

## Memorable ideas and lines

The enduring lesson is that effectiveness begins by facing the calendar honestly.
