# Founders batch two — 7 November 2026

Ten user-supplied originals (nine PDFs, one EPUB) were uploaded through the authenticated book-native flow. Original filenames, byte counts, SHA256 hashes, verified titles, Founders list entries and job URLs are in jobs.json. No source was downloaded from an outside library. Reconnected CLI authorization was used; no credentials are stored here.

All ten production extractions completed. The EPUB, Jesus: A Biography from a Believer, used book-to-skill/zipfile and produced 277,836 source characters. PDFs used book-to-skill/pdftotext. The public processing route retains the source, maps passages, creates a source-reviewed editorial digest and orientation/questions, then queues its cover. It does not generate a separate agent skill per public book.

Titles and authors were verified from the files, correcting misleading filenames such as George Lucas Interviews (George Lucas: A Life) and Apple Success Obsession (Insanely Simple). Dior by Dior is the user's acquisition checkpoint, not an uploaded file in this batch. See ../../research/founders-progress.md.

## Cover consistency

The hosted worker still requested old opaque sticker artwork. New covers now request a square transparent illustration with tactile vertical ink bars, pinholes and a recognizable physical subject in one muted ink. Cover filenames are versioned as cover-print-v1.png. The shared jacket renderer recognizes that version and applies the same cream paper, printed title panel and matching ink used by the existing shelf. Existing curated artwork and legacy cover rendering are preserved. The client computes the ink with the same helper as generation, including in selectors that do not supply coverColor.

Production book-process v50 was deployed from the retrieved v49 live bundle, replacing only the cover-design module and the image request background setting. Authorization and other live dependencies were preserved. Bundle SHA256: 11cad432056f35a6bcdfbf572896b18f0cf4bd096cee245d97ce324ce6480602.

Validation: 71 book-pipeline unit tests, focused reading-guide tests, mocked processing-handler checks and Astro build passed. PR #17 passed CI and merged as c79e8c5a5b6572ad23e3df72836b886529e815c0. GitHub Pages run 42460456255 succeeded. Production browser fixtures at 1440px and 390px verified the new jacket class, loaded artwork, text bounds and absence of horizontal overflow. The fixture art was an existing image, not a claim about the generated batch covers. A fresh worker readback confirmed v50 differs from v49 only in the two intended files. Actual generated art and completed summaries require separate readback after queue completion.

## Status

All ten originals are saved and extracted. Source mapping and review are in progress; none should be described as complete based on upload success alone. Final readback is recorded separately when processing and covers finish.

## Source-boundary review

During this batch, factual reviewers rejected extrapolated outcomes beyond mid-sentence chunk boundaries (for example, predicting a challenge after Jobs asks to meet a winner). The map prompt now explicitly leaves cut-off events unresolved, prevents unsupported identity guesses, and treats bibliographies as reference matter even in mixed chunks. Factual review remains unchanged. Production book-process v51 replaces only the reading-guides mapping instructions from the retrieved v50 bundle; SHA256 07c09ae881106437704d1c6ba56ddcc696f44e7fe3c34c175cc2b8e5262c3960. The 32 reading-guide tests and mocked processing-handler suite passed.

The first finished EPUB has a 1,725-word digest, six questions and a generated cover. Its actual production page passed desktop/mobile checks. Live status is recorded in readback.json; it is a point-in-time observation, not a promise that pending books are complete.
