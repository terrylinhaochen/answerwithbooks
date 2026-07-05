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
  "id": "good-strategy-bad-strategy",
  "frontmatter": {
    "title": "Good Strategy Bad Strategy",
    "author": "Richard Rumelt",
    "year": 2011,
    "oneLiner": "Why strategy is not ambition, values, or a list of goals - it is a diagnosis, a guiding policy, and coherent action.",
    "readIf": "You keep calling goals strategy, or your team has priorities but no real explanation of where to concentrate force.",
    "tags": [
      "strategy",
      "management",
      "focus"
    ],
    "featured": false,
    "order": 6
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

**1. Bad strategy hides the hard part.**
Bad strategy often sounds sophisticated: vision statements, values, financial targets, long initiative lists. Rumelt's point is that these can all avoid the actual work of strategy: naming the central challenge and choosing what not to do.

**2. The kernel: diagnosis, guiding policy, coherent action.**
The most useful framework in the book is the kernel. A good strategy has a diagnosis that explains the situation, a guiding policy that says how you will deal with it, and coherent actions that reinforce each other. Leave out any one and the strategy collapses into either analysis, aspiration, or busyness.

**3. Strategy concentrates force.**
Strategy is not about doing everything better. It is about finding the leverage point where focused effort changes the outcome. In product terms: not "improve activation, retention, monetization, brand, and enterprise readiness," but "the bottleneck is onboarding trust, so every major action for the next cycle reduces perceived switching risk."

**4. Fluff is a warning sign.**
Words like "innovative," "customer-centric," and "world-class" are not automatically wrong, but they often signal that no one has made a choice. If the sentence could be pasted into any competitor's deck, it is probably not strategy.

## Key frameworks

**The strategy audit.** For any strategy memo, underline the diagnosis, guiding policy, and coherent actions in three colors. If one color barely appears, the memo is not ready.

**The bottleneck question.** Ask: if we could improve only one constraint this quarter, which one would change the system? Good strategy begins where the answer gets specific.

**Coherence test.** Each action should make the others more effective. If your roadmap items are individually reasonable but mutually unrelated, you have a portfolio, not a strategy.

## When to reach for this book

- When a planning process produces a long list of priorities.
- When growth feels stuck but the team cannot agree on the real constraint.
- When a company says "strategy" but means revenue target.
- When you need a sharper way to turn research into choices.

## Memorable ideas and lines

The kernel is the book's durable tool: diagnosis, guiding policy, coherent action. The phrase is simple enough to remember and strict enough to expose weak thinking.
