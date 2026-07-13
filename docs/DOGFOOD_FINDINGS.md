# Answer with Books Dogfood Findings

Date: 2026-07-12

## Product decision

Answer with Books should not compete as a better book-summary library. Blinkist currently leads with thousands of 15-minute text and audio summaries, recommendations, Guides, Spaces, and an AI assistant that summarizes other media. Headway leads with 15-minute summaries, goal-based plans, streaks, spaced repetition, and interactive learning formats.

The defensible job is different:

> Bring a real problem. Get a book-backed diagnosis, decision rule, next move, boundary, and source trail.

A summary helps a reader remember a chosen book. Answer with Books should help a reader decide what to do about a situation, selecting only the books that change the decision.

Current competitor references:

- Blinkist product and pricing: https://www.blinkist.com/ and https://www.blinkist.com/pricing
- Headway product and feature overview: https://makeheadway.com/ and https://makeheadway.com/headway-app-features/

## Dogfood rubric

Every useful answer should be evaluated on six dimensions:

1. Situation fit: does it reflect the user's actual context rather than topic overlap?
2. Diagnosis: does it name the mechanism underneath the surface question?
3. Decision rule: does it say what observable condition should change the decision?
4. Next move: does it produce a small action or artifact the user can inspect?
5. Boundary: does it say where the lens breaks or what evidence would change the answer?
6. Source integrity: are the books relevant, inspectable, and used for distinct roles?

Length, heading count, and keyword overlap are supporting checks, not evidence of quality.

## What failed in the original dogfood

- The homepage promised learning from books but did not make the problem-first workflow unmistakable.
- The web app had browsing, onboarding, saving, mapping, and community stories, but no first-class way to ask the shelf a live question.
- The skill's one-command path failed when a separate local API was not already running.
- `top_of_mind` context was captured but ignored during `/v1/ask` retrieval.
- Bag-of-words retrieval returned plausible but weak books and treated loose article overlap as a published-answer hit.
- A cache hit could return general book matches instead of the books editorially attached to the matched answer.
- The content audit awarded 100/100 for length and structure while ignoring diagnosis, actionability, boundaries, and source fit.
- Unmatched questions disappeared from the user's product journey.

## Changes completed

- Reframed the homepage around a problem, book-backed decision rule, and next move.
- Added `/ask/` with context, confidence thresholds, curated source books on hits, and an honest new-question state on misses.
- Added unmatched questions to the signed-in dashboard under Open questions.
- Made the CLI fall back to the bundled local shelf when the localhost API is unavailable.
- Used top-of-mind context in retrieval and weighted titles, concepts, applications, and curated answer sources above raw body overlap.
- Made a matched answer's editorial source books the authoritative book list.
- Strengthened the skill response contract around diagnosis, decision rule, next move, and boundary.
- Reworked generated answer drafts to follow the same applicability shape.
- Extended the content audit with problem-frame, source-grounding, decision-rule, next-move, and boundary checks.
- Published a flagship answer, “How to tell whether your value proposition is actually different,” that includes a five-person, 48-hour dogfood test.

## Key user-story status

- Ask a live question and get a strong published answer: complete and smoke-tested.
- Receive the relevant source books for a matched answer: complete and smoke-tested.
- Get an honest miss instead of an unrelated answer: complete and smoke-tested.
- Return to an unmatched question later: complete in the local dashboard.
- Install and invoke the agent skill with one command: complete for the bundled local shelf and covered by skill E2E.
- Onboard, create an account, see the profile, save books and answers, map content, browse community maps, and collect a map: covered by the existing UI smoke test.

## Remaining gaps

1. Outcome feedback is missing. The product proposes a next move but does not ask whether the user attempted it or whether it changed the decision.
2. New questions are local browser state. They should eventually sync to a user account and an editorial demand queue.
3. The static web ranker and core service share principles but not one implementation, so relevance behavior can drift.
4. Several existing answers still imply rather than explicitly state their failure boundary. The audit now exposes this, but the backlog needs editorial passes.
5. Onboarding context is visible in the profile but does not yet automatically prefill or rerank Ask the shelf.
6. Source integrity still depends on the quality of the underlying book corpus. A production quality bar needs passage-level provenance and editorial review for every published mechanism.

The next product milestone should be the closed loop: ask → answer → attempt next move → report outcome → improve the user's shelf and the editorial answer.
