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
  "id": "four-thousand-weeks",
  "frontmatter": {
    "title": "Four Thousand Weeks",
    "author": "Oliver Burkeman",
    "year": 2021,
    "oneLiner": "A counterweight to productivity culture: finite time means the central task is choosing, not optimizing everything.",
    "readIf": "You are trying to become efficient enough to fit everything in and slowly realizing that the premise may be the trap.",
    "tags": [
      "time",
      "priorities",
      "burnout"
    ],
    "featured": false,
    "order": 13
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

**1. Time is finite.**
Burkeman's title is the provocation: a human life is roughly four thousand weeks. The point is not despair. It is that finitude makes choice unavoidable.

**2. Efficiency can expand the queue.**
Getting faster often lets more obligations in. If the standard is "eventually everything," productivity becomes a way to avoid deciding.

**3. Strategic underachievement is necessary.**
You will neglect many things. The question is whether that neglect is accidental or chosen.

**4. Attention is life in practice.**
What you attend to is not a side issue. It is the substance of how finite time is spent.

## Key frameworks

**Choose what to fail at.** Decide which areas can be merely adequate so the important few can receive real attention.

**One big project.** Keep the active priority narrow enough that it can actually receive progress.

**Settling as commitment.** A chosen path is not the enemy of possibility; it is how possibility becomes life.

## When to reach for this book

- When productivity systems are making you more anxious.
- When every option feels important.
- When burnout comes from trying to honor every possible obligation.
- When the real question is what to stop, not how to do more.

## Memorable ideas and lines

The useful reframe: the problem is not that you have failed to fit everything in. The problem is that everything was never going to fit.
