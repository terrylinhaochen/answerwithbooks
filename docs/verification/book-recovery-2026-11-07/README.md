# Book recovery and explicit guide resume

## Production book recovery

Four jobs had exhausted five reading-map reviews on accurate descriptions of indexes, tables of contents, or bibliographies. The reviewer inherited narrative-only expectations and rejected a section because it had no biographical scenes. The generator and reviewer now explicitly accept accurate reference-section descriptions with an empty scenes array. Invented events, unsupported claims, and incorrect references remain failures.

Deployed book-process v49 using the retrieved v48 production bundle, replacing only functions/_shared/reading-guides.mjs. All other live files and verify_jwt=false were preserved; handler authorization remains in place. v49 SHA: 67b5f2b28d3c5057b5d9a5c99e900f76f0429834ebcbbb014a3972278f4b2c29.

Resumed only the four failed public, current jobs with no active lease. Preserved extracted sources, accepted notes, cursors, and repair findings; reset retry counters and woke the existing queue. No PDFs were reuploaded or accepted chapters remapped.

| Book | Job | Saved sections before retry | Completed |
| --- | --- | --- | --- |
| As I See It | eae70a50-be31-43e8-bfae-2c9529d97f82 | 35/37 | 37/37 |
| The Russian Rockefellers | 95058c82-6a36-4d88-8cc7-98e3daf0cd44 | 50/53 | 53/53 |
| What I Talk About When I Talk About Running | ceb910e6-c039-4467-a027-0e6f5445fde3 | 13/14 | 14/14 |
| The Power of Fastenal People | 3d5c6697-a29a-45be-b271-c9d50da9e3dc | 5/23 | 23/23 |

As I See It subsequently exhausted editorial repairs, ending with a 1,835-word draft against a 1,800-word maximum. Its saved editorial repair was resumed separately and passed. Fastenal's transient scene-format and editorial findings cleared through existing bounded retries. Neither factual review nor length validation was bypassed.

All four persisted as status=ready, run_state=complete, error=null. Fresh anonymous shared-library API readback returned all 13 uploaded books as ready. The recovered books each have six questions and reviewed summaries of 7,843–11,413 characters. The static uploaded catalog now marks them ready and takes its short introductions from those published orientations. Cover generation is a separate queue; two covers were still pending at the content-completion check.

## Guide navigation

Previously restoreReview() read the browser's pending sign-in draft on every page containing the composer. It now opens only on the dedicated Guides page with an explicit resume query. Closing the dialog consumes resume/id URL parameters but preserves the draft. Guides lists a locally saved draft with Resume book selection and Discard draft actions, unless the same guide is already listed from the server.

Verification: 45 focused unit tests passed; the book-worker HTTP mock suite passed; the Astro build completed. Browser regressions exercised email-link, signup-link, and password sign-in returns, preserved question/books/reading time, cross-page navigation, close/reload, manual resume, and discard. Password-return navigation was also exercised at 390px width. Authentication/backend replies were fixtures: no real emails, accounts, or guides were created by browser tests. Production recovery was verified separately against persisted jobs and the public API.
