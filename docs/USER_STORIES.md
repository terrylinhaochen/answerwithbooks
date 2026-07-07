# Answer with Books User Stories

These stories define the first complete product loop: a reader creates a profile, explores book-grounded answers, maps their own concerns to source material, and collects useful maps from other readers.

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
- Persistence: local `awb:user-content-maps`

## Community Browser

As a reader, I can browse maps created by the product or made public by other readers so that I can discover problems similar to mine.

- Entry: `/community/`
- Action: search maps and collect useful maps
- Result: `/my-books/` shows collected maps
- Persistence: seeded community maps plus local `awb:collected-content-maps`

## Current Boundary

The first version is static-safe: user-created maps and collected maps persist locally in the browser, while auth and onboarding metadata use Supabase. A production shared community feed should later move public maps and collections into Supabase tables with row-level security.
