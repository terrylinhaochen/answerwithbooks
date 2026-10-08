# Website analytics

Primary GA4 destination: `G-FNWRC3EMV4`. `Base.astro` always includes it exactly once; optional environment-configured destinations are validated and deduplicated. The deployed site uses the Google tag directly, without a second Tag Manager container.

## Visitor behavior

Public pages show a small, non-modal Allow analytics / No thanks choice. Both answers are remembered for 180 days. Unknown, expired, invalid or declined consent loads no Google Analytics library. GPC and DNT override a saved opt-in. The Privacy page remains the place to change or withdraw a choice. Withdrawal disables collection, removes GA cookies and reloads the page to unload Google's event listeners.

This is basic consent mode: local consent defaults to denied, a granted update precedes loading the Google tag, and advertising storage/user data/personalization remain denied. The choice UI does not subscribe a visitor or change account permissions.

## Data collected

- A single `config` call per destination requests one automatic `page_view` per full public-page load. No additional manual pageview duplicates it.
- Page location excludes the query string and fragment; page referrer is blank.
- Explicit `book_purchase_click` events record the public book slug, Amazon product identifier, marketplace, placement and canonical Amazon URL. They measure clicks, not orders.
- Account/auth, private-book, processing, agent-connection and source-submission routes do not load analytics. Forms/source text/account IDs are not added as custom event parameters.

A crawler or fresh browser that has not accepted analytics will intentionally see no Google tag network request. This alone is not evidence of a broken installation.

## Verification, October 7, 2026

A controlled live visit confirmed the existing ID was correct: after choosing Allow analytics on Privacy, Google returned HTTP 200 for `gtag/js?id=G-FNWRC3EMV4` and HTTP 204 for a `page_view` collection request addressed to the same ID. A fresh visit made zero Google Analytics requests. The discoverability problem was that the only opt-in controls lived on Privacy.

The new public choice, opt-in and decline persistence, expiry, repeated consent, cookie withdrawal, single property configuration, sanitized page location, private-route exclusions, GPC/DNT, and 320/390/1280px layouts passed `scripts/test-analytics-consent.mjs` against a fresh static build. Google is mocked in that regression suite. `scripts/test-book-purchases.mjs` verifies all 46 purchase cards and consent-controlled events. `scripts/check-product-surface.mjs`, which runs in deployment CI, checks the primary destination exists exactly once on the main public routes.

To run browser checks without sending production analytics:

```sh
AWB_TEST_ORIGIN=http://127.0.0.1:4323 node scripts/test-analytics-consent.mjs
AWB_TEST_URL=http://127.0.0.1:4323 node scripts/test-book-purchases.mjs
```

For a manual live check, open the production website in a fresh browser, choose Allow analytics, and inspect the Google tag and collection request. In GA4, use Reports > Realtime first. Standard reporting can take 24–48 hours. A collection response proves delivery to Google's endpoint, not visibility in the signed-in reporting property; property filters and reporting ingestion must be checked there separately.

References: [Google basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic), [pageview configuration](https://developers.google.com/analytics/devguides/collection/ga4/views), [confirming data collection](https://support.google.com/analytics/answer/10201247?hl=en).
