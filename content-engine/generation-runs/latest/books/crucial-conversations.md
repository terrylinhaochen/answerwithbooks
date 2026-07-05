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
  "id": "crucial-conversations",
  "frontmatter": {
    "title": "Crucial Conversations",
    "author": "Kerry Patterson, Joseph Grenny, Ron McMillan, and Al Switzler",
    "year": 2002,
    "oneLiner": "A practical framework for conversations where stakes are high, opinions differ, and emotions can derail the outcome.",
    "readIf": "You need to talk about conflict, feedback, performance, money, trust, or expectations without turning the conversation into avoidance or a fight.",
    "tags": [
      "communication",
      "conflict",
      "management"
    ],
    "featured": false,
    "order": 14
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

**1. Safety precedes substance.**
When people feel unsafe, they move to silence or violence: withholding, masking, attacking, controlling, or defensiveness. The conversation cannot improve until safety returns.

**2. Shared meaning is the goal.**
The point is not to win the exchange. It is to get more accurate information into the shared pool so the decision or relationship can improve.

**3. Stories create emotions.**
People react not only to facts but to the story they tell about those facts. Slowing down enough to separate observation from interpretation changes the conversation.

**4. Mutual purpose keeps the door open.**
Hard messages land better when both sides can see the larger aim they still share.

## Key frameworks

**STATE.** Share your facts, tell your story, ask for others' paths, talk tentatively, and encourage testing.

**Return to safety.** When the conversation gets defensive, pause the content and repair mutual purpose or mutual respect.

**Start with heart.** Know what you really want before your ego starts optimizing for being right.

## When to reach for this book

- Before performance feedback or conflict conversations.
- When avoidance has become expensive.
- When a team keeps confusing politeness with alignment.
- When a conversation needs both honesty and relationship protection.

## Memorable ideas and lines

The central discipline is to protect the conditions under which truth can enter the room.
