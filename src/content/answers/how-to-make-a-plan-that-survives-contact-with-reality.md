---
question: "How to make a plan that survives contact with reality"
description: "Make plans resilient by naming what the model omits, preserving local knowledge, using reversible steps and slack, and defining evidence that can revise the plan."
books: ["seeing-like-a-state", "the-wisdom-of-crowds"]
date: 2026-05-26
featured: true
tags: ["planning", "systems", "organizations"]
---

A plan simplifies reality so people can coordinate. That simplification is necessary and dangerous. Dependencies become arrows, work becomes tasks, people become roles, and uncertainty becomes a date. The representation makes action possible while deleting details that may be carrying the system.

A resilient plan does not try to describe everything. It identifies what has been omitted, keeps people with local knowledge inside the correction loop, breaks commitment into reversible stages, preserves slack for surprise, and states which observations will change the plan. The objective is not prediction without error; it is error that becomes visible before it compounds.

[*Seeing Like a State*](/books/seeing-like-a-state/) explains how legibility can erase practical knowledge and why imposed schemes become brittle. [*The Wisdom of Crowds*](/books/the-wisdom-of-crowds/) supplies the complementary design: distributed knowledge becomes useful when diverse, independent, local inputs are genuinely aggregated.

## Every plan is a map that deletes part of the territory

James C. Scott’s example of scientific forestry shows the mechanism. Prussian foresters simplified diverse forests into rows of commercially valuable trees that could be counted and harvested. Early yields validated the model. Later generations deteriorated because the undergrowth, soil processes, species diversity, and other “mess” removed from the plan had performed invisible ecological work.

The lesson is not that simplification always fails. It is that the benefits appear in the categories the plan measures, while the costs may accumulate in the omitted relationships. A project plan can make milestones legible while hiding review latency, informal coordination, setup, workarounds, and the learning required to discover that a requirement is wrong.

Run a deletion audit before execution. For each abstraction—milestone, metric, role, workflow, architecture box—ask what variation it suppresses, who relies on that variation, and how the omitted fact would re-enter the plan. If no channel exists, the model can remain internally successful while the work fails outside it.

## Local knowledge needs standing, not an invitation at the end

Scott uses **mētis** for practical, situated knowledge acquired through experience: how this environment behaves, which exception recurs, what workaround keeps the formal process functioning, and which apparently redundant step protects against failure.

Local knowledge is difficult to centralize because part of it becomes visible only during action. Asking operators for feedback after the plan is complete treats their knowledge as commentary on decisions whose structure already excludes it.

Bring people close to the work into diagnosis, assumption review, and pilot design. Preserve dissent before hierarchy shapes it. Surowiecki’s conditions explain why: diversity and decentralization provide different facts; independence prevents early consensus from erasing them; aggregation makes the facts consequential.

Participation without decision influence is not aggregation. State which parts of the plan are fixed, which can be revised, who has authority to pause, and how contrary evidence is adjudicated.

<figure class="awb-line-illustration" aria-labelledby="resilient-plan-caption">
  <svg viewBox="0 0 720 185" role="img" aria-label="A simplified plan acts through a reversible step, receives local evidence, and updates before the next commitment">
    <rect x="24" y="54" width="145" height="74" rx="12" class="awb-line-illustration__box" />
    <rect x="201" y="54" width="145" height="74" rx="12" class="awb-line-illustration__box" />
    <rect x="378" y="54" width="145" height="74" rx="12" class="awb-line-illustration__box" />
    <rect x="555" y="54" width="141" height="74" rx="12" class="awb-line-illustration__box" />
    <path d="M169 91 H201 M346 91 H378 M523 91 H555" class="awb-line-illustration__line" />
    <path d="M625 140 C625 174 273 174 273 140" class="awb-line-illustration__line" />
    <text x="96" y="82" text-anchor="middle" class="awb-line-illustration__label">Model</text>
    <text x="96" y="104" text-anchor="middle">state omissions</text>
    <text x="273" y="82" text-anchor="middle" class="awb-line-illustration__label">Small step</text>
    <text x="273" y="104" text-anchor="middle">reversible action</text>
    <text x="450" y="82" text-anchor="middle" class="awb-line-illustration__label">Local evidence</text>
    <text x="450" y="104" text-anchor="middle">surprise + adaptation</text>
    <text x="625" y="82" text-anchor="middle" class="awb-line-illustration__label">Update</text>
    <text x="625" y="104" text-anchor="middle">next commitment</text>
  </svg>
  <figcaption id="resilient-plan-caption">The correction loop is part of the plan, not evidence that planning failed.</figcaption>
