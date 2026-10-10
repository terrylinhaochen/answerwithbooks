# Book cover design

Public cover generation and hosted private conversion use the same art direction in
`supabase/functions/_shared/book-cover-design.mjs`: a text-free sticker emblem,
a saturated palette, and clear space for the title panel. The OpenAI image model,
portrait size and high-quality defaults are shared as well. The public script
retains its Gemini and OpenAI provider options; the metered private worker uses
the Images API so its image token usage remains separately accounted for.

`src/lib/book-jacket.mjs` and `src/styles/book-jacket.css` render the same jacket
for public books, private library cards and private detail pages. Typography,
spine and page edges are rendered by the website rather than generated into the
bitmap. Source-provided titles and authors are escaped. Very long titles use a
smaller title size. Private cover URLs remain signed and account-scoped.

Artwork is versioned by `coverStyleVersion`; changing the prompt does not
silently overwrite every existing cover. A cover-only repair leaves the source,
summary and skill intact. Each repaired upload keeps its own stored copy so
removing another upload cannot break its cover.

Validation for the October 9, 2026 change: unit checks for title variants and safe
markup; worker HTTP tests for image configuration and metering; production build;
browser checks for public/private jackets and mobile layout. The regenerated
Wealth of Nations artwork was also visually compared beside The Mom Test using
the shared jacket renderer. Image generation remains nondeterministic, so visual
review is still needed when curating or repairing a cover.
