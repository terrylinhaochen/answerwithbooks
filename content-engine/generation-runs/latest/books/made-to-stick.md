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
  "id": "made-to-stick",
  "frontmatter": {
    "title": "Made to Stick",
    "author": "Chip Heath and Dan Heath",
    "year": 2007,
    "oneLiner": "Why some ideas survive and spread: they are simple, unexpected, concrete, credible, emotional, and carried by stories.",
    "readIf": "You understand your idea but cannot make other people remember, repeat, or act on it.",
    "tags": [
      "communication",
      "marketing",
      "ideas"
    ],
    "featured": false,
    "order": 9
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

**1. The Curse of Knowledge.**
Once you know something deeply, it becomes hard to imagine not knowing it. Experts skip steps, use abstractions, and assume the audience sees the same structure they do. Most unclear messaging starts here.

**2. SUCCESs.**
The Heath brothers' checklist is simple, unexpected, concrete, credible, emotional, stories. It is not a formula for hype; it is a checklist for making an idea survive contact with a distracted audience.

**3. Find the core.**
Sticky ideas are not comprehensive. They choose the one load-bearing point and make it impossible to miss. If everything matters equally, nothing sticks.

**4. Concrete beats abstract.**
People remember images, examples, and specific situations better than categories. "A low-friction onboarding flow" is abstract. "A user can finish setup before their coffee cools" is concrete.

**5. Stories are simulation.**
Stories let people rehearse action. A good example does more than decorate an argument; it shows the listener what to do.

## Key frameworks

**The one-sentence core.** If someone repeats only one sentence after reading this, what should it be?

**Concrete swap.** Replace abstract nouns with a scene, number, object, or before/after contrast.

**Repeatability test.** Could a reader explain the idea to a friend without your slide deck? If not, the idea is not packaged yet.

## When to reach for this book

- When a startup pitch is technically accurate but forgettable.
- When a guide has good advice but no memorable handle.
- When a product page explains features but not the idea.
- When research has many themes and needs a sharp public takeaway.

## Memorable ideas and lines

The most reusable warning is the Curse of Knowledge: the better you understand the thing, the more likely you are to explain it from the wrong starting point.
