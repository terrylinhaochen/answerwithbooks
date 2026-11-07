# Uploaded library and reading surfaces — local revision 29

## Changes

- Public Books catalog renders the 13 uploaded titles and refreshes ready records from the shared library. Old curated titles no longer appear in the catalog or homepage selections. Their source files and direct URLs are retained.
- All 13 uploaded titles have new versioned screen-print cover illustrations, shared across the catalog, book details, previews, and account cards through the common jacket renderer.
- Homepage featured row uses Shoe Dog, Invention: A Life, Open, and The Whole Story. Old editorial answer examples and the redundant skill carousel are removed.
- Skills uses the paper, upright headings, rules, and book artwork from the landing design. Old curated task examples and processing/CLI explanations are removed.
- Profile uses warm paper surfaces and upright headings; its collection displays shared uploads, without the old private excerpt/request cards. Underlying source records are preserved.
- Decorative oversized quotation mark removed from blockquotes; headings are upright across the collector theme.
- Install skill copies the existing installation prompt without exposing it as a code block.

## Verification

Local Astro preview: http://127.0.0.1:4321 (PUBLIC_PRINT_STUDY=1).

- Production build succeeds: 119 pages generated. This is build validation, not a production deployment.
- Desktop 1440px and mobile 390px: homepage, Books, Skills, and legacy Zero to One quote page load with no horizontal overflow or JavaScript errors.
- Catalog has exactly 13 entries after its live refresh; all 13 new illustrations decode successfully.
- Pagination shows 11 books plus upload card, then two books; searching Shoe Dog returns one result and its preview opens.
- How to Be Rich detail loads its new cover.
- Install skill clipboard contents match the intended prompt; Copied status confirmed.
- Zero to One selected quote has no pseudo-element quotation mark and no text overflow.
- Profile layout inspected using its rendered markup with scripts disabled and hidden content revealed. Heading contrast corrected. Signed-in data/session behavior was not verified: native browser connection failed at startup due the environment's symlinked writable root.

## Source availability

Nine titles are returned as ready by the public shared-library endpoint. Four listed uploads are not currently readable: The Power of Fastenal People; What I Talk About When I Talk About Running; The Russian Rockefellers; As I See It. These have finished covers and non-link catalog cards marked Not yet available to read. Their processing was not rerun in this design task.

No database records were deleted and no production deployment was performed.
