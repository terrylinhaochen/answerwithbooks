# Three free guides per month — 2026-11-06

## Policy and implementation

Signed-in accounts without an active paid subscription receive three guides per UTC calendar month, resetting at 00:00 UTC on the first. Active subscribers receive thirty per paid billing period. Free and paid allowances use separate ledger kinds and periods, so upgrading does not subtract free guides from the new paid period; cancellation returns to the same calendar month's remaining free allowance.

Confirmation reserves allowance atomically under a per-account advisory transaction lock, including accounts with no Stripe/customer row. Repeated confirmation is idempotent. Existing settlement triggers release failed/gap or deleted unfinished reservations. Deleting or hiding a completed guide does not refund it. Historical rows retain their subscription kind; old manual/test guides without allowance rows do not consume the new free allowance.

The proposal API allows free accounts while under quota; exhausted accounts receive FREE_GUIDE_LIMIT. Confirmation independently enforces quota. UI displays the remaining allowance and presents the upgrade card only after exhaustion. Billing provides a Create a free guide action. No payment card is needed for free guides. Additional source-context access through the skill retains its existing paid entitlement.

## Hosted changes and verification

- Applied migration reader_free_monthly_guides (local source 20261106194006_reader_free_monthly_guides.sql).
- Deployed reading-guides version 20; only the handler changed from version 19.
- Actual account status: tier free, active false, used 0, limit 3, periodEnd 2026-12-01T00:00:00+00:00. Checkout reported available; this check did not test payment or charge anything.
- Headless Chrome against the live service with the existing authorized account credential: Billing displayed 3 of 3 free guides remaining and the free creation action; Guides displayed the same allowance. No guide generated or free allowance consumed during acceptance checks.
- Local PostgreSQL integration: ten concurrent free confirmations allowed exactly three. Verified idempotency, failure and unfinished-deletion refunds, completed deletion accounting, UTC reset independent of session timezone, upgrade and downgrade isolation. Existing thirty-guide concurrent cap, authorization, shared library and webhook checks also passed.
- HTTP handler fixture: free proposal accepted; exhausted free account rejected without creating another job. Existing source ownership, archived-source reading, selected-book and confirmation checks passed.
- Browser fixtures passed for request states, guide creation/confirmation/reader, Personalize, shared reader, free/paid UI paths and mobile fit. Astro build passed.
- Local disk space initially prevented initdb. Removed only the ignored/reproducible guide-web/dist build output, used an isolated PostgreSQL 17 test cluster with smaller WAL settings, then rebuilt dist. No user sources were removed; no preexisting PostgreSQL service was modified.
- Security advisors before/after unchanged: service-only RLS tables intentionally have no end-user policies; existing leaked-password-protection warning remains outside this change. Reference: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . No new table, RLS policy or privilege grant was added.

Hosted quota/API changes are live. Frontend and skill/doc copy changes are in the local workspace and rebuilt preview, not a new production frontend release.
