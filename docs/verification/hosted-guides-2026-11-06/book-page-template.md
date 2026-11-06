# Book page template alignment

Uploaded books previously used an independent minimal reader. Both static book
pages and uploaded books now use BookPageHeader and BookReadingPanel; their cover,
byline, breadcrumb, excerpt action, and prose styles match. The shared reader also
uses the existing overview card, continuation action, and feedback component.
Missing publication year, purchase edition, and topical metadata are not invented.

QuestionDisclosure supplies both the existing FAQ cards and the uploaded book's
exploration questions. The first three questions are visible, their context and
Explore this question action expand inside each card, and More questions reveals
the remainder. Guide actions retain the exact question and selected book.

Verified with the live Invention: A Life page and the original Structure of
Scientific Revolutions page at 390 and 1280 pixels: matching header/prose/panel
metrics, working disclosures, guide modal prefilling, feedback book identity,
and no horizontal overflow. No guide generation or feedback was submitted.
The production build, shared-reader UI test, product-surface check, and whitespace
check passed. These are local preview changes; no backend or content was modified.
