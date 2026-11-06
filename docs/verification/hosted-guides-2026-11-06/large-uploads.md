# 500 MB hosted source uploads

Requested per-file limit: 500 MiB (524,288,000 bytes), displayed as 500 MB throughout the existing interface.

- Updated Supabase global storage setting and private-books bucket restriction; bucket remains private.
- Updated native API, CLI, browser validation and worker shared configuration. Page count (1,500) and extracted text (six million characters) limits remain.
- Browser fingerprinting uses pinned hash-wasm 4.12.0 in 4 MiB pieces. CLI hashes and uploads file streams. Edge finalization hashes the signed source stream, preserving exact byte-size and SHA-256 checks without whole-file buffering.
- Text PDFs now use hosted text extraction by default. Explicit technical extraction remains available. Native worker remains on the existing dedicated AWS instance.
- Real acceptance: original Invention PDF, 110,568,215 bytes, uploaded and finalized without compression. Hosted extraction completed. Shoe Dog PDF and Open EPUB also extracted. Resubmission of all three returned their original IDs, with no repeated source transfer.
- Local checks: 500 MiB streamed checksum; truncated, oversized, wrong-length and wrong-hash rejection; browser 500 MiB checksum in bounded pieces; exact maximum admission and maximum+1 rejection; native authentication/leases, worker protocol and CLI regression checks.
- Uploaded book IDs: Shoe Dog c9d37d22-0c77-4c6a-97b3-158f3f2a1719; Invention 9004d927-7785-4c3a-acf1-647f732485f7; Open 80c10600-ed6e-43ce-90b5-ef1b19159566.

The live biography run exposed two mapping issues: section titles overwrote book titles, and review rejection reasons were discarded instead of informing the next attempt. Metadata updates now only apply to initial source metadata; failed map reviews retain their findings for a bounded repair. Generation and review preserve the already-numbered originals, verified by a regression check.

Frontend and CLI package remain local preview artifacts; backend limits and worker changes are live. A real 500 MiB network upload has not been performed; the real network acceptance is the original 110.6 MB Dyson file.

## Completed catalog acceptance

All three books are ready with full source text retained: Shoe Dog 34/34 source sections, Invention: A Life 31/31, Open 38/38. Each has a source-reviewed summary, six exploration questions, and a generated house-style cover. Public catalog and detail readback passed without a signed-in session at 390 and 1280 pixels; source access still requires authentication. See `biography-catalog.json`.

The cover request now explicitly requires an opaque background. The first Dyson cover was transparent and was regenerated without repeating source extraction or mapping. Generated covers replace the publisher cover images in the compact homepage demo. Desktop/mobile animation, pause, reduced-motion, and no-JavaScript checks passed. Final build: 119 pages; product-surface checks passed.
