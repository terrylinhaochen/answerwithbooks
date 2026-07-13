---
question: "How to know whether your metrics are lying to you"
description: "A metric misleads when it can improve without the target outcome improving. Tie it to a decision and causal model, inspect cohorts and segments, and pair it with guardrails."
books: ["the-lean-startup", "thinking-fast-and-slow"]
date: 2026-06-21
featured: false
tags: ["metrics", "startups", "analytics"]
---

A metric does not need to be fabricated to mislead. The number can be measured correctly and still create a false story because it is cumulative, detached from a decision, averaged across unlike groups, moved by a confounder, or easy to optimize without improving the outcome people care about.

Start with the decision and the causal model. State what user or business behavior should change, why the intervention could change it, and which observation would distinguish progress from activity. Then inspect the metric by cohort and segment, add a guardrail for the harm it can hide, and define the result that would make you stop using it.

[*The Lean Startup*](/books/the-lean-startup/) supplies innovation accounting, validated learning, cohort analysis, and the distinction between actionable and vanity metrics. [*Thinking, Fast and Slow*](/books/thinking-fast-and-slow/) explains why a clean graph and coherent narrative can feel more evidential than they are.

## A metric is useful only in relation to a decision

“Increase engagement” does not specify what to learn or do. Engagement may mean frequent use, duration, breadth, creation, collaboration, or successful completion. Each behavior implies a different product model and can move while the others fall.

Write the decision first: whether to continue an onboarding change, invest in a channel, expand a workflow, revise pricing, or change the target segment. Then state the hypothesis connecting the intervention to an observable outcome. The metric should help discriminate among actions, not merely describe that something happened.

Ries defines useful early progress as validated learning. A change in the number supports learning only when the team knows which intervention users were exposed to and what behavior was expected. If every result can be explained as success after the fact, the metric has not tested the hypothesis.

Some metrics serve reporting rather than decisions. Total revenue and total customers can remain important descriptions. The problem begins when a reporting metric is treated as evidence for a causal claim it cannot support.

## Cumulative totals can rise while every new cohort fails

Vanity metrics often move in only one direction because they accumulate history. Total signups, downloads, page views, or processed volume can increase even when each new group behaves worse. Growth in inputs hides decay in the experience.

Cohort analysis groups users by a meaningful starting point or exposure—signup period, acquisition source, product version, segment, or experiment—and follows their behavior over comparable time. It answers whether newer groups activate, retain, convert, or expand differently from earlier ones.

Use rates with meaningful denominators. A rising count may reflect a larger population, longer observation window, or logging change. A rate can also mislead if the denominator’s composition changes. Preserve the numerator, denominator, and eligibility rule so another person can reconstruct what the graph means.

Aggregates hide heterogeneity. An average improvement can come from acquiring more easy-to-serve users while the intended segment declines. Inspect the groups implied by the strategy without slicing until a desired story appears. Segments should be chosen because the mechanism predicts a difference, not because one cut looks favorable.

<figure class="awb-line-illustration" aria-labelledby="metrics-caption">
  <svg viewBox="0 0 720 185" role="img" aria-label="An intervention changes a target behavior, which is measured with a decision metric and a guardrail; cohorts and segments check whether the story holds">
    <rect x="22" y="55" width="140" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="196" y="55" width="140" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="370" y="55" width="140" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="544" y="55" width="154" height="72" rx="12" class="awb-line-illustration__box" />
    <path d="M162 91 H196 M336 91 H370 M510 91 H544" class="awb-line-illustration__line" />
    <text x="92" y="82" text-anchor="middle" class="awb-line-illustration__label">Intervention</text>
    <text x="92" y="104" text-anchor="middle">what changed?</text>
    <text x="266" y="82" text-anchor="middle" class="awb-line-illustration__label">Mechanism</text>
    <text x="266" y="104" text-anchor="middle">why behavior moves</text>
    <text x="440" y="82" text-anchor="middle" class="awb-line-illustration__label">Metric + guardrail</text>
    <text x="440" y="104" text-anchor="middle">value and harm</text>
    <text x="621" y="82" text-anchor="middle" class="awb-line-illustration__label">Decision</text>
    <text x="621" y="104" text-anchor="middle">continue or revise</text>
  </svg>
  <figcaption id="metrics-caption">A number becomes evidence when its place in the causal and decision chain is explicit.</figcaption>
