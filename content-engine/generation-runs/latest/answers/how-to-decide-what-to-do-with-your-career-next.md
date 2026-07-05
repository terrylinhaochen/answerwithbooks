# Regenerate Answer

Use the content spec below to regenerate this answer as a complete Astro content Markdown file.
Return only the final Markdown file with YAML frontmatter. Preserve the slug and book links. Keep the answer practical and grounded.
Use paragraphs as the default. Use lists only for scripts, checks, or steps. Do not invent quotations.

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


## Current Answer Record

```json
{
  "id": "how-to-decide-what-to-do-with-your-career-next",
  "frontmatter": {
    "question": "How to decide what to do with your career next",
    "description": "Career uncertainty needs evidence, not one perfect answer. Designing Your Life helps prototype paths; So Good They Can't Ignore You keeps the choice grounded in career capital.",
    "books": [
      "designing-your-life",
      "so-good-they-cant-ignore-you"
    ],
    "date": "2026-06-22",
    "featured": false,
    "tags": [
      "career",
      "work",
      "experiments"
    ]
  },
  "headings": [
    "Generate more than one path",
    "Prototype before leaping",
    "Check your career capital",
    "The decision sequence",
    "The working rule"
  ],
  "content_packet": null
}
```

## Source Book Context

### Designing Your Life

```json
{
  "id": "designing-your-life",
  "title": "Designing Your Life",
  "author": "Bill Burnett and Dave Evans",
  "year": 2016,
  "oneLiner": "A design-thinking approach to career and life decisions: prototype paths instead of trying to think your way into certainty.",
  "readIf": "You feel stuck between possible lives and need a way to test directions without treating every decision as irreversible.",
  "tags": [
    "career",
    "life-design",
    "experiments"
  ],
  "headings": [
    "Core lessons",
    "Key frameworks",
    "When to reach for this book",
    "Memorable ideas and lines"
  ]
}
```

## Core lessons

**1. Designers build their way forward.**
Burnett and Evans treat life choices as design problems. You do not need a perfect answer before trying a prototype.

**2. Wayfinding beats grand certainty.**
Energy, engagement, and curiosity are data. The point is to notice where real experience gives information that planning cannot.

**3. There are multiple good lives.**
The odyssey-plan exercise deliberately creates several plausible paths, weakening the fantasy that there is one hidden correct answer.

**4. Prototype the decision.**
Conversations, small projects, shadowing, and experiments let you learn about a path before overcommitting.

## Key frameworks

**Odyssey plans.** Sketch multiple five-year paths: a current path, an alternative if that disappeared, and a wilder version.

**Prototype conversation.** Talk to someone living a version of the path to learn what it is actually like.

**Gravity problem check.** Do not design around constraints you cannot change; redirect effort toward choices where action exists.

## When to reach for this book

- When a career decision feels overdetermined and underinformed.
- When someone is stuck trying to pick the perfect path.
- When a change should be tested before becoming a leap.
- When the user needs experiments, not motivational advice.

## Memorable ideas and lines

The core move is to turn "What should I do with my life?" into prototypes that create new evidence.

### So Good They Can't Ignore You

```json
{
  "id": "so-good-they-cant-ignore-you",
  "title": "So Good They Can't Ignore You",
  "author": "Cal Newport",
  "year": 2012,
  "oneLiner": "A career argument that rare and valuable work usually comes from building rare and valuable skills first.",
  "readIf": "You are trying to choose a career path and suspect that advice to simply follow your passion is too thin to guide real decisions.",
  "tags": [
    "career",
    "work",
    "skill-building"
  ],
  "headings": [
    "Core lessons",
    "Key frameworks",
    "When to reach for this book",
    "Memorable ideas and lines"
  ]
}
```

## Core lessons

**1. The passion hypothesis is incomplete.**
Newport argues that loving your work is often an outcome of mastery, autonomy, and impact, not a starting instruction.

**2. Career capital comes first.**
Rare and valuable jobs require rare and valuable skills. Building those skills creates leverage for control, mission, and better work.

**3. The craftsman mindset beats the passion mindset.**
Instead of asking what the job offers you, ask what valuable skill you are producing for the world.

**4. Control has traps.**
People want more autonomy, but pursuing control before having enough career capital can backfire.

## Key frameworks

**Career capital audit.** What rare and valuable skills do you have, and where are they compounding?

**Deliberate practice.** Improve specific skills through feedback, difficulty, and repetition rather than passive time served.

**Control test.** Ask whether you have enough leverage to support the autonomy you want.

## When to reach for this book

- When career advice feels too vague.
- When someone wants autonomy before skill leverage.
- When a career change needs a practical bridge.
- When the question is how to become valuable, not just how to feel inspired.

## Memorable ideas and lines

The useful reframe is to stop asking only what work you want and start asking what capabilities can earn better work.

## Current Markdown Body

Career questions often arrive as one giant decision: should I quit, switch fields, start over, take the safer job, follow curiosity, or grind where I am? The size of the question makes people freeze.

The better move is to turn the decision into evidence.

## Generate more than one path

[*Designing Your Life*](/books/designing-your-life/) argues that there is rarely one correct life waiting to be discovered. The useful exercise is to sketch multiple plausible paths.

Try three versions:

- the path you are already on if it gets healthier,
- a path you would pursue if the current one disappeared,
- a more unusual path you keep dismissing too quickly.

This weakens the false binary between "stay" and "blow everything up."

## Prototype before leaping

Do not decide from imagination alone. Prototype the path:

- talk to someone doing the work,
- shadow a day if possible,
- do a small project,
- take a short contract,
- write the portfolio piece,
- test the commute, schedule, or income reality.

A prototype is not a commitment. It is a cheap way to learn what the path feels like from the inside.

## Check your career capital

Cal Newport's [*So Good They Can't Ignore You*](/books/so-good-they-cant-ignore-you/) adds a necessary constraint. Autonomy, mission, and rare opportunities usually require rare and valuable skills.

Ask:

- What skills do I have that are already valuable?
- Which ones could compound fastest?
- What path gives me better practice and feedback?
- Am I seeking control before I have leverage?

This prevents career design from becoming pure mood tracking.

## The decision sequence

1. Write three plausible paths.
2. Identify the unknowns in each.
3. Prototype the cheapest unknown first.
4. Audit the career capital each path builds.
5. Choose the next reversible step, not the final identity.

## The working rule

Do not ask your anxious brain to solve your whole career in one sitting. Create evidence. Then let the next step become obvious enough to take.
