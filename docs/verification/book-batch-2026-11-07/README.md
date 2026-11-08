# Founders batch two — 7 November 2026

Ten user-supplied originals (nine PDFs, one EPUB) were uploaded through the authenticated book-native flow. Original filenames, byte counts, SHA256 hashes, verified titles, Founders list entries and job URLs are in jobs.json. No source was downloaded from an outside library. Reconnected CLI authorization was used; no credentials are stored here.

All ten production extractions completed. The EPUB, Jesus: A Biography from a Believer, used book-to-skill/zipfile and produced 277,836 source characters. PDFs used book-to-skill/pdftotext. The public processing route retains the source, maps passages, creates a source-reviewed editorial digest and orientation/questions, then queues its cover. It does not generate a separate agent skill per public book.

Titles and authors were verified from the files, correcting misleading filenames such as George Lucas Interviews (George Lucas: A Life) and Apple Success Obsession (Insanely Simple). Dior by Dior is the user's acquisition checkpoint, not an uploaded file in this batch. See ../../research/founders-progress.md.

## Cover consistency

The hosted worker still requested old opaque sticker artwork. New covers now request a square transparent illustration with tactile vertical ink bars, pinholes and a recognizable physical subject in one muted ink. Cover filenames are versioned as cover-print-v1.png. The shared jacket renderer recognizes that version and applies the same cream paper, printed title panel and matching ink used by the existing shelf. Existing curated artwork and legacy cover rendering are preserved. The client computes the ink with the same helper as generation, including in selectors that do not supply coverColor.

Production book-process v50 was deployed from the retrieved v49 live bundle, replacing only the cover-design module and the image request background setting. Authorization and other live dependencies were preserved. Bundle SHA256: 11cad432056f35a6bcdfbf572896b18f0cf4bd096cee245d97ce324ce6480602.

Validation: 71 book-pipeline unit tests, focused reading-guide tests, mocked processing-handler checks and Astro build passed. PR #17 passed CI and merged as c79e8c5a5b6572ad23e3df72836b886529e815c0. GitHub Pages run 42460456255 succeeded. Production browser fixtures at 1440px and 390px verified the new jacket class, loaded artwork, text bounds and absence of horizontal overflow. The fixture art was an existing image, not a claim about the generated batch covers. A fresh worker readback confirmed v50 differs from v49 only in the two intended files. Actual generated art and completed summaries were subsequently verified separately after queue completion.

## Status

All ten books are complete and publicly readable, with reviewed summaries (1,301–1,768 words), five or six reading questions, and generated textured covers. Production job state is ready/complete, all cover states are ready, and all errors are null. Fresh anonymous API readback is saved in readback.json. EPUB support was verified end to end with Jesus: A Biography from a Believer.

## Source-boundary review

During this batch, factual reviewers rejected extrapolated outcomes beyond mid-sentence chunk boundaries (for example, predicting a challenge after Jobs asks to meet a winner). The map prompt now explicitly leaves cut-off events unresolved, prevents unsupported identity guesses, and treats bibliographies as reference matter even in mixed chunks. Factual review remains unchanged. Production book-process v51 replaces only the reading-guides mapping instructions from the retrieved v50 bundle; SHA256 07c09ae881106437704d1c6ba56ddcc696f44e7fe3c34c175cc2b8e5262c3960. The 32 reading-guide tests and mocked processing-handler suite passed.

The first finished EPUB has a 1,725-word digest, six questions and a generated cover. Its actual production page passed desktop/mobile checks. Live status is recorded in readback.json; it is a point-in-time observation, not a promise that pending books are complete.

## Cover refinement

The first Insanely Simple illustration resembled a generic separate-monitor PC. Its subject instruction was refined to an upright 1984-style all-in-one computer, and only that cover was requeued. The accepted text and original file were unchanged. book-process v52 contains this subject-only refinement on top of v51; SHA256 d227731dc04aa38060f6cfe7212afd642689fdaae123684215bb916aa37e14ff. The replacement cover was retrieved and visually checked. Completed cover PNGs have genuine alpha transparency, verified separately from their appearance in the cream jacket.

## Editorial repair

Tycoon’s War completed all 82 maps, then exhausted five editorial reviews. The final review mixed legitimate scope problems (universal causal claims and unsupported author intent) with blanket rejection of narrow editorial synthesis solely because it was not stated verbatim. The reader now explicitly marks interpretations and separates them from author claims. Its review instructions allow limited, identified synthesis supported by each paragraph's cited facts, while retaining all checks against invented facts, motives, universal rules, guarantees and stronger obligations. Targeted repairs can narrow or replace unsupported arguments instead of being told to preserve them. Every claim must still pass review.

Reader prompt provenance is reader-digest-v3 with its recalculated instruction hash. book-process v53 replaces only book-reader.mjs and book-reader-prompt.json from the retrieved v52 bundle; SHA256 86a0f4dc7a60e92b36eaa4f4d659f16e5605e7efaa6819aab3f158f3483c9c7d. The 47 reader/guide/quality tests and mocked worker HTTP suite passed. Only the failed Tycoon’s War editorial job was resumed; the accepted maps, draft, review findings and accepted paragraph were retained. The accepted paragraph's pre-repair MD5 was 621fbabf62c011ac9c6367a205e96404.

## Final presentation and provider checks

Fresh public readback caught duplicated headings and review-process language inside Tycoon’s War's repaired paragraphs. The repair path now strips an exact repeated heading prefix and rejects characteristic review commentary before semantic review. A regression test verifies that otherwise factual prose cannot publish with that commentary. Previously accepted prose was preserved during targeted repairs; the final independent review subsequently requested a narrower formulation of that paragraph too. The old digest was retained in backup artifact keys, and the existing operator refresh published the reviewed replacement atomically while the public page stayed available. Reader prompt provenance is now reader-digest-v4.

Walt Disney's cover requests returned HTTP 400, moderation_blocked. The initial artwork brief unnecessarily included an introduction about death and cryogenic rumors even though the requested subject was just a drawing board. Defined illustration subjects now send only the neutral object brief and art direction, omitting irrelevant source passages. Moderation remains enabled; only a revised benign illustration request was retried. Sanitized provider status/code diagnostics are stored with cover usage, without credentials or full provider messages.

Final worker deployment is book-process v57, SHA256 127179bcb5aa170310ff42648a5d8c529d5003d86bac515cba328ba464fec6be. The prior production bundles were used for each narrow deployment; authorization and unrelated live files were preserved. No accepted source maps were regenerated.

Final refresh request 2238 succeeded. Tycoon’s War has no duplicated heading paragraphs or flagged review commentary, and generation feedback is cleared. All 530 source sections completed. Ten production readers were checked at 1440px and 390px; see browser-checks.json. Cover artwork was visually inspected and its PNG transparency checked separately.
