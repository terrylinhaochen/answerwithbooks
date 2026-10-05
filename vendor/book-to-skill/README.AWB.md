# Upstream code used by Answer With Books

Source: https://github.com/virgiliojr94/book-to-skill
Pinned commit: `c108d25b0cb58e1bdc361f3de02ed9f37075152f` (1.4.0).
License: MIT; see LICENSE.md. Copyright (c) 2025 virgiliojr94.

The package Python modules, two validation tools, SKILL.md, and pyproject.toml are copied unchanged. UPSTREAM.json records their SHA-256 hashes. The website build verifies every hash and bundles the Python sources for a same-origin Pyodide Web Worker. AWB's wrapper lives in scripts/book-adapter/adapter.py; upstream files are not modified.

Direct reuse: EPUB/DOCX/HTML/RTF/text parsers, invisible-character sanitizer, structure and token heuristics, skill frontmatter validator, advisory generated-skill scanner. Native CLI also uses the original extraction dispatcher. Browser PDF extraction remains PDF.js and then calls the upstream analysis code. Optional native Calibre/Docling integrations require those tools to be installed; they are not browser features.

Selected original Philosophy, cheatsheet priorities, and Quality Rules from SKILL.md are included with attribution in supabase/functions/_shared/upstream-guidance.mjs. The worker's Unicode ranges are generated from the original sanitizer using scripts/generate-upstream-sanitizer.py. The original license is included in the deployed runtime.

To update: review upstream changes and license, replace the selected files from a specific commit, refresh UPSTREAM.json hashes, regenerate derived guidance/sanitizer, and run upstream pytest/ruff plus AWB native, browser, worker, compiler, and authenticated acceptance tests. Do not silently update only the commit string. Upstream detection/scanning are heuristic; successful validation does not certify factual fidelity or agent behavior.
