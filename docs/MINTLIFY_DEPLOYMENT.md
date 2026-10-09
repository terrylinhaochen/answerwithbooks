# Mintlify customer documentation

The customer documentation lives in `mintlify/`. Deploy that directory only; the repository's `docs/` directory contains engineering notes and release evidence, not the documentation site.

## Project connection

- Plan: **Starter ($0)**. Do not activate paid AI features or a paid subscription.
- Project name: **Answer with Books**.
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

At preparation time, CLI authentication to the CrowdListen organization succeeded, but no Mintlify project was returned. Hosted publication, Starter plan verification and custom-domain cutover remain pending the dashboard project connection. Browser automation was unavailable in this session. Do not describe the migration as live until these checks complete.
