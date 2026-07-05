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
  "id": "never-split-the-difference",
  "frontmatter": {
    "title": "Never Split the Difference",
    "author": "Chris Voss with Tahl Raz",
    "year": 2016,
    "oneLiner": "A negotiation playbook centered on tactical empathy, listening, labels, mirrors, and calibrated questions.",
    "readIf": "You are negotiating salary, scope, price, deadlines, or conflict and your default move is either over-explaining or giving ground too quickly.",
    "tags": [
      "negotiation",
      "communication",
      "career"
    ],
    "featured": false,
    "order": 15
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

**1. Negotiation is information discovery.**
Voss treats negotiation less as argument and more as finding the constraints, fears, incentives, and hidden no's that shape the other side.

**2. Tactical empathy is not agreement.**
Labeling what the other person seems to feel can lower defensiveness and surface information without conceding the point.

**3. Calibrated questions create movement.**
Questions like "How am I supposed to do that?" invite the other side to solve the constraint with you instead of forcing an immediate yes/no fight.

**4. No can be useful.**
People feel safer when they can reject, clarify, or set boundaries. A forced yes can be less informative than an honest no.

## Key frameworks

**Mirroring.** Repeat the last few important words to invite elaboration.

**Labeling.** Name the apparent emotion or constraint: "It sounds like timeline risk is the main concern."

**Calibrated how/what questions.** Keep the conversation solving rather than positional.

## When to reach for this book

- Before salary or compensation negotiations.
- When a scope or deadline conversation has become positional.
- When you need information more than a dramatic pitch.
- When the relationship has to continue after the negotiation.

## Memorable ideas and lines

The book's useful move is to slow down and draw out constraints before bargaining over terms.
