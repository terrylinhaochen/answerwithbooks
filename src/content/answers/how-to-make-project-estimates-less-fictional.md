---
question: "How to make project estimates less fictional"
description: "Build estimates from comparable completed work, include discovery and waiting, express uncertainty as a range, and define tripwires that force re-estimation."
books: ["thinking-fast-and-slow", "seeing-like-a-state"]
date: 2026-06-21
featured: false
tags: ["planning", "estimation", "project-management"]
---

Project estimates become fictional when a detailed plan is mistaken for evidence. The team decomposes the intended work, assigns optimistic durations, adds the pieces, and produces a precise date. The decomposition feels rigorous while assuming the plan has already discovered most of the real work.

Start with the outside view: how long comparable completed projects actually took and how often they failed, changed scope, or waited. Then use the current plan to explain justified differences. Estimate discovery separately from execution, include coordination and queues, express the result as a range, and define events that require a new estimate.

[*Thinking, Fast and Slow*](/books/thinking-fast-and-slow/) supplies the planning fallacy, reference-class forecasting, and the distinction between inside and outside views. [*Seeing Like a State*](/books/seeing-like-a-state/) explains why the clean representation omits local work and dependencies that still consume time.

## The inside view predicts the project as imagined

The inside view begins with the case’s details: team, architecture, tasks, dependencies, and intended sequence. Those details matter, but they invite a story in which the plan is broadly correct and interruptions are exceptional.

Kahneman describes a curriculum project whose team forecast roughly two years. When asked about comparable projects, a member estimated that many never finished and successful ones often took seven to ten years. The team knew the reference class and still continued with the inside forecast. The example shows that planning error is not merely missing data; the specific story feels more relevant than an uncomfortable base rate.

The outside view begins by selecting a reference class before debating why this case is special. Use completed work with similar novelty, coupling, team experience, approval process, and operational environment. Record elapsed time, effort where available, failure, scope changes, and major sources of delay.

No reference class will be perfect. The aim is a defensible baseline. Adjust only for differences with a causal reason and evidence, and make each adjustment visible so optimism cannot enter as a collection of small, unexamined exceptions.

## Task lists omit discovery, queues, and informal work

Scott’s legibility lens explains why decomposition undercounts. A plan represents work as tasks with owners and dates. It often omits uncertainty about what should be built, environment setup, review and approval latency, interruptions, coordination, migration exceptions, rework, operational readiness, and the time required to learn that an assumption is wrong.

The omitted work does not disappear. It returns as “unexpected” delay even when similar projects encounter it repeatedly. Ask people closest to execution which informal steps keep the process moving and where work waits rather than progresses.

Estimate elapsed time separately from hands-on effort. A review requiring two hours of work may add a week if the reviewer’s queue is the constraint. Dependencies create variance because each handoff adds a distribution, not a fixed duration.

Also inspect incentives. If the date is used to approve a project, teams may learn that honest ranges threaten authorization. A forecast cannot become more accurate while the organization rewards the smallest plausible number and later treats it as a commitment.

<figure class="awb-line-illustration" aria-labelledby="estimate-caption">
  <svg viewBox="0 0 720 185" role="img" aria-label="A credible estimate combines a reference-class baseline, current project adjustments, omitted work, and an uncertainty range with update tripwires">
    <rect x="24" y="55" width="142" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="200" y="55" width="142" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="376" y="55" width="142" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="552" y="55" width="144" height="72" rx="12" class="awb-line-illustration__box" />
    <path d="M166 91 H200 M342 91 H376 M518 91 H552" class="awb-line-illustration__line" />
    <text x="95" y="82" text-anchor="middle" class="awb-line-illustration__label">Reference class</text>
    <text x="95" y="104" text-anchor="middle">actual outcomes</text>
    <text x="271" y="82" text-anchor="middle" class="awb-line-illustration__label">Adjustments</text>
    <text x="271" y="104" text-anchor="middle">evidenced differences</text>
    <text x="447" y="82" text-anchor="middle" class="awb-line-illustration__label">Missing work</text>
    <text x="447" y="104" text-anchor="middle">discovery + waiting</text>
    <text x="624" y="82" text-anchor="middle" class="awb-line-illustration__label">Range + tripwire</text>
    <text x="624" y="104" text-anchor="middle">update when known</text>
  </svg>
  <figcaption id="estimate-caption">The estimate is an argument about uncertainty, not a sum of ideal task durations.</figcaption>
</figure>

## Discovery and execution need different commitments

Known execution applies a familiar method to a sufficiently understood scope. Discovery determines whether the method, feasibility, requirement, or dependency is understood. Teams often estimate execution while discovery remains embedded inside the tasks.

Mark each major component as known execution, bounded investigation, or unresolved dependency. For discovery work, estimate the time and resources allocated to answer a question, not the completion date of a solution whose shape is not yet known.

The milestone should produce evidence: a prototype under realistic constraints, a reviewed interface, a data sample, a dependency agreement, or a decision about scope. At the milestone, replace part of the uncertainty with a narrower range or stop the path.

Timeboxing discovery does not guarantee a positive answer. “Investigate for one week” means the team will decide with the evidence available after a week, not that feasibility will be established on schedule. State the possible outcomes and their consequences.

## Use ranges that correspond to conditions

A single number hides the distribution and encourages recipients to hear a promise. A range should reflect actual uncertainty, not an arbitrary percentage added to a preferred date.

Describe the conditions associated with the lower, central, and upper parts of the range. The lower bound assumes identified risks do not land and queues behave favorably. The central case includes ordinary rework and delay from the reference class. The upper case reflects plausible known risks, not an unlimited catastrophe.

Where enough historical data exists, use the distribution directly and communicate a percentile: the date met by a stated share of comparable outcomes. The chosen confidence should reflect the cost of being late. A reversible internal experiment can accept more schedule risk than a regulatory or customer commitment.

Separate forecast from commitment. A forecast describes current evidence; a commitment expresses an organizational decision about resources, buffers, and consequence. Conflating them pressures forecasters to alter evidence to match the desired promise.

## Tripwires keep estimates from surviving after their assumptions die

Every estimate depends on assumptions about scope, staffing, dependencies, quality, and throughput. Define the observation that invalidates each important assumption: a prototype misses performance, approval requires another cycle, a dependency has no owner, defect rates exceed the baseline, or scope crosses an agreed boundary.

Attach a review date or event and a decision. A tripwire without authority to re-estimate only records that the plan is wrong while the deadline remains politically fixed. State who updates the forecast and who renegotiates the commitment.

Track reasons for change. At completion, compare the original range, updates, and actual outcome. Distinguish scope change, missing work, execution variance, queue time, and model error. This creates the reference class the next estimate needs.

A premortem can expose assumptions before commitment. Ask the team independently to imagine the project missed badly and write the most plausible history. Convert recurring causes into explicit risks, missing tasks, or tripwires rather than adding an undifferentiated buffer.

## The next move is one outside-view estimate

For the next consequential project, find at least three comparable completed efforts and record elapsed time, outcome, scope change, and major delays. Use their distribution as the baseline. Then list current differences and allow adjustments only where evidence supports the causal direction.

Review the plan with people closest to the work and add discovery, waiting, review, rework, and operational tasks the clean decomposition omitted. Produce a range tied to conditions, name the confidence level relevant to the commitment, and write the first three tripwires.

At each tripwire, update the range rather than defending the original number. Preserve the history for calibration. The success condition is not that every project lands on the first date. It is that the forecast states what is known, changes when assumptions fail, and becomes better because completed work teaches the next reference class.
