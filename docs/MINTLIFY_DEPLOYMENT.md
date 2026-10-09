# Mintlify customer documentation

The customer documentation lives in `mintlify/`. Deploy that directory only; the repository's `docs/` directory contains engineering notes and release evidence, not the documentation site.

## Project connection

- Plan: **Starter ($0)**. Do not activate paid AI features or a paid subscription.
- Project name: **Answer with Books**.
- Hosted URL: https://crowd-listen.mintlify.site (the initial hostname inherits the organization name).
- Repository: `terrylinhaochen/answerwithbooks`.
- Branch: `main`.
- Documentation subdirectory/content path: `mintlify`.
- Configuration: `mintlify/docs.json`.

Mintlify's GitHub App must be authorized for this repository. Keep repository access limited to the selected repository. Use the generated `.mintlify.site` URL for initial hosted acceptance; add `docs.answerwithbooks.com` after the project is connected and its exact DNS requirements are available.

The book application stays on GitHub Pages. The stable agent entrypoint stays at `https://answerwithbooks.com/SKILL.md`; Mintlify's setup guide links to it. Do not redirect existing customer documentation URLs or change app links to an unverified Mintlify hostname. Once hosted acceptance passes, update app documentation links, add redirects/compatibility links for `/docs/private-books-api.md` and `/tools/local-book-processing/`, and verify the exact deployed URL.

## Content

Ten pages cover introduction, skill setup, library use, source intake, hosted generation, own-agent generation, billing, CLI, private-books API and troubleshooting. Internal pricing formulas, provider credentials, QA identities and operator recovery instructions are excluded. Existing book digests and reading guides remain in the product.

The Mintlify site requires no paid Assistant, Agent, automations or admin API. Its documentation search MCP is separate from authenticated book access.

## Local verification

Tested with `mint@4.2.994` on October 9, 2026:

```sh
cd mintlify
npx --yes mint@4.2.994 validate --telemetry=false
npx --yes mint@4.2.994 broken-links --telemetry=false
npx --yes mint@4.2.994 dev --no-open --telemetry=false
```

Validation and broken-link checks passed. The quickstart rendered on desktop and mobile without horizontal overflow. Local preview may display simulated Mintlify premium controls; it does not establish a paid plan or verify hosted plan entitlements.

## Hosted verification — October 9, 2026

The existing public repository was connected and onboarding finalized successfully. The dashboard project is named **Answer with Books**; both the organization and deployment report the free `hobby` tier (Starter). No paid subscription was activated. All ten published pages returned HTTP 200 with their expected headings, and no internal pricing multiplier was present. App links now point to the verified hosted docs; legacy URLs retain compatibility links.

Custom-domain setup remains separate: `docs.answerwithbooks.com` is not configured. GitHub automatic synchronization still requires verification with a subsequent content update; initial publication alone does not establish webhook delivery.

One account can hold multiple projects. The dashboard supports an additional Starter deployment; a second project has not been created as part of this migration.
