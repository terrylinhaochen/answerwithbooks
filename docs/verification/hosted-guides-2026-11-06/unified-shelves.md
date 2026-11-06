# Unified books and illustration safe area

The existing Your books component queried only private legacy processing jobs.
The shared-library mine endpoint already returned Shoe Dog, Invention: A Life,
and Open for the uploader; no membership or visibility migration was needed.

Your books now combines saved public books with existing private excerpts. The
public uploads use the regular catalog grid, search, count, and pagination. The
separate From the shared library block was removed from Books, and the duplicate
shared-only shelf was removed from Profile. New public cards share the normal
cover, title, author, description, and excerpt-action layout.

Cover typography retains a protected lower 40%. Live illustrations are measured
and fitted inside the upper art region, with a full-image contain fallback.
Precomposed covers retain their existing presentation.

Validation:
- Authenticated hosted mine read returned all three real uploaded books.
- Browser fixtures verify a mixed personal shelf with a private excerpt and three
  public uploads, pagination across server pages, search, refresh deduplication,
  desktop/mobile layout, and a synthetic diagram in the source image's bottom third.
- Fresh anonymous live browser read verifies three public uploaded entries in the
  main catalog, 49 total books, author search, and fitted hosted cover images.
- Shared reader/upload/billing UI tests, cover markup checks, production build,
  product-surface check, and diff whitespace check pass.

Frontend changes are local preview changes; no backend data or permissions changed.
