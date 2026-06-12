---
title: "The Wisdom of Crowds"
author: "James Surowiecki"
year: 2004
oneLiner: "Why large groups of ordinary people outguess experts — and the exact conditions under which they stop."
readIf: "You aggregate opinions for a living — running teams, markets, forecasts, or feedback systems — and want to know when the average answer is smart and when it is a stampede."
tags: ["collective intelligence", "decision-making", "markets"]
featured: true
order: 3
---

## Core mental models

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

**The four conditions checklist.** Before trusting any aggregate — a poll, a planning meeting, a prediction market, a feedback dashboard — audit it:
1. *Diversity*: do participants bring genuinely different information and priors?
2. *Independence*: did each judgment form before exposure to the others?
3. *Decentralization*: can people draw on local, specific knowledge?
4. *Aggregation*: is there a mechanism that actually combines the inputs (a market, a vote, a median), rather than a discussion where the loudest voice wins?

**Collect first, discuss second.** The most portable practice in the book: gather private, written estimates *before* any group discussion. Discussion is for surfacing reasons, not for forming the number.

**Beware the talkative and the confident.** In deliberating groups, talkativeness and status predict influence far better than accuracy does. Unstructured discussion makes groups more extreme (polarization) and more confident — often while making them less accurate.

**The Columbia/NASA case.** Surowiecki's study of the Columbia shuttle disaster's management meetings shows aggregation failing inside a hierarchy: information existed at the edges, but the meeting structure — status-driven, time-boxed, skeptical of dissent — never let it reach the decision. A crowd was present; no mechanism was.

## When to reach for this book

- When designing any system that pools opinions: forecasting, voting, feedback, prediction, pricing.
- When a team unanimously agrees too quickly — this book explains why that's a warning sign, not a comfort.
- When deciding whether to trust "the market," "the poll," or "what everyone is saying."
- Pairs naturally with *Thinking, Fast and Slow*: Kahneman explains individual error; Surowiecki explains when groups cancel it versus compound it.

## Memorable ideas

> "The best collective decisions are the product of disagreement and contest, not consensus or compromise."

> "Paradoxically, the best way for a group to be smart is for each person in it to think and act as independently as possible."

The ox is the image to keep: 787 amateurs, one number each, no discussion — and the truth falls out of the median. Every smart-crowd system is an attempt to recreate that fairground; every dumb-crowd failure is a story about which of the four conditions broke.

## How I've applied it

CrowdListen is, in a real sense, an attempt to engineer Surowiecki's conditions into software: collect audience reactions independently (before commenters see each other's takes), preserve diversity by sampling beyond the loudest voices, and aggregate mechanically instead of letting a comment section's early replies cascade. The book also changed how I run meetings: estimates and opinions go into writing before anyone speaks. The first time I did this, the silent median of the room disagreed with the person who would have spoken first — and the median was right.
