# Search and AI discovery

## What this release addresses

The public shelf has 46 book digests and 22 application guides. The missing layer was a useful choice between books for a particular job. This release adds six editorial reading paths, improves the customer-interview guide with an adaptable question table and notes template, and joins the three layers with ordinary HTML links:

- Book digest: “The Mom Test summary” → `/books/the-mom-test/`.
- Application: “how to do user interviews” → `/answers/how-to-run-user-interviews-that-do-not-lie-to-you/`.
- Book choice: “books for customer interviews” and “The Mom Test vs Continuous Discovery Habits” → `/reading-lists/customer-interviews/`.

The paths cover interviews/product discovery, startup validation/distribution, strategy/positioning, management/team design, decisions, and focus/priorities. Each explains when to choose a book, its mechanism, a next action, and a limitation. These are selections from our existing library, not a claim to rank every relevant book. Recommendations are grounded in linked public digests; exercises and comparisons are explicitly our editorial synthesis. No quotations or primary-source page citations are invented.

`query-inventory.json` records all public book/application pages and selection clusters. The phrases are editorial hypotheses, not measured query demand. Related phrasings share a canonical page. The interview troubleshooting guide stays separate because diagnosing ineffective interviews is a different task from planning a first interview.

## Research used

Adapted from the other chat's downloaded research, recorded at `docs/search-discovery/RESEARCH.md` in the CrowdListen `seo-aeo-20261022` worktree and snapshots in `/private/tmp/crowdlisten-seo-research-20261022/`:

- [Marketing Skills](https://github.com/coreyhaines31/marketingskills/tree/e85f3cbc2e4a79bf33b2a12e9bdd9087d414735b): internal architecture, intent, AI-readable answers, and measurement.
- [OpenSEO](https://github.com/every-app/open-seo/tree/c5f8db19c7ca9e750836b6ed5c8a6491d4f967f4): one useful page per intent cluster, rather than one thin page per phrase.
- [GTM Engineer Skills](https://github.com/onvoyage-ai/gtm-engineer-skills/tree/cfdb9edd84109077153fa7faf776eb35f6c04370): separate brand mentions, citations, and recommendations; preserve exact prompts and observations.
- [Google AI search guidance](https://developers.google.com/search/docs/appearance/ai-features): normal crawlability, useful textual content, internal links, and accurate structured data apply; no special AI schema or file is required.
- [Google spam policies](https://developers.google.com/search/docs/essentials/spam-policies): avoid doorway pages and scaled low-value content.

The downloaded files are reference material, not installed executable skills. We did not run third-party installers, require paid SEO services, use a proprietary visibility score, fabricate search volumes, or create keyword-swapped pages. `llms.txt` is an agent-facing directory, not a claimed ranking lever.

## Technical changes and boundaries

- `/guides/` owns the guide index. The legacy `/answers/` index uses Astro's static redirect; existing `/answers/<slug>/` articles retain their URLs. GitHub Pages serves the generated HTML redirect, not an HTTP 301. A future hosting change can add a server redirect; do not claim this is one.
- Removed deployment-time sitemap `lastmod`. Updated content can publish an explicit `updated` date, used in both its visible byline and Article metadata.
- Reading paths are server-rendered, linked from book/guide catalogs, related books/articles, the footer, the sitemap, and `llms.txt`. No sign-in or JavaScript is required to read them.
- Existing search/AI crawler access remains allowed. Private pages retain authentication and noindex; robots rules do not secure private data.
- Sharing metadata uses available PNG covers as well as JPEGs. Optional image dimensions are omitted rather than falsely declaring every portrait cover 1200×630.
- Book schema uses `subjectOf` for articles about a book, not `workExample` (editions). Simple pages receive truthful WebPage metadata. FAQ schema is optional; where supplied, the audit checks parity with rendered questions and answers.
- No model changes, generated private books, billing behavior, Supabase migrations, or paid inference are part of this release.

## Publishing and validation

Run with Node 22:

```sh
npm run build
npm run audit:seo
npm run audit:discovery
npm run discovery:inventory
```

Run the browser check against a local Astro preview with `DISCOVERY_BASE_URL=http://127.0.0.1:4363 node scripts/search-discovery-browser.mjs`. It checks desktop/mobile rendering and JavaScript-disabled access to the new pages, interview template, and full guide catalog. The same test can target production. Screenshots go to the path specified by `DISCOVERY_SCREENSHOTS`, default `/private/tmp/awb-search-discovery`.

After changing a reading selection, check every linked digest and guide, preserve the distinction between author argument and editorial application, rebuild the inventory, and run both audits. Content references are validated at build time; missing books/guides fail the build. The deployment workflow runs the built HTML SEO/discovery checks before publishing.

## Measurement: readiness is not visibility

A passing audit proves the pages are available and internally consistent. It does not prove indexing, ranking, traffic, or AI citations.

Use `visibility-observations.csv` to record exact engine, surface (consumer UI versus API), prompt, locale, timestamp, relevant returned URLs, and evidence location. Record zero citations as zero; record a failed/unavailable query as unobserved, not zero. Separate AWB mentions, AWB citations, and AWB recommendations. Do not infer consumer-search performance from a model API response.

The six reading-path query clusters and their existing book/application counterparts are the initial panel. Sample the same prompts at least three times per engine over different days. Report citations per successful observation, the number of unique prompts, and per-engine results; do not combine providers into an unexplained score. Avoid repeated prompts in the same chat, which can contaminate context. Paid provider tests require a separate spend approval.

For Google Search Console, use the existing verified property only after confirming access. Submit the normal sitemap and inspect representative URLs; do not use Google's job/live-event Indexing API for these pages. Compare 28-day impressions, clicks, query groups, and landing pages before/after release, with brand/non-brand and new/existing pages separated. Seasonality and indexing delay prevent causal claims from a simple before/after chart. Export observations rather than inventing missing data.

GA4 events and page views remain subject to existing consent. Search referrals, reading-path visits, and clicks through to digests can be assessed in the existing property without adding fingerprinting or private-library content to analytics. A future external outreach campaign, paid engine panel, or large new content wave is a separate action, not silently part of this release.

## Initial observed baseline

On 2026-10-23, the web-search tool query `site:answerwithbooks.com "The Mom Test"` returned the public book digest, the interview guide, validation guides, the books catalog, and the legacy answers index. The raw returned result is saved in `search-baseline.json`. This establishes that those URLs were discoverable in that tool at that time. It is not a Google Search Console indexing report, a reproducible ranking position, or an observation of a consumer AI answer citing the site. No post-release visibility lift has yet been measured.