</figure>

## A metric lies when the proxy can win while the outcome loses

Most operational metrics are proxies for a deeper objective. Response time stands in for service quality; content volume stands in for useful discovery; activation stands in for early value. Once the proxy becomes a target, people and systems find ways to move it that may weaken the relationship to the outcome.

Ask for the failure path: how could this number improve while users or the business become worse? Faster response can produce superficial resolution. Higher trial conversion can come from attracting poor-fit customers who churn. More time in product can mean engagement or inability to complete the task.

Pair the metric with a guardrail that observes the most plausible harm. The pair should reflect a mechanism, not a generic dashboard habit. If a change is meant to increase activation by removing friction, retention, error, or support burden may reveal whether the removed step was actually protective.

Guardrails also need thresholds and decision consequences. A metric displayed in red but allowed to decline indefinitely is decoration. Define which deterioration pauses the rollout or requires investigation.

## Clean graphs encourage stories faster than analysis

Kahneman’s account of cognitive ease explains the persuasive force of dashboards. A smooth line, familiar color, and concise narrative make a result easy to process. Ease increases confidence even when causality, uncertainty, and missing data remain unresolved.

“What you see is all there is” appears when the team discusses visible metrics while forgetting uninstrumented behavior, users excluded from the dataset, logging failures, seasonality, selection effects, or changes occurring at the same time. The graph can be accurate about recorded events and incomplete about the system.

Use the outside view. Compare with prior cohorts, historical variance, similar experiments, and a control group where feasible. Show uncertainty and sample size. Record the hypothesis before seeing the result so a surprising movement does not invite an effortless retrospective explanation.

The narrative should distinguish observation, inference, and decision. “Week-four retention rose” is an observation. “The new onboarding caused the rise” is a causal inference. “Roll it out” is a decision dependent on magnitude, uncertainty, guardrails, and cost.

## Instrumentation and definitions are part of the metric

A metric is not only a formula. It includes the event definition, eligibility rule, identity resolution, time window, exclusions, data latency, and transformations. Changes to any of these can move the number without user behavior changing.

Make the metric auditable, one of Ries’s three A’s alongside actionable and accessible. A reviewer should be able to trace an aggregate to representative events or customer records, verify the denominator, and understand missing data. Accessibility means the people making decisions understand the measure; a sophisticated model no one can interpret is weak operating infrastructure.

Run data-quality checks before interpreting product movement. Compare event counts across sources, inspect breaks around releases, look for impossible values and duplicate identities, and annotate definition changes on the graph. If the measurement changed, establish a new baseline rather than splicing incompatible periods into one story.

## The next move is a one-metric causal audit

Choose the metric currently receiving the most attention. Write the decision it is supposed to change, the behavior it represents, the mechanism linking behavior to the desired outcome, and the intervention expected to move it. If one sentence cannot connect the chain, stop treating the number as a steering metric until the model is clear.

Then inspect the numerator, denominator, cohorts, strategy-relevant segments, data definition, and historical variability. Name at least one way the number could improve while value worsens and add a guardrail for that path. Define the magnitude and confidence that would support continuing, revising, or stopping.

Run the audit before redesigning the whole dashboard. One well-understood metric can expose whether the system lacks a decision, causal model, instrumentation, or update rule. Expanding the dashboard before repairing that link creates more opportunities for a coherent but unfalsifiable story.

The success condition is not that the number becomes unquestionably true. It is that the team can explain what was measured, why it should predict the outcome, which groups produced the movement, what harm it might hide, and exactly what decision changes because of the result.
