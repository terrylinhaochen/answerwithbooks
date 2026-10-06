# CrowdListen skills directory handoff

This preserves the Answer with Books research-skills directory before its public `/tools/` page was refocused on book skills on 2026-10-05. Nothing in this folder is imported into the AWB site build.

## What is preserved

- All five original catalog entries: GitHub leads, X discourse, Tinker audience, product-feedback analysis, and book answers.
- Search by task, role filters, pagination, capability cards, preview examples, and agent setup dialogs.
- Branded agent icons, copy/setup commands, authentication and account-access flows, and the research-router skill plus ZIP endpoint.
- Original implementation/design notes and five original test files.
- The relative-import dependency closure, including shared layout/auth utilities. `manifest.json` records the exact SHA-256 of every snapshot file and the original base commit.

`source/` mirrors the original **web/** directory. This is a source handoff, not a separate application ready for deployment. The original page is `source/src/pages/tools.astro`; the catalog is `source/src/data/skills.json`. The copied `package.json` documents the Astro/Tailwind/Supabase/icon dependencies; most of its scripts belong to the original full application.

## Porting map

| Source | Role in the destination |
| --- | --- |
| `src/data/skills.json` | Capability descriptions, outcomes, job roles, tools, and examples |
| `src/lib/skill-discovery.mjs`, `src/lib/skills-page.ts` | Search/filter/pagination behavior |
| `src/components/ToolDialogs.astro`, `src/lib/tools-page.ts` | Capability details and agent setup experience |
| `src/lib/tool-catalog.mjs` | Agent options, prompts, example requests, capability endpoints |
| `src/components/ToolAuthForm.astro`, `ToolAccountAccess.astro`, related auth/access modules | Reference behavior; adapt to CrowdListen's actual workspace/auth model |
| `public/tools/awb-tools/SKILL.md`, ZIP route, `tool-skill-package.mjs` | Existing research-router skill and portable setup bundle |
| `scripts/test-*.mjs` | Preserved behavior checks and contract examples |

## Integration boundaries

1. Inspect `/Users/terry/Desktop/crowdlisten_files` and its repository instructions first. It contains multiple projects; do not assume the root is one Git repository. Find the frontend that owns CrowdListen's current skills/workflow experience.
2. Reuse the catalog content and proven UI behavior where they fit the destination. Port Astro components to the destination's actual framework. Keep CrowdListen's existing navigation, workspace selection, permissions, workflow versions, approval/revision history, and saved results.
3. The four research/API capabilities were labeled **private preview**. This snapshot does not establish that any capability is deployed, authenticated, production-ready, billable, or safe to charge for. Reconcile each entry against the actual Skills API and its contracts.
4. Audit all AWB names, URLs, local-development addresses, auth callbacks, signup/newsletter hooks, commands, and public config references before adapting. Use the destination's own environment configuration. There are no `.env` files, service keys, or user credentials in this package.
5. Keep the book-answers entry as an optional cross-product integration with Answer with Books; do not duplicate its book processing worker unless that is explicitly in scope.
6. Avoid introducing a competing generic marketplace. Fit research capabilities into CrowdListen's established outcome/workflow surfaces with real inputs, outputs, and agent handoffs.
7. Verify authenticated execution, persisted results, rendering, and agent handoff in the destination before calling it shipped. Local UI and preserved tests are not production evidence.

The existing legacy AWB skill-file and ZIP URLs remain available for compatibility. Known research-setup return URLs now continue to the existing API-key management page; the former directory/setup dialogs are preserved here for the destination integration. Their broader directory UI has been removed from AWB navigation and replaced with the book-focused page. Shared authentication modules remain in AWB because other routes still use them.

## Integrity check

Run `python3 verify.py` from this directory. The source snapshot is intentionally frozen; make destination adaptations in the destination repository, not inside this provenance copy.

A ready-to-paste request for the destination agent is in `AGENT_PROMPT.md`.

## Validation notes

The checksum manifest verifies the preserved files. `test-skills-surface.mjs` and the rendered portion of `test-tool-catalog.mjs` expect the **original** five-card directory; do not point them at AWB’s new book-skills page. Port those expectations with the destination UI. Auth/OAuth/access module tests use stubs, not live accounts. Some tests also read files relative to the working directory and expect the original application context.
