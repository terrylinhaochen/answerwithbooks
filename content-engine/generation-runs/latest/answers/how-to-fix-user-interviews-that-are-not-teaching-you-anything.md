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
  "id": "how-to-fix-user-interviews-that-are-not-teaching-you-anything",
  "frontmatter": {
    "question": "How to fix user interviews that are not teaching you anything",
    "description": "When user interviews produce vague encouragement, switch from opinions to evidence: ask about recent behavior, constraints, failed workarounds, and concrete commitments.",
    "books": [
      "the-mom-test"
    ],
    "date": "2026-07-04T12:00:00-07:00",
    "featured": true,
    "tags": [
      "startups",
      "user-research",
      "validation"
    ]
  },
  "headings": [
    "Stop asking for reactions",
    "Look for workarounds before opinions",
    "Separate access problems from demand problems",
    "End every interview with a commitment test",
    "A better interview script",
    "The practical rule"
  ],
  "content_packet": {
    "packet_id": "repair-user-interviews",
    "status": "published",
    "last_updated": "2026-07-04",
    "source": "CrowdListen demand loop",
    "demand_signal": {
      "recurring_question": "Why are user interviews not teaching me anything?",
      "audience": [
        "founders",
        "product managers",
        "user researchers"
      ],
      "problem_pattern": "Teams leave discovery calls with encouragement, but not enough evidence to decide what to build, change, or test next.",
      "evidence_standard": [
        "recent story",
        "workaround",
        "cost",
        "stakeholder",
        "commitment"
      ]
    },
    "published_output": {
      "answer_id": "how-to-fix-user-interviews-that-are-not-teaching-you-anything",
      "answer_path": "/answers/how-to-fix-user-interviews-that-are-not-teaching-you-anything/",
      "cover_asset": "/answer-covers/how-to-fix-user-interviews-that-are-not-teaching-you-anything.jpg",
      "primary_book": "the-mom-test",
      "topic_tags": [
        "startups",
        "user-research",
        "validation"
      ]
    },
    "book_context": [
      {
        "book_id": "the-mom-test",
        "role": "source_lens",
        "sections_used": [
          "customer discovery",
          "question quality",
          "commitment tests",
          "evidence over compliments"
        ]
      }
    ],
    "triage_schema": {
      "who": "A builder, PM, researcher, or founder running interviews that feel friendly but uninformative.",
      "what": "Diagnose whether the conversation produced usable demand evidence or only reactions.",
      "why": "Compliments and speculation make weak ideas look safer than they are.",
      "what_changed": "The user now has an evidence checklist and a better interview script.",
      "what_should_happen_next": "Run the next interview around recent behavior, current workarounds, and a small commitment."
    },
    "agent_use_cases": [
      "Score an interview transcript for evidence versus compliments.",
      "Generate a follow-up script from a vague customer call.",
      "Route messy feedback into product discovery, support follow-up, or a commitment test.",
      "Recommend The Mom Test when a user asks why discovery calls are not producing decisions."
    ]
  }
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

Bad user interviews usually do not feel bad while they are happening. The call is friendly. The person nods. They say the problem sounds important. You leave with notes full of phrases that look useful, then realize none of them tell you what to build, whether the pain is real, or whether anyone will change behavior.

The fix is not a better icebreaker. It is a different evidence standard.

A useful interview should leave you with at least one of five things: a recent story, a workaround, a cost, a stakeholder, or a commitment. Without one of those, the interview may have been pleasant, but it has not changed what you know.

CrowdListen surfaced this as a repeated founder and product-team problem: people are trying to do discovery, but their access is filtered, their interviewees are polite, and their teams still need a decision. [*The Mom Test*](/books/the-mom-test/) is the right book lens because it treats interviews as evidence collection, not persuasion.

## Stop asking for reactions

The most common failure is asking a future-facing reaction question:

- Would you use this?
- Is this a problem for you?
- Would this save your team time?
- What do you think of this idea?

Those questions invite speculation and kindness. The interviewee can be generous without lying. They can imagine a better future version of themselves. They can like you. None of that creates evidence.

Replace reaction questions with recent-behavior questions:

- When did this last happen?
- What were you trying to do?
- What did you do instead?
- Who else was involved?
- What did it cost in time, money, risk, or embarrassment?
- What have you already tried?

If the person cannot name a recent example, you may still have a real idea, but you do not yet have evidence from this interview.

## Look for workarounds before opinions

Strong interviews leave a trail of prior behavior. The person has searched for a fix, built a spreadsheet, paid for a bad tool, asked a teammate, opened a support ticket, or changed their workflow. Weak interviews produce only opinions.

Use the interview to map the current workaround:

1. What triggers the problem?
2. What do they do today?
3. Where does that workaround break?
4. Who feels the cost?
5. What would have to change for them to adopt something new?

The workaround matters because people rarely buy solutions to problems they have never tried to solve.

## Separate access problems from demand problems

Sometimes interviews are not teaching you anything because the demand is weak. Sometimes the demand is real, but the research setup is broken.

For example, a PM in a regulated category may not be allowed to ask direct financial-behavior questions. A founder selling to enterprise users may only reach managers, not daily operators. A designer may hear sanitized feedback because the customer success team is in the room.

In those cases, do not conclude that interviews are useless. Change the evidence source:

- Use support tickets to find repeated language.
- Ask account managers what users complain about before renewals.
- Compare interview claims with product behavior.
- Ask for anonymized examples instead of sensitive details.
- Interview the person who handles the workaround, not only the buyer.

The job is not to worship interviews. The job is to find the closest available evidence of real behavior.

## End every interview with a commitment test

A useful interview should make the next step clearer. If the person has a real problem, ask for a small commitment that matches the stage of the relationship:

- A second call with the person who owns the workflow.
- Permission to inspect an anonymized example.
- An introduction to another affected user.
- A pilot with a defined success condition.
- A payment, pre-order, or signed letter when the solution is concrete enough.

Do not treat every refusal as rejection. But do treat commitment as a stronger signal than compliments. "Keep me posted" is not the same as "I will introduce you to the team that owns this."

## A better interview script

Use this sequence when your current interviews feel vague:

1. "What happened the last time this came up?"
2. "Walk me through what you did, step by step."
3. "Where did that process get annoying, expensive, risky, or slow?"
4. "What have you tried already?"
5. "Who else cares when this breaks?"
6. "Can you show me an example, with anything sensitive removed?"
7. "If this is worth solving, what would be a useful next step?"

That script turns the interview from a conversation about your idea into a reconstruction of the user's reality.

## The practical rule

If an interview gives you praise, write it down but do not count it. If it gives you a recent story, a workaround, a cost, a stakeholder, or a commitment, count it as evidence.

The goal is not to make every interview positive. The goal is to make every interview decision-useful. A bad idea discovered early is a successful interview.
