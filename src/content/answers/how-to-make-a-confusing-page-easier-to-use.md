---
question: "How to make a confusing page easier to use"
description: "Fix a confusing page by identifying the decision it must support, making hierarchy and labels self-evident, removing competing interpretations, and watching users scan it."
books: ["dont-make-me-think", "thinking-fast-and-slow"]
date: 2026-06-18
featured: false
tags: ["design", "conversion", "usability"]
---

A confusing page often contains all the necessary information. The problem is that users must decide what the page is, whether it applies to them, which element matters, what is clickable, and what will happen next before they can pursue their actual goal.

Do not begin by adding explanation. Identify the primary decision the page should support, make its identity and hierarchy visible at scanning speed, use labels and conventions people already understand, and remove elements that create competing interpretations. Then watch unfamiliar users attempt a realistic task without assistance.

[*Don’t Make Me Think*](/books/dont-make-me-think/) supplies the usability standard: eliminate unnecessary interpretation and design for scanning and recovery. [*Thinking, Fast and Slow*](/books/thinking-fast-and-slow/) explains why fluency and salience matter—and why a coherent-looking page can still send people toward the wrong conclusion.

## Diagnose the question the page forces users to answer

Every page participates in a larger task. A catalog helps someone find a suitable item. A landing page helps someone decide whether a product addresses their problem. A settings page helps someone understand and change a current state. Confusion begins when the page is optimized around what the organization wants to say rather than what the user needs to decide.

Write the page’s job as one observable outcome. Then list the questions a new visitor must answer before reaching it: Where am I? Is this relevant to me? Which option is primary? What evidence supports the claim? What happens after the action? The questions reveal the interpretation tax imposed before useful work begins.

Separate missing information from hidden information. If the answer exists but is buried under an internal label, weak hierarchy, or competing call to action, more copy increases the pile. If the answer genuinely does not exist, supply it at the point where the uncertainty matters.

Also identify the cost of choosing incorrectly. A low-cost content click needs less explanation than a payment, deletion, data permission, or commitment. Clarity includes making consequence and recovery proportional to risk.

## Design for scanning, satisficing, and recovery

Krug observes that people usually scan rather than read and choose the first plausible path rather than compare every option. This is sensible behavior when a wrong click is cheap and the page is only a means to another goal.

Visual hierarchy should make that behavior successful. More important elements need greater prominence; related elements need proximity and shared treatment; nested elements need visible containment. When every block has the same weight, the user must read to reconstruct structure. When every block is emphasized, attention has no reliable destination.

The primary action should be easy to recognize, but not every page needs one enormous button. Its prominence should reflect the user’s likely next step and the consequences of acting. Secondary actions should remain available without competing as equal recommendations.

Recovery matters because no design eliminates every wrong path. Preserve location, use meaningful page titles and selected navigation states, maintain a route back, and avoid actions whose results are surprising or irreversible without confirmation.

<figure class="awb-line-illustration" aria-labelledby="page-clarity-caption">
  <svg viewBox="0 0 720 185" role="img" aria-label="A user scans page identity, relevance, proof, and next action before acting or recovering">
    <rect x="22" y="55" width="145" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="199" y="55" width="145" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="376" y="55" width="145" height="72" rx="12" class="awb-line-illustration__box" />
    <rect x="553" y="55" width="145" height="72" rx="12" class="awb-line-illustration__box" />
    <path d="M167 91 H199 M344 91 H376 M521 91 H553" class="awb-line-illustration__line" />
    <text x="94" y="83" text-anchor="middle" class="awb-line-illustration__label">Identity</text>
    <text x="94" y="104" text-anchor="middle">what is this?</text>
    <text x="271" y="83" text-anchor="middle" class="awb-line-illustration__label">Relevance</text>
    <text x="271" y="104" text-anchor="middle">is it for me?</text>
    <text x="448" y="83" text-anchor="middle" class="awb-line-illustration__label">Evidence</text>
    <text x="448" y="104" text-anchor="middle">why believe it?</text>
    <text x="625" y="83" text-anchor="middle" class="awb-line-illustration__label">Action</text>
    <text x="625" y="104" text-anchor="middle">what happens next?</text>
  </svg>
  <figcaption id="page-clarity-caption">A page becomes usable when this sequence can be recovered without decoding the organization behind it.</figcaption>
</figure>

## Familiar conventions transfer knowledge into the page

Conventions reduce learning because users bring expectations from other interfaces. A logo links home, underlined text is clickable, standard controls behave consistently, and navigation occupies familiar regions. Novelty introduces a comprehension cost that should be justified by a material improvement.

Labels should use the language people seek, not the organization’s taxonomy. A clever category name forces translation. Consistent use of an opaque label only makes confusion repeatable.

Kahneman’s work adds a caution. Processing fluency makes information feel more familiar and true, but ease is not accuracy. A familiar pattern should help users understand the real choice, not slide them past a material term or create a deceptive default. Clarity about consequence outranks conversion produced by misunderstanding.

## Copy should carry a decision, mechanism, or proof

Krug’s instruction to remove half the words targets happy talk, redundant instructions, and prose that exists because the interface does not explain itself. The exact percentage is less important than requiring copy to earn space.

An effective headline names the page or value in language a new user can interpret. Supporting copy should explain the distinction or mechanism necessary for a choice. Proof should sit close to the claim it supports. Disqualifying information should appear before a costly action, not after it.

Long content can remain usable when it is structured. Headings should carry meaning rather than merely label “features” or “benefits.” The opening should answer the immediate question; deeper evidence and qualification can follow. Progressive disclosure works when hidden content is genuinely secondary and its trigger clearly predicts what will be revealed.

Instructions are a diagnostic. If a short instruction resolves an unfamiliar but necessary interaction, keep it. If the same confusion can be removed through label, layout, or standard control behavior, repair the interface first.

## Test behavior instead of debating taste

A five-second impression test can reveal whether the page communicates identity, audience, and primary path. It cannot prove that a person can complete the task. Follow it with an observed usability session using a realistic goal.

Ask participants to think aloud. Do not explain the page or direct them toward the intended label. Record where they hesitate, what they expect before clicking, and whether the result matches that expectation. A preference such as “I don’t like this color” is different from a behavioral failure such as not seeing the action or misunderstanding its consequence.

Small, repeated tests are valuable because the highest-cost problems often recur across participants. Test before the design is expensive to change, fix the most consequential interpretation failure, and test the revision with people who did not see the original explanation.

Analytics can show where people leave or fail to act; observation helps explain what they thought was happening. Use both where available. A conversion increase is not automatically a usability improvement if it comes from obscured cost or accidental action.

## The next move is a decision-first usability pass

Write the page’s single primary job at the top of a review document. Capture the page at the first viewport and annotate where it answers identity, relevance, evidence, action, consequence, and recovery. Any answer that requires explanation becomes a candidate for structural repair.

Remove or demote elements that serve a different primary job. Replace internal or clever labels with expected language. Align visual prominence with conceptual importance. Move proof beside its claim and state what the next action does rather than using a generic label.

Then show the page to three target users separately. After five seconds, ask what the page is and what they would do. Restore it and give each person one realistic task. Fix the earliest point where their model diverges from the page’s intended path; downstream polish cannot repair a wrong first interpretation.

The success condition is not that the page looks simpler. It is that a new user can recognize where they are, choose a relevant path, predict the result of acting, and recover from a wrong choice without needing the team that designed the page to explain it.
