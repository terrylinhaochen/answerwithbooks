# Book purchase links and click measurement

Approved by the user on October 5, 2026: one card after the digest and before “Copy to agent,” Amazon.com destinations, and consent-based click tracking first. No affiliate ID is configured. Purchases are not measured.

## Implementation

`BookPurchase.astro` renders the approved “Read the full book” / “View on Amazon” card using the book's optional `amazon` frontmatter. Native links open a new tab and work with JavaScript disabled or analytics unavailable. Each link uses `noopener noreferrer`; no redirect service, affiliate tag, price, or availability claim is added.

All 46 existing public books have a verified Amazon.com product ID. `book-purchase-catalog.json` retains the matched title, authors, edition, source, and verification date. Verification checked the live Amazon product title and author byline. Retail editions may be revised or anniversary editions; the linked edition is recorded explicitly where applicable. Future public books should receive the same metadata after editorial verification. Unverified entries render no purchase card. Private uploads do not automatically inherit retail links.

The local example is `/books/the-mom-test/#buy-the-book`. The one-off design preview was replaced by the real shared component after approval.

## Event contract

The existing GA4 consent gate sends `book_purchase_click` with:

| Parameter | Meaning |
| --- | --- |
| `book_slug` | Public catalog identifier |
| `retailer` | `amazon` |
| `marketplace` | `US` |
| `placement` | `digest_end` |
| `product_id` | Verified Amazon ASIN |
| `link_url` | Canonical Amazon product URL without tracking parameters |

Mouse click, middle click, and keyboard activation each produce one custom event. The handler never prevents navigation or waits for analytics. Consent defaults to off, expires after 180 days, and is overridden by Do Not Track and Global Privacy Control. No custom account identifier, email, or private book content is included. GA's existing analytics cookies and device information remain governed by the Privacy choices setting. The privacy notice documents the new event.

## Reporting setup after deployment

The code uses the existing site measurement ID (`PUBLIC_GA_MEASUREMENT_ID`, or the existing fallback in Base.astro). No authenticated GA administration session was available during implementation, so the following reporting configuration remains separate from the code and has not been applied:

1. Confirm receipt of `book_purchase_click` in the correct property's Realtime report after a consenting production click.
2. In Admin → Custom definitions, register event-scoped `book_slug` (Book), `marketplace` (Marketplace), and `placement` (Placement). Register `product_id` only if needed for edition analysis.
3. Create a free-form exploration filtered to Event name = `book_purchase_click`, with Book as rows and Event count plus Total users as values. Optionally add date and placement. Label the metrics “Amazon clicks” and “Consenting visitors who clicked,” not purchases.
4. Keep enhanced-measurement outbound `click` separate from this custom event to avoid counting the same action twice. Custom dimensions may take 24–48 hours to appear after setup and collection.

The total event count measures interactions; Total users is GA's visitor estimate, not a verified count of individual people. Counts exclude visitors who decline analytics or block it. Browser acceptance tests isolate Google requests; they do not prove events reached the live GA property.

## Purchase reporting later

An ordinary Amazon link cannot report checkout completion back to this site. An approved Amazon Associates account and correctly tagged links can provide aggregate ordered/shipped items and other attribution reports. Those are not individual identified purchasers and should not be relabeled as site-side checkout events. No Associate account, affiliate tags, or purchase attribution are part of this release. If added later, include the required affiliate disclosure.

## Verification

Run `npm run build`, serve the output with `npm run preview -- --host 127.0.0.1 --port 4321`, then run `npm run test:book-purchases`. Set `AWB_TEST_URL` or `PLAYWRIGHT_CHROME_PATH` for another environment. The test checks every rendered catalog destination and placement; real link behavior; mouse/middle/keyboard activation; consent on/off, expiry, future timestamps, DNT, GPC, withdrawal; JavaScript disabled; analytics failure; and desktop/mobile layouts. External Amazon and Google endpoints are isolated in those interaction tests.

Sources:

- [Google event reporting](https://support.google.com/analytics/answer/9322688)
- [Google custom dimensions](https://support.google.com/analytics/answer/14239696)
- [Amazon reports](https://affiliate-program.amazon.com/help/node/topic/GMWAK55DQX8JEK7C)
- [Amazon affiliate disclosure](https://affiliate-program.amazon.com/help/node/topic/GHQNZAU6669EZS98)
