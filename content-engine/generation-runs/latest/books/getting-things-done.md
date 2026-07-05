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
  "id": "getting-things-done",
  "frontmatter": {
    "title": "Getting Things Done",
    "author": "David Allen",
    "year": 2001,
    "oneLiner": "A system for turning mental clutter into captured commitments, clear next actions, and regular review.",
    "readIf": "Your head is full of open loops, reminders, half-decisions, and vague tasks that keep resurfacing at the worst possible time.",
    "tags": [
      "productivity",
      "execution",
      "systems"
    ],
    "featured": false,
    "order": 11
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

**1. Your mind is for having ideas, not holding them.**
Allen's starting point is that the brain is a bad reminder system. It recalls obligations by association and anxiety, not by priority or context.

**2. Capture everything.**
Open loops create background stress because the mind does not trust that they will resurface. A trusted external system reduces the need to rehearse every obligation.

**3. Define the next action.**
Vague tasks stay stuck because they hide the physical next move. "Plan launch" is fog; "email Maya for the launch checklist" is actionable.

**4. Review is what makes the system trustworthy.**
A list you never review becomes another pile. The weekly review reconnects projects, next actions, waiting-for items, and calendar commitments.

## Key frameworks

**Inbox to next action.** For each captured item, decide: is it actionable? If yes, what is the next visible action? If not, is it trash, reference, or someday?

**Two-minute rule.** If a task can be done immediately in roughly two minutes, do it instead of storing and reprocessing it.

**Weekly review.** Clear inboxes, review projects, update next actions, and make sure nothing important depends on memory alone.

## When to reach for this book

- When you feel overwhelmed by small tasks.
- When your system is scattered across notes, email, chat, and memory.
- When projects stall because next actions are unclear.
- When planning creates more anxiety than control.

## Memorable ideas and lines

The book's lasting move is the next-action question. Most overwhelm is not just volume; it is volume plus ambiguity.
