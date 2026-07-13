# Answer with Books User Stories

These stories define the first complete product loop: a reader creates a profile, explores book-grounded answers, maps their own concerns to source material, and collects useful maps from other readers.

## Question Solver

As a reader with a live problem, I can describe the situation and optional context so that I get the closest published answer and its source books, or an honest new-question state when the shelf does not have a strong match.

- Entry: `/skills/` for agent installation (`/ask/` redirects here)
- Result on hit: one primary answer, its decision preview, and the books behind it
- Result on miss: the question is captured locally and appears under Open questions on `/my-books/` instead of presenting an unrelated answer as a match
- Persistence: local `awb:open-questions` for unmatched questions

## New Reader

As a new reader, I can start onboarding from the homepage, choose the areas I care about, name the problem on my mind, and create an account so that the site has a starting profile for future recommendations.

- Entry: `/onboarding/start/`
- Auth: `/signup/` or `/login/`
- Result: `/profile/` shows focus, shelf strategy, top-of-mind concern, and ChatGPT intent
- Persistence: Supabase auth metadata plus local `awb:onboarding`

## Returning Reader

As a returning reader, I can log in and land on my dashboard so that saved books, saved answers, mapped content, and collected maps are in one place.

- Entry: `/login/`
- Result: `/my-books/`
- Persistence: Supabase session plus local shelf state

## Book Explorer

As a reader browsing books, I can save a book so that it appears in my dashboard shelf.

- Entry: `/books/` or `/books/:slug/`
- Action: `Save this book`
- Result: `/my-books/` shows the book under Saved books
- Persistence: local `awb:saved-books`

## Personalized Learner

As a reader who has finished a book digest, I can take it into the AI that already knows my work so that the book's ideas are connected to my experience instead of repeated as generic takeaways.

- Entry: `/books/:slug/`, after the complete digest
- Action: choose ChatGPT, Claude, Gemini, or Grok, then select `Personalize in…`
- Result: the complete personalization prompt is copied and the chosen AI opens; the prompt points to both the canonical digest and the public Answer with Books `SKILL.md`
- Persistence: local `awb:preferred-ai`; no personal conversational context is sent to Answer with Books
- Verified: responsive at desktop and mobile widths; provider choice, clipboard payload, popup-blocked state, and reload persistence are covered by the UI smoke test

## Agent Reader

As a reader with a live problem, I can copy an answer brief into an agent that already knows me so that it reads the linked books and produces a contextual recommendation.

- Entry: `/answers/:slug/`
- Action: `Copy for your agent`
- Result: a 900–1,500 word personalized digest with a decision rule, next move, boundary, and update condition
- Behavior layer: the Answer with Books skill, installed from `/skills/` or read from its public `SKILL.md`

## Answer Explorer

As a reader browsing answers, I can save an answer or mark it helpful so that the system knows which problems and book lenses I want to return to.

- Entry: `/answers/` or `/answers/:slug/`
- Action: `Save answer`, `Mark helpful`
- Result: `/my-books/` shows saved answers
- Persistence: local `awb:saved-answers` and `awb:liked-answers`

## Content Mapper

As a reader with my own concern, note, interview excerpt, or source text, I can upload or paste it and map it to topics, source books, and published answers so that my private demand signal becomes actionable.

- Entry: `/upload/`
- Auth: signed-in users can create maps; signed-out users are routed through login/signup and returned to upload
- Result: `/my-books/` shows the map under Your mapped content
- Persistence: Supabase `content_maps` when available, plus local `awb:user-content-maps` fallback

## Community Browser

As a reader, I can browse maps created by the product or made public by other readers so that I can discover problems similar to mine.

- Entry: `/community/`
- Action: search maps and collect useful maps
- Result: `/my-books/` shows collected maps
- Persistence: Supabase `content_map_collections` for signed-in users, plus local `awb:collected-content-maps` fallback for seeded/static maps

## Current Boundary

The web app remains static-safe, but shared maps are backed by Supabase when the `content_maps` and `content_map_collections` migrations are applied. Local storage remains a fallback for seeded maps and offline browser state.
