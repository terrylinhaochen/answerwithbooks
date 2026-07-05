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
  "id": "the-lean-startup",
  "frontmatter": {
    "title": "The Lean Startup",
    "author": "Eric Ries",
    "year": 2011,
    "oneLiner": "A method for learning under extreme uncertainty: build the smallest thing that tests the riskiest assumption, measure honestly, and learn before you run out of time.",
    "readIf": "You are tempted to build a complete product before you know whether the underlying customer, value, or growth assumptions are true.",
    "tags": [
      "startups",
      "experiments",
      "product"
    ],
    "featured": false,
    "order": 7
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

**1. Startups are learning machines.**
Ries defines the startup problem as uncertainty, not execution. A startup is not just a small company; it is an institution searching for a repeatable model. The main output should be validated learning, not features shipped.

**2. Build-Measure-Learn.**
The famous loop is often misunderstood as "ship fast." The real point is to shorten the distance between an assumption and evidence. Build only enough to measure the riskiest belief, then use the result to learn what to do next.

**3. MVP means minimum learning vehicle.**
An MVP is not a bad first version of the product. It is the smallest artifact that can test a real assumption. Sometimes that is a landing page, a concierge workflow, a prototype, a manual service, or a sales conversation.

**4. Vanity metrics lie.**
Traffic, signups, downloads, and likes can all rise while the business remains unproven. Useful metrics are actionable, accessible, and auditable. They tell you what changed, why it might have changed, and what to do next.

**5. Pivot or persevere.**
The loop needs a decision point. If the evidence undermines the core assumption, change the strategy while preserving what you learned. If it supports the assumption, invest more.

## Key frameworks

**Riskiest assumption test.** Before building, write the assumption that would kill the idea if false. Then design the smallest test that can expose it.

**Learning milestone.** Replace "launch MVP by Friday" with "learn whether clinics will pay to solve appointment no-shows by Friday." The product artifact is subordinate to the learning.

**Cohort over aggregate.** Look at behavior by cohort and exposure, not just total numbers. Aggregate growth can hide that every new group churns the same way.

## When to reach for this book

- Before building a polished MVP.
- When a team is shipping but not learning.
- When growth metrics look good but retention or willingness to pay is unclear.
- When deciding whether a failure is a feature problem or a thesis problem.

## Memorable ideas and lines

The book's useful discipline is not "move fast." It is "make the next build answer a question that matters."
