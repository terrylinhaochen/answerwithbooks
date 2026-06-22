---
question: "How to make project estimates less fictional"
description: "Estimates go wrong when teams build from the inside view and ignore the local mess the plan deletes. Thinking, Fast and Slow supplies the outside view; Seeing Like a State explains why clean plans miss real work."
books: ["thinking-fast-and-slow", "seeing-like-a-state"]
date: 2026-06-21
featured: false
tags: ["planning", "estimation", "project-management"]
---

People keep asking where estimates go wrong: software timelines, AI-assisted projects, infrastructure costs, capacity planning without time tracking. The wording changes, but the pain is the same. The estimate looked reasonable until reality arrived.

That does not mean estimating is pointless. It means most estimates start from the wrong evidence.

## The inside view lies politely

Daniel Kahneman's [*Thinking, Fast and Slow*](/books/thinking-fast-and-slow/) names the core failure: the inside view. You build the estimate from the details of your own plan.

That feels responsible:

- We know the team.
- We know the scope.
- We know the architecture.
- We know the blockers.

But the inside view quietly becomes a story about how the work should go if the plan is mostly right. It underweights the reference class: how long similar projects actually took.

The outside view starts elsewhere. Before asking "how long will this take us?", ask:

- How long did the last five similar projects take?
- How often did scope change?
- Which dependency usually surprised us?
- What did we forget to include last time?
- What percentage of time went to coordination, review, rework, and waiting?

That is the baseline. Your plan can adjust from it, but it should not replace it.

## Clean plans delete real work

James C. Scott's [*Seeing Like a State*](/books/seeing-like-a-state/) explains the second failure. Plans make work legible by simplifying it. That is necessary. It is also dangerous.

The project plan usually captures:

- tasks,
- owners,
- dependencies,
- dates,
- milestones.

It often deletes:

- informal coordination,
- unclear decisions,
- review latency,
- local workarounds,
- environment setup,
- migration edge cases,
- support burden,
- the time needed to discover that the plan is wrong.

The deleted work still happens. It just appears later as surprise.

## Estimate discovery separately from execution

A useful estimate separates two kinds of time:

1. **Discovery time:** figuring out what the work really is.
2. **Execution time:** doing the known work.

Teams often estimate execution while pretending discovery is already done. That is why the estimate looks precise and fails anyway.

If uncertainty is high, the next milestone should not be "finish the project." It should be "reduce the uncertainty enough to estimate the project honestly."

## Use ranges and tripwires

Single-number estimates invite fake certainty. Use ranges:

- optimistic if nothing surprising happens,
- expected if normal surprises happen,
- pessimistic if the known risks land.

Then add tripwires:

- "If integration is not working by Friday, the timeline changes."
- "If legal review takes more than one cycle, launch moves."
- "If the prototype does not answer the feasibility question, we stop expanding scope."

Tripwires keep the estimate from becoming a promise long after the evidence changes.

## The practical estimation pass

Before giving a date, answer:

1. What is the closest reference class?
2. How long did comparable work actually take?
3. What work is missing from the visible task list?
4. Which parts are discovery, not execution?
5. What range is honest?
6. Which tripwire would force a re-estimate?

An estimate is not a prophecy. It is a structured argument about uncertainty. The goal is not to sound confident. The goal is to become surprised earlier and cheaper.
