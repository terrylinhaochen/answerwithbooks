# Mintlify customer documentation

The customer documentation lives in `mintlify/`. Deploy that directory only; the repository's `docs/` directory contains engineering notes and release evidence, not the documentation site.

## Project connection

- Plan: **Starter ($0)**. Do not activate paid AI features or a paid subscription.
- Project name: **Answer with Books**.
- Primary URL: https://docs.answerwithbooks.com.
- Mintlify fallback: https://crowd-listen.mintlify.site.
- Repository: `terrylinhaochen/answerwithbooks`.
- Branch: `main`.
- Documentation subdirectory/content path: `mintlify`.
- Configuration: `mintlify/docs.json`.

Mintlify's GitHub App is installed with access limited to `terrylinhaochen/answerwithbooks`. The generated `.mintlify.site` URL passed hosted acceptance. The custom domain is verified and its HTTPS certificate is active.

The book application stays on GitHub Pages. The stable agent entrypoint stays at `https://answerwithbooks.com/SKILL.md`; Mintlify's setup guide links to it. App documentation links use `https://docs.answerwithbooks.com`. `/docs/private-books-api.md` and `/tools/local-book-processing/` retain compatibility content and links to the current Mintlify guides.

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

GitHub automatic synchronization is verified: commit `fa199e6` changed the documentation landing heading to “Use books with your agent,” and that exact heading appeared on the hosted site after the push without a manual deployment.

One account can hold multiple projects. The dashboard supports an additional Starter deployment; a second project has not been created as part of this migration.

## Custom domain — October 9, 2026

GoDaddy manages `answerwithbooks.com` DNS. Added the two Mintlify-provided TXT records at `_acme-challenge.docs` and `_cf-custom-hostname.docs`, waited for verification and an active TLS certificate, then added `CNAME docs → cname.mintlify.builders` (TTL 1800 seconds). Existing website and email records were preserved. Keep the verification records for ongoing domain ownership and certificate renewal.

Mintlify reports `configured: true`, `cnameConfigured: true`, and SSL `active`. Fresh Chrome requests resolve the custom domain and serve the documentation successfully over HTTPS. Public resolvers confirm the CNAME; some previously negative local resolver caches may briefly lag. `mintlify/docs.json` sets the custom domain as the canonical origin.
