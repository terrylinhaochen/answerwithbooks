# Book cover design

Public cover generation and hosted private conversion use the same art direction in
`supabase/functions/_shared/book-cover-design.mjs`: a text-free sticker emblem,
a saturated palette, and clear space for the title panel. The OpenAI image model,
portrait size and high-quality defaults are shared as well. The public script
retains its Gemini and OpenAI provider options; the metered private worker uses
the Images API so its image token usage remains separately accounted for.

`src/lib/book-jacket.mjs` and `src/styles/book-jacket.css` render the same jacket
for public books, private library cards and private detail pages. Public cover typography is typeset by the website and exported into the final
bitmap. The spine and page edges remain live CSS. Private book typography remains
rendered in the authenticated page. Source-provided titles and authors are escaped. Very long titles use a
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


## Complete public cover images

Run `npm run covers:export` after changing public artwork, cover labels, book
metadata or cover styles. It builds the original components in export mode,
uses Chromium to capture the flat front faces with the actual fonts, and rebuilds
with the exported assets. It does not call an image model. Locally it uses Chrome;
on CI install Playwright Chromium first, or set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to a browser executable.

The generated JPEGs and `src/data/rendered-covers.json` are checked in together.
Ordinary builds do not require a browser. Filenames contain a content hash so
changed artwork receives a new URL. Source illustrations remain available for
future exports. Book images are 1200×1800; guide images are 1200×675. The visible
image, Open Graph/Twitter metadata, and applicable structured data use the same
complete cover. Public components suppress their live text overlay for an
exported cover, preserving the CSS spine and page edges without duplicate type.

Validate with `node scripts/check-rendered-covers.mjs`, the search-discovery
audit, and a visual check of the raw image as well as the rendered page. Google
chooses search thumbnails independently; publication and a subsequent crawl are
needed before a local fix can affect results.

## Illustration safe area

Live jackets reserve the lower 40% for title and author. For uncomposed artwork,
`src/lib/book-cover-layout.ts` measures the emblem against its background and
fits those bounds inside the upper art cell with 8% padding. This accommodates
image-model placement drift without cutting off a diagram at the title plate.
The source image is unchanged; only its display size and position change. The
fallback contains the entire image in the art cell. Exported covers that already
include typography bypass this fitting step.

`node scripts/test-unified-book-shelf.mjs` checks a deliberately low-positioned
illustration, the protected type area, and the unified personal/public shelves.
