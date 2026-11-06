# Hosted Markdown handoff and extraction repairs — November 6, 2026

## Delivery

The local guide reader copies the approved short prompt for public guides: “Read this guide: [hosted Markdown URL]. Use https://answerwithbooks.com/SKILL.md to help me connect it to my experience. Start by asking what interests me about the question.” Private guides retain their self-contained prompt and are never published by this flow. The existing provider buttons, remembered choice, and clipboard fallback remain.

`reading-guides` version 21 is live. `GET /functions/v1/reading-guides/{UUID}.md` returns UTF-8 Markdown without credentials, only when the guide is public and ready and its original sources remain available. HEAD is also supported. No complete book files or internal account fields are included. Private, unready, invalid, and missing guide IDs are rejected. The frontend and the new read-first section in the website's SKILL.md route remain local changes, not a production website deployment.

## Source repair evidence

The supplied Invention PDF (SHA-256 cb61b767c8cd576f2aab0b9769638f2d12bbd85a0ffbd800d50948d1a7dbbd94) has five EBGaramond ToUnicode mappings to U+0000: 03E6=ff, 03E9=ffi, 03EC=ffl, 03EF=fi, 03F2=fl. PDF page 258 was rendered and inspected; extracted glyph contexts across the edition corroborated the mappings. This is an extraction defect, not author spelling.

The repair manifest stores character edits for 1,390 matched lines, guarded by the original upload SHA and each original line SHA. It contains no full source lines. `scripts/verify-dyson-ligatures.py` reproduces it using the supplied PDF and a saved extraction. It repairs only unambiguous matching lines; it does not claim every defect in the entire edition has been resolved. Standard Unicode presentation ligatures are also expanded. Other words and unverified editions are not spell-corrected.

Stored source text and legacy passage hashes are unchanged. All 9,576 source line coordinates remain intact. Existing guide hydration verifies the original bytes before applying readable-text repairs; model passage inspection uses the same normalization. The native extraction worker itself was not redeployed.

## Verification

- 25 reading pipeline tests and 2 targeted normalization/integrity tests pass.
- Actual Edge handler fixture: public Markdown GET/HEAD; private/unready/missing rejection; missing source fails closed.
- Existing HTTP suite: ownership, archived owner readings, confirmation, free allowance, and source restrictions pass.
- Every generated line edit matches the independently PDF-derived correction, with normal Unicode ligature expansion.
- Live anonymous GET for guide f4d44ec6-118a-4ec7-8b1b-17824b2e243e returned 200, text/markdown, eight passages, and corrected intensifies/qualified/significant. A nonexistent UUID returned 404.
- Live-data preview: exact 261-character prompt, all four provider copy flows, remembered provider, blocked clipboard fallback, repaired text, and no page errors. Provider navigation was intercepted; no messages were sent to external agents.
- Existing security advisories remain 113 INFO RLS-enabled/no-policy findings and one leaked-password protection WARN; this change adds no table, policy, or grant.

No live generation, payment, or subscription allowance was consumed.
