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
  "id": "how-to-run-user-interviews-that-do-not-lie-to-you",
  "frontmatter": {
    "question": "How to run user interviews that do not lie to you",
    "description": "A compact field guide to user interviews that produce evidence instead of polite encouragement: past behavior, specific incidents, bad-data detection, and commitment tests from The Mom Test.",
    "books": [
      "the-mom-test"
    ],
    "date": "2026-05-05",
    "featured": false,
    "tags": [
      "customer research",
      "interviews",
      "product"
    ]
  },
  "headings": [
    "The premise: everyone lies, politely",
    "The three rules",
    "The taxonomy of bad data",
    "Signals that actually mean something",
    "Practical mechanics",
    "The one-line summary"
  ],
  "content_packet": null
}
```

## Source Book Context

### The Mom Test

```json
{
  "id": "the-mom-test",
  "title": "The Mom Test",
  "author": "Rob Fitzpatrick",
  "year": 2013,
  "oneLiner": "How to talk to customers and learn the truth when everyone is lying to you — including your mom.",
  "readIf": "You are about to build something and want to find out whether anyone actually needs it, before you spend a year finding out the hard way.",
  "tags": [
    "startups",
    "customer research",
    "product"
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

**1. Everyone lies to you, politely.**
People you interview want the conversation to go well. Your mom says your app idea is great because she loves you; strangers say it's great because it ends the meeting faster. The lie isn't malicious — it's social lubricant. The burden is on you to ask questions that even a polite person can't answer with a comfortable falsehood. The Mom Test is named for the standard it sets: your questions should be so grounded in facts that *even your mom* couldn't mislead you with them.

**2. Talk about their life, not your idea.**
The moment you pitch, the data is contaminated. Every question afterward measures how nice the person is, not how real the problem is. The fix is structural: ask about what they did last week, what it cost them, what they tried, who else they complained to. Their past behavior is evidence; their opinion of your future product is not.

**3. Compliments are worthless; commitments are gold.**
"That's really cool" is a deflection, not a data point. What counts is anything that costs the person something: time (a scheduled follow-up with a clear agenda), reputation (an intro to their boss or budget owner), or money (a pre-order, a letter of intent, a deposit). Fitzpatrick calls these *currency*. If a meeting ends with kind words and nothing on the calendar, it didn't go well — it went nowhere.

**4. Bad news is good news.**
A lukewarm "meh" that arrives in week two saves you the year you would have spent discovering it in production. The goal of customer conversations is truth, not validation. Learning that a problem doesn't matter, or that the customer has no budget, or that they've tried nothing to solve it (a tell that they don't really care) is a *successful* outcome.

**5. Some problems don't matter.**
People will cheerfully confirm that something is annoying. The real questions are: Where does this rank against everything else on their plate? What does it cost them? What have they already tried? If they've never Googled for a solution, the problem isn't burning enough to build a business on.

## Key frameworks

**The three rules of the Mom Test:**
1. Talk about their life instead of your idea.
2. Ask about specifics in the past instead of generics or opinions about the future.
3. Talk less and listen more.

**Question quality check.** Bad: "Would you buy a product that did X?" (invites a

[Excerpt truncated for prompt budget.]

## Current Markdown Body

CrowdListen-style Reddit discovery found the same user-research pain from several angles: PMs asking how to do research when compliance limits access, founders asking where to find early interviewees, and researchers saying interviews are mentally exhausting because staying focused is hard. The shared problem is not "what is the book about?" It is: *How do I get real signal from conversations that are socially, operationally, and cognitively messy?*

Rob Fitzpatrick's [*The Mom Test*](/books/the-mom-test/) is the rare business book that is actually a method — short enough to read in an evening, specific enough to use the next morning. Here is the whole apparatus.

## The premise: everyone lies, politely

The book's title is the standard it sets: your interview questions should be designed so that *even your mother* — the person most motivated to make you feel good — couldn't answer them with comforting falsehoods. The insight is that bad interview data isn't caused by dishonest people; it's caused by questions that make politeness and truth diverge. "Do you like my idea?" forces a kind person to lie. "What did you do the last time you hit this problem?" doesn't.

## The three rules

1. **Talk about their life, not your idea.** The interview is about their workflow, their costs, their attempts to fix things. The moment you pitch, every subsequent answer measures niceness, not need.
2. **Ask about specifics in the past, not generics or the future.** "Would you ever...?", "Do you usually...?", "Would you pay for...?" all invite hypothetical selves who are more organized, more diligent, and freer with money than any real human. The corrective: "When did this last happen? Walk me through it. What did it cost? What did you try?"
3. **Talk less, listen more.** You cannot learn while you are talking. Every minute you spend explaining is a minute of data you didn't collect.

## The taxonomy of bad data

Three contaminants show up in every interview, and each has a standard response:

- **Compliments** ("This is so cool!") — worthless. Deflect and redirect: don't write them down, don't repeat them to your team, get back to their life.
- **Fluff** — generic claims ("I *always*..."), future promises ("I *would definitely*..."), hypotheticals ("I *might*..."). Anchor fluff to reality: "When did that last actually happen?"
- **Ideas** ("You should add...!") — flattering, dangerous, and not your roadmap. Dig for the motivation underneath: "Why do you want that? What would it let you do? How are you coping without it?" The request is rarely the requirement.

There's a fourth contaminant the book is blunt about: **you**. Founders fish for validation, pitch when nervous, and talk formally when they should be casual. The data is only as good as your discipline.

## Signals that actually mean something

- **They've already tried to solve it.** Googled, built a spreadsheet, paid for a workaround. This is the strongest single signal in the method — people with burning problems leave evidence. Its absence is disqualifying: "If they haven't looked for ways of solving it already, they're not going to look for yours."
- **Specificity and emotion.** Real frustration over a specific recent incident beats agreeable generalities about "pain points."
- **Commitment.** The interview's exit measurement. A meeting "went well" only if it ended with the other person giving up something of value: scheduled time with an agenda, an introduction to someone with budget, or money (pre-order, LOI, deposit). "Sounds great, keep me posted" is a rejection delivered politely.

## Practical mechanics

- **Prep three big questions.** Before any conversation, decide with your team the three things you most need to learn. Terrifying questions — the ones that could kill the idea — go first, not last.
- **Keep it casual.** Early learning conversations don't need a lab and a consent form; the best ones feel like normal conversation about their work. Formality invites performance.
- **Take notes in their words**, not your interpretations. "Spends ~3 hrs/week reconciling exports by hand" is data; "loves the idea" is not.
- **Review with the team.** An interview that isn't shared and acted on is a coffee chat.

## The one-line summary

Stop asking people to predict their future behavior or judge your idea; start collecting documented evidence of their past behavior and present commitments. Everything in the book is a technique for making that swap stick under social pressure — and the discipline transfers far beyond startups, to any situation where people would rather be kind to you than accurate.
