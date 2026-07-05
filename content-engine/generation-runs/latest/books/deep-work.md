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
  "id": "deep-work",
  "frontmatter": {
    "title": "Deep Work",
    "author": "Cal Newport",
    "year": 2016,
    "oneLiner": "A practical argument that valuable work increasingly depends on protecting long, undistracted stretches of attention.",
    "readIf": "Your day is full of Slack, email, meetings, and context switching, and the work that actually moves your life or company forward keeps getting postponed.",
    "tags": [
      "focus",
      "productivity",
      "work"
    ],
    "featured": false,
    "order": 10
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

**1. Deep work is economically rare.**
Newport's core distinction is between deep work, which requires sustained attention and creates new value, and shallow work, which keeps the system moving but rarely compounds. The problem is that shallow work is easier to measure and easier to ask for.

**2. Attention residue is real.**
Every switch leaves part of the mind behind. A day broken into small fragments can feel busy while never giving the hardest problem enough uninterrupted contact.

**3. Focus needs ritual, not mood.**
The useful move is to decide when, where, for how long, and under what rules deep work happens. Willpower is weak; a repeatable container is stronger.

**4. Shallow work needs a budget.**
The goal is not to ignore coordination. It is to stop coordination from silently consuming the hours that should produce the valuable artifact.

## Key frameworks

**The deep work block.** Put the hardest work on the calendar with a defined start, stop, and output. Treat it as an appointment with the work, not an aspiration.

**The shutdown ritual.** End the day by capturing open loops and deciding the next action, so the mind does not keep rechecking everything at night.

**The shallow-work audit.** List recurring tasks and ask which can be batched, reduced, delegated, or made asynchronous.

## When to reach for this book

- When your work requires writing, design, coding, strategy, or analysis.
- When interruptions feel like the default operating system.
- When the team confuses responsiveness with productivity.
- When your most important project never receives your best attention.

## Memorable ideas and lines

The practical idea is simple: attention is not a vibe. It is a production condition.
