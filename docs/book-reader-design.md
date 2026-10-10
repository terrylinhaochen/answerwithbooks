# Book galleries and private digests

The home gallery and public book catalog use `BookRow.astro`. Private uploads use
its cover/title/author/description structure and the same `book-gallery.css`.
The cover and title open a book; cards do not add separate reading or skill CTAs.
Private upload scope and source history remain available without changing the
book's identity or merging excerpts into full books.

Private detail pages follow the public digest hierarchy: breadcrumb, title and
cover, copy action, reading situation and summary, then editorial reading content.
The central argument appears immediately. Exhaustive core lessons and frameworks
are collapsed reference sections, and individual notes are rendered only when
opened. The overview reading time excludes those optional reference sections.
The downloaded package retains the complete book, skill and source references.

Agent installation, export and review controls live in a closed "Use with AI"
section. Full skill text is not displayed, including when clipboard access is
unavailable. Existing `#use-skill` links still open the tools. Source management
and processing are closed for completed current books, but open when work needs
attention. Audit and version activation gates remain in place.

Validation: reader-section unit checks; a fresh production build; desktop and
320px mobile browser checks for gallery navigation, default collapsed state,
progressive note expansion, signed-cover caching, account clearing, legacy skill
links and read-only page opening. The actual saved Smith digest was also rendered
with mocked browser transport after fetching it through the authenticated owner
API. This is a presentation change and does not run paid generation.
