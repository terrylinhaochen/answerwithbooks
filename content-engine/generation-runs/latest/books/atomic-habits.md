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
  "id": "atomic-habits",
  "frontmatter": {
    "title": "Atomic Habits",
    "author": "James Clear",
    "year": 2018,
    "oneLiner": "A behavior-change playbook built around small repeatable actions, identity, cues, and environment design.",
    "readIf": "You keep trying to change by motivation alone and then blaming yourself when the system around the behavior stays the same.",
    "tags": [
      "habits",
      "behavior-change",
      "productivity"
    ],
    "featured": false,
    "order": 12
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

**1. Habits compound.**
Clear frames habits as small actions that matter because they repeat. A single action is tiny; the trajectory is the point.

**2. Identity drives consistency.**
The strongest habits are not only about outcomes. They become votes for the kind of person you are trying to become.

**3. Behavior follows the cue.**
Habits have a loop: cue, craving, response, reward. If the cue and reward are poorly designed, motivation has to do too much work.

**4. Environment beats willpower.**
Make good behaviors obvious, attractive, easy, and satisfying. Make bad behaviors hidden, unattractive, difficult, and unsatisfying.

## Key frameworks

**The four laws.** Make it obvious, attractive, easy, and satisfying.

**Habit stacking.** Attach a new behavior to a stable existing behavior: after I do X, I will do Y.

**Two-minute version.** Shrink the first action until starting becomes easy enough to repeat.

## When to reach for this book

- When procrastination is framed as a character flaw.
- When a desired behavior depends on repeated follow-through.
- When the current environment makes the bad behavior frictionless.
- When a team wants a behavior change, not just a new rule.

## Memorable ideas and lines

The practical test is whether the environment makes the desired action easy to start on a normal day, not an inspired one.
