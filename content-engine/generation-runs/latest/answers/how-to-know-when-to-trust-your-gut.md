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
  "id": "how-to-know-when-to-trust-your-gut",
  "frontmatter": {
    "question": "How to know when to trust your gut",
    "description": "Gut feeling can be expertise or noise. Kahneman's two-condition test shows when intuition deserves trust, when it needs structure, and why confidence is the wrong signal.",
    "books": [
      "thinking-fast-and-slow"
    ],
    "date": "2026-06-09",
    "featured": false,
    "tags": [
      "decision-making",
      "judgment",
      "intuition"
    ]
  },
  "headings": [
    "What intuition actually is",
    "The two-condition test",
    "The cruel twist: confidence doesn't discriminate",
    "A practical sorting of your own life",
    "The summary test"
  ],
  "content_packet": null
}
```

## Source Book Context

### Thinking, Fast and Slow

```json
{
  "id": "thinking-fast-and-slow",
  "title": "Thinking, Fast and Slow",
  "author": "Daniel Kahneman",
  "year": 2011,
  "oneLiner": "A map of the two systems that run your mind — and the predictable ways the fast one fools you.",
  "readIf": "You make judgments under uncertainty for a living — hiring, investing, forecasting, designing — and want to know where your intuition is trustworthy and where it is confidently wrong.",
  "tags": [
    "decision-making",
    "psychology",
    "judgment"
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

**1. System 1 and System 2.**
System 1 is fast, automatic, effortless, and always on: it reads faces, completes "bread and...", and generates impressions before you ask for them. System 2 is slow, deliberate, and lazy: it does logic, comparison, and self-control, but only when summoned — and it tires. The central drama of the book is that System 2 believes it is the hero while mostly rubber-stamping System 1's suggestions.

**2. WYSIATI — What You See Is All There Is.**
System 1 builds the most coherent story possible from the information at hand and *does not flag what's missing*. Confidence tracks the coherence of the story, not the quality or completeness of the evidence. This single mechanism underwrites overconfidence, framing effects, and base-rate neglect: a vivid description of a tidy, bookish person swamps the fact that there are vastly more farmers than librarians.

**3. Substitution: answering an easier question.**
Faced with a hard question ("Should I invest in this company?"), System 1 quietly substitutes an easier one ("Do I like this founder?") and answers that instead — without notifying you of the swap. Most intuitive errors are correct answers to the wrong question.

**4. Anchoring, availability, and representativeness.**
The three classic heuristics. Anchoring: any number on the table — even a random one — pulls your estimate toward it. Availability: ease of recall masquerades as frequency (plane crashes feel common; dishwasher accidents don't). Representativeness: similarity to a stereotype overrides statistics.

**5. Loss aversion and prospect theory.**
Losses loom roughly twice as large as equivalent gains, and outcomes are evaluated relative to a reference point, not in absolute terms. This explains why people reject favorable gambles, hold losing positions too long, and why a "discount" and a "surcharge" of identical size produce different behavior.

**6. The two selves: experiencing vs. remembering.**
The remembering self scores an experience by its peak and its ending (the peak-end rule) and largely ignores duration. We make decisions to serve the remembering self — choosing the vacation that will make the better story rather than the better week.

**7. Regression to the mean wears a disguise.**
Exceptional performance is partly luck, so it is usually followed by something closer to average — no causal story require

[Excerpt truncated for prompt budget.]

## Current Markdown Body

People ask this as a career question, a product question, and a leadership question: should I trust the bad gut feeling about this company, this hire, this feature, this strategy? Reddit discovery surfaced both personal versions ("bad gut feeling about company") and organizational versions, like a product designer dealing with a PM who launches features from intuition without data.

There's a precise answer, and it comes from an unlikely collaboration: Daniel Kahneman — the great skeptic of expert judgment — and Gary Klein, the great defender of expert intuition, spent years adversarially working out when they were each right. The result, reported in [*Thinking, Fast and Slow*](/books/thinking-fast-and-slow/), is a two-condition test.

## What intuition actually is

Strip the mysticism: intuition is **recognition**. Herbert Simon's definition, which Kahneman endorses: "The situation has provided a cue; this cue has given the expert access to information stored in memory, and the information provides the answer. Intuition is nothing more and nothing less than recognition." A chess master "sees" the strong move the way you "see" that a friend is angry from one word on the phone — thousands of stored patterns, retrieved instantly.

This definition does the work, because pattern retrieval can only be valid if the patterns were learnable in the first place.

## The two-condition test

Your intuition in a domain is trustworthy only if **both** conditions hold:

1. **The environment is regular.** Stable cause-and-effect relationships exist to be learned. Chess, firefighting, anesthesiology, driving — regular. Stock picking, long-range geopolitical forecasting, predicting startup success from a pitch — irregular, dominated by luck and shifting dynamics. No regularity, nothing to recognize.
2. **You've had prolonged practice with rapid, clear feedback.** The anesthesiologist learns because consequences arrive in minutes; the radiologist learns slowly because feedback is delayed and often missing. Years of experience without feedback build seniority, not skill.

Fail either condition and what feels like intuition is what Kahneman bluntly calls it: **"heuristics" — answers to easier questions.** The pitch *resembles* past winners (representativeness). The risk feels large because an example comes easily to mind (availability). You like the candidate, so they seem competent (the halo effect).

## The cruel twist: confidence doesn't discriminate

The feeling of intuitive certainty is identical in valid and invalid domains. Confidence, Kahneman shows, tracks the **coherence** of the story your mind has built and the **ease** with which it came — not the reliability of the evidence. The political pundit and the chess master feel the same glow. This is why "I just know" is data about your psychology, not about the world, until you've checked the two conditions.

So never evaluate someone's intuition — including yours — by how confident it feels. Evaluate the *domain*: was this learnable, and did they get the reps with feedback?

## A practical sorting of your own life

Run the test over the judgments you make routinely:

- **Probably trustworthy**: code smells in a stack you've worked in for years (fast feedback from bugs); reading a regular customer's mood; debugging systems you've operated through many incidents; a chess opening; a familiar road.
- **Probably not, despite feeling identical**: which startup will win; how a hire will perform from interviews alone (notoriously low-validity — use structured scoring); which feature will drive retention before testing; market timing; what "users want" without recent contact with users.

For the second category, Kahneman's prescription isn't agonized deliberation — it's **structure**: break the judgment into independent dimensions, score them separately, use base rates, and let the intuition speak *last*, after the evidence is in, not first. Delaying intuition is the trick: a gut feeling formed after disciplined evidence collection is far more valid than one formed in the first five minutes and defended thereafter.

## The summary test

Before trusting a gut feeling, ask three questions: **Is this world regular enough to have patterns? Did I get long practice with fast, clear feedback in it? Am I answering the actual question, or an easier one that resembles it?** Two yeses and an honest answer to the third, and your intuition is probably real expertise. Anything less, and the right response to "I just have a feeling about this" is the one Kahneman taught a generation of readers: that's not insight — that's System 1, telling a coherent story with whatever it happened to see.
