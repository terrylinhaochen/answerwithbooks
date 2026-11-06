# Supplied book batch, 6 November 2026

Ten originals uploaded through the hosted shared-library pipeline; identifiers in jobs.json. Original files stay in private Storage. Completion is asynchronous; this is not a receipt that all books are ready.

## Upload limit

User explicitly raised the rolling per-account 24-hour limit to 100. Database migration shared_book_daily_limit_100 is applied. pg_get_functiondef confirms >=100; function remains security invoker and executable only by postgres/service_role. Same-owner advisory locking and source deduplication preserved. Successful eleventh and twelfth daily uploads verified the old ten-book boundary is gone. CLI batches remain at most ten; worker lease concurrency unchanged.

book-native v13 deployed with only the error-copy change applied to its live v12 bundle (SHA a351a81c78dfa1bf2470bc97e687d82e32c233f3c3ff36af5ecdb40aacd956f7). Local documentation updated; no frontend release needed for enforcement.

## Scanned PDF

Fastenal has 145 image-only pages. Added bounded English Tesseract OCR on the existing hosted EC2 worker, processing one image at a time (max 3500-pixel dimension), with per-command timeouts and text/page capacity checks. Original PDF is unchanged. OCR provenance records language and page count. Tesseract 5.3.4 installed on that host; Dockerfile and systemd instructions updated for reproducibility. Hosted adapter backed up as adapter.pre-ocr.py before an atomic narrow patch. New adapter SHA ba3c7cf05af5927db593836532a1465fa01bc66d487e5477b92eeb17ade0693b. Five local OCR boundary tests and a real hosted image-only synthetic PDF smoke passed, including original hash preservation. Fastenal's actual OCR was still running at this record.

## Verification and limitations

How to Be Rich: public anonymous API readback verified title, J. Paul Getty attribution, 1,890-character summary, six questions and ready cover. Other books still processing at this record. Corrected filename-based book titles and author fields using the supplied front matter and selected catalog; the Sam Zell biography is credited to Ben Johnson. No raw source content is in this report.

The broader existing native HTTP mock suite fails at its public prepare fixture (line 152), after private protocol/auth/isolation tests pass. The deployed Edge change was made against the fetched live bundle, not the unverified local bundle. No auth, grants, RLS or storage policies were changed. Security advisors checked after migration.

No final batch cost claimed while model calls continue. Saved usage receipts remain the source for later cost accounting.
