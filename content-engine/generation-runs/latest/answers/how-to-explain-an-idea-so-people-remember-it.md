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
  "id": "how-to-explain-an-idea-so-people-remember-it",
  "frontmatter": {
    "question": "How to explain an idea so people remember it",
    "description": "When people understand your product only after a long explanation, the idea is not packaged yet. Made to Stick shows how to find the core, make it concrete, and turn explanation into recall.",
    "books": [
      "made-to-stick",
      "the-wisdom-of-crowds"
    ],
    "date": "2026-06-17",
    "featured": false,
    "tags": [
      "communication",
      "marketing",
      "positioning"
    ]
  },
  "headings": [
    "Start with the Curse of Knowledge",
    "Find the core",
    "Make it concrete",
    "Test repeatability",
    "A simple packaging workflow"
  ],
  "content_packet": null
}
```

## Source Book Context

### Made to Stick

```json
{
  "id": "made-to-stick",
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
  "headings": [
    "Core lessons",
    "Key frameworks",
    "When to reach for this book",
    "Memorable ideas and lines"
  ]
}
```

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

### The Wisdom of Crowds

```json
{
  "id": "the-wisdom-of-crowds",
  "title": "The Wisdom of Crowds",
  "author": "James Surowiecki",
  "year": 2004,
  "oneLiner": "Why large groups of ordinary people outguess experts — and the exact conditions under which they stop.",
  "readIf": "You aggregate opinions for a living — running teams, markets, forecasts, or feedback systems — and want to know when the average answer is smart and when it is a stampede.",
  "tags": [
    "collective intelligence",
    "decision-making",
    "markets"
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

**1. The crowd is smart only under conditions.**
The famous opener — Francis Galton's 1906 ox-weighing contest, where the median of 787 villagers' guesses landed within a pound of the ox's true weight — is not a claim that groups are always wise. Surowiecki's whole book is about the *conditions*: diversity of opinion, independence of judgment, decentralization of knowledge, and a mechanism for aggregation. Remove any one and the crowd degrades into a mob, a committee, or an echo.

**2. Errors cancel only when they're uncorrelated.**
The statistical engine underneath everything: each person's guess is truth plus error. If errors are independent, they cancel in aggregate and the signal remains. If everyone's errors point the same way — because they read the same news, defer to the same expert, or watch each other guess — averaging amplifies the shared bias instead of canceling it. Independence isn't a nicety; it's the mechanism.

**3. Diversity beats individual ability (within reason).**
A group of diverse, decently-informed people typically outperforms a group of the very best individuals, because the best individuals tend to think alike and share blind spots. Adding a less-expert but *differently-thinking* member can improve the group; adding another clone of the smartest member usually doesn't.

**4. Information cascades: how smart individuals make dumb crowds.**
If people decide in sequence and can see earlier choices, early movers' opinions drown out later movers' private information. Each rational individual concludes "all these people can't be wrong" — and a crowd of rational people marches off a cliff. This is the anatomy of bubbles, pile-on funding rounds, and the empty restaurant next to the full one.

**5. Three kinds of problems.**
Cognition problems (questions with answers: how much does the ox weigh, will this ship on time) — crowds excel here. Coordination problems (how do buyers and sellers find each other, which side of the road to drive on) — solved by conventions, norms, and markets. Cooperation problems (taxes, tipping, pollution) — require trust and institutions that make self-interest compatible with the group. Diagnosing which type you face tells you what machinery you need.

## Key frameworks

**The four conditions checklist.** Before trusting any aggregate — a poll, a planning meeting, a prediction market, a feedback d

[Excerpt truncated for prompt budget.]

## Current Markdown Body

The demand signal is not subtle: founders know what they are building but cannot explain it, explainer videos look polished but do not explain the product, and product marketers argue whether the problem is positioning, ICP, or channel execution.

That is usually a packaging problem. The idea may be real, but it has not been made portable.

## Start with the Curse of Knowledge

Chip Heath and Dan Heath's [*Made to Stick*](/books/made-to-stick/) begins with the trap experts fall into: once you know something, it is hard to remember what it felt like not to know it.

That is why product explanations often start too late:

- They name the category before the pain.
- They describe features before the job.
- They use internal distinctions customers do not have.
- They explain the system instead of the moment when someone needs it.

The fix is to start where the listener starts.

## Find the core

Do not ask, "What are all the things this product does?" Ask, "What is the one thing someone must remember?"

Examples:

- Not: "An AI-powered research and synthesis platform."
- Better: "Find the questions buyers are already asking, then publish the answer they should find."
- Not: "A comprehensive A2A and MCP marketplace."
- Better: "A catalog that helps builders find the right agent capability without reading every protocol thread."

The better version may be less complete. That is the point. Completeness is not the same as recall.

## Make it concrete

Abstract: "We improve workflow visibility."

Concrete: "When a podcast episode goes live, you know where it appeared, whether you followed up, and which guest produced pipeline."

Abstract: "We help travelers understand China."

Concrete: "Before you land, you know which apps to install, how to pay, how to ask for help, and what will not work like it does at home."

Concrete ideas travel because people can picture them.

## Test repeatability

James Surowiecki's [*The Wisdom of Crowds*](/books/the-wisdom-of-crowds/) adds a useful test: do not rely on one person's reaction. Collect independent restatements.

Show the explanation to five target users separately. Ask each to explain it back in one sentence. If their versions diverge wildly, your message is not stable yet. If they repeat the wrong part, your emphasis is wrong. If they can tell a friend what it does, you are close.

## A simple packaging workflow

1. Write the user's painful moment.
2. Write the one sentence they should remember.
3. Replace abstract nouns with a concrete scene.
4. Add one example before adding feature detail.
5. Ask five people to explain it back.
6. Keep the version that survives independent retelling.

The goal is not to make the idea smaller. It is to make the handle smaller, so the full idea can be picked up.
