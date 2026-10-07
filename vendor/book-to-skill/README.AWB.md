# Upstream code used by Answer with Books

Source: https://github.com/virgiliojr94/book-to-skill
Pinned commit: `e180fc46365e8c1aab0120778cc8a40b9515324b` (1.4.0).
License: MIT; see LICENSE.md. Copyright (c) 2025 virgiliojr94.

The package Python modules, two validation tools, SKILL.md, and pyproject.toml are copied unchanged. UPSTREAM.json records their SHA-256 hashes. The website build verifies every hash and bundles the Python sources for a same-origin Pyodide Web Worker. AWB's wrapper lives in scripts/book-adapter/adapter.py; upstream files are not modified.

Direct reuse: EPUB/DOCX/HTML/RTF/text parsers, invisible-character sanitizer, structure and token heuristics, skill frontmatter validator, advisory generated-skill scanner. Native CLI also uses the original extraction dispatcher. Browser PDF extraction remains PDF.js and then calls the upstream analysis code. Technical PDFs use a dedicated native worker with Docling layout, table, code and equation processing. MOBI/AZW/AZW3 use the unchanged Calibre parser on that worker. The explicit technical path fails rather than silently falling back to plain text. These are server features; browsers upload the original file to private storage.

Selected original Philosophy, cheatsheet priorities, and Quality Rules from SKILL.md are included with attribution in supabase/functions/_shared/upstream-guidance.mjs. The worker's Unicode ranges are generated from the original sanitizer using scripts/generate-upstream-sanitizer.py. The original license is included in the deployed runtime.

To update: review upstream changes and license, replace the selected files from a specific commit, refresh UPSTREAM.json hashes, regenerate derived guidance/sanitizer, and run upstream pytest/ruff plus AWB native, browser, worker, compiler, and authenticated acceptance tests. Do not silently update only the commit string. Upstream detection/scanning are heuristic; successful validation does not certify factual fidelity or agent behavior.

Answer with Books adds a stable account book identity, reviewed append/replace revisions, original-source line mapping, and account-scoped individual skill installation. These are application features around upstream extraction and skill conventions, not changes to the vendored source. Public-library source acquisition is a separate backfill; editorial digests do not become full-source packages.