</figure>

## Reversibility determines how much uncertainty the plan can tolerate

Scott’s closing principles favor small steps, reversibility, preparation for surprise, and human inventiveness. These are not arguments for timid action. They align the size of commitment with the quality of knowledge.

Classify decisions by the cost and time of reversal. Test uncertain assumptions before committing migrations, contracts, organizational changes, or public promises that make retreat expensive. A reversible pilot should exercise the part of the system that contains the risk; a demonstration that avoids the difficult dependency produces reassurance rather than learning.

For irreversible or safety-critical choices, the answer is not to experiment casually. Increase precommitment review, simulation, redundancy, staged rollout, and independent challenge. Reversibility is one way to manage uncertainty, not the only one.

Define rollback conditions before enthusiasm and sunk cost arrive. A rollback is credible only if data, staffing, interfaces, and communication remain compatible with returning or changing direction.

## Slack is capacity for the reality the model cannot contain

Plans often label every unallocated hour or resource as inefficiency. That creates a schedule which succeeds only if the model is complete. Surprise then propagates across tightly coupled dependencies.

Slack can take the form of time, budget, capacity, alternative suppliers, architectural headroom, or people able to respond across boundaries. Its size should reflect uncertainty, coupling, and cost of failure. A routine, well-understood task needs less than a novel migration or reorganization.

Slack should not conceal a refusal to prioritize. Distinguish contingency reserved for known uncertainty from extra scope quietly added because capacity appears available. When the buffer is consumed, make the cause visible so future plans can update their reference class.

Human inventiveness is another form of adaptive capacity. Users and workers will improve, repurpose, and circumvent the design. Treat workarounds as evidence. Some are unsafe deviations to eliminate; others reveal a requirement or coordination mechanism the formal plan missed. Investigation must precede standardization.

## Metrics should expose model failure, not enforce compliance

A plan needs indicators, but metrics built from the same abstraction can only confirm the plan’s view. Pair progress measures with signals from the territory: error reports, qualitative observations, exceptions, downstream workload, and behavior outside the intended path.

Ask whether the metric can improve while the actual outcome worsens. If teams are rewarded for task completion, hidden rework may rise. If adoption counts are emphasized, low-value use may replace meaningful completion. A countermeasure should observe the most plausible displaced cost.

The update condition belongs in the plan before measurement. State which result will cause continuation, revision, pause, or abandonment and who can invoke it. Otherwise every outcome can be reinterpreted as a reason to preserve the original direction.

## The next move is a plan-deletion review

Take the current plan and add four columns beside each major commitment: assumption, omitted local knowledge, reversibility, and update evidence. Ask the people closest to execution to mark where the representation differs from how work happens and which workaround or dependency is carrying unrecognized load.

Choose the earliest step that can expose the most consequential assumption without creating irreversible cost. Preserve enough slack and rollback capacity to respond. Collect independent observations during the step, then hold a scheduled update review before the next commitment becomes automatic.

The success condition is not that the original plan survives unchanged. It is that the objective remains achievable because reality can correct the method. A plan has survived contact when adaptation is expected, evidence has authority, and the organization learns before the deleted detail becomes the second-generation forest.
