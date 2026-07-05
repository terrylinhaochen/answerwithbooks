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
  "id": "dont-make-me-think",
  "frontmatter": {
    "title": "Don't Make Me Think",
    "author": "Steve Krug",
    "year": 2000,
    "oneLiner": "A usability classic built on one standard: a page works when users can understand what it is, what they can do, and where to go without decoding it.",
    "readIf": "Your product page, catalog, guide, or app screen is visually polished but users still hesitate, bounce, or ask what they are supposed to do.",
    "tags": [
      "design",
      "usability",
      "web"
    ],
    "featured": false,
    "order": 8
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

**1. People scan, they do not read.**
Most users do not approach a page like a document. They glance, scan, click the first plausible thing, and backtrack if wrong. Design that assumes careful reading is already losing.

**2. Self-evidence beats explanation.**
The best interface does not require instructions. A user should be able to identify the page's purpose, main choices, and next action quickly. If the page needs a paragraph explaining itself, the design is carrying hidden debt.

**3. Conventions are useful.**
Novelty is expensive when users are trying to get something done. Navigation, labels, search, breadcrumbs, buttons, and page hierarchy work better when they behave roughly as expected.

**4. Usability testing can be small.**
Krug's practical contribution is the cheap test: watch a few real people use the page and narrate what they think. You do not need a lab to find the obvious confusion.

## Key frameworks

**The squint test.** Blur your eyes or step back. What is the page about? What is primary? Where would you click first?

**The five-second question.** After five seconds, can a new user say what this is, why it matters, and what they can do next?

**Watch, do not defend.** During a test, do not explain the page. If the user misses the point, that is the point.

## When to reach for this book

- Before shipping a landing page, catalog, navigation system, or onboarding flow.
- When the team wants to add explanatory copy instead of fixing structure.
- When analytics show traffic but not action.
- When a page is "beautiful" and still unclear.

## Memorable ideas and lines

The title is the test. Every unnecessary question in a user's mind is friction: What is this? Is this clickable? Am I in the right place? What happens next?
