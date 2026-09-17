# Production release verification — 2026-09-17

## Shipped surfaces

- CrowdListen website: six-step setup, reviewed X organization affiliations, explicit agent selection, shared canonical Insights, evidence primitives, saved on-demand skills, and workspace balance connection. The former Shared knowledge destination is now Evidence & history behind Insights.
- API: release `20260917-shared-usage-v1`, with verified transport, provider routing, zero-operation receipt, and source-bound synthesis fixes. All 122 Python/template runtime files compared equal to the local release source. Running API image: `a550e015ce66e7e619240cd8f12a4bf7373b0867cad3f1d57181ba113d5afb8c`.
- HTTP MCP: updated the stale running harness to the existing published 2.2.1 source. Authenticated ingest, analyze, knowledge recall and original-source recall now pass against this actual service. Running image: `4756947b9a9e0b3f8a8e6a8876458122fbf120f37a52865ffa93f413fac1c6f5`.
- AWB API: shared usage callbacks, encrypted workspace connection, scoped analysis handoff, catalog pricing and original-source contract deployed to production and the isolated funded test environment.
- AWB website: CrowdListen catalog entry and shared usage history shipped through GitHub Pages (initial source commit `40f118a1`, workflow `35200117156` succeeded).

## Authenticated end-to-end evidence

The isolated Baseten workspace used real public material and real provider calls; wallet funds were Stripe TEST credits.

| Entry | Result | Provider list cost | Shared-wallet debit |
| --- | --- | ---: | ---: |
| Production website Run research | Completed; 12 source references, three accepted findings | $0.05868450 | $0.24 |
| Codex through production MCP, analyzing its captured homepage | Completed; original source and cited interpretation persisted | $0.00481275 | $0.02 |
| AWB product-feedback-analysis handoff | Completed in the same native backend and workspace | $0.00553800 | $0.03 |

All three usage rows settled in the same AWB account. The AWB wrapper adds no second fixed debit. Its underlying native usage row is the authoritative charge.

Baseten organization discovery returned 25 actual affiliated accounts. This verifies the configured X token and endpoint; it is a bounded page, not complete pagination or an assertion about the numeric X credit balance. Users review/select affiliates before tracking them.

Replaying source ingest, the MCP analysis request and the AWB request reused the same source/job IDs, preserved the balance and created no extra transaction or usage row. MCP original-source recall exactly matched all 6,514 captured homepage characters. Canonical knowledge recall resolved an exact quotation against its stored source revision; invalid and unresolved evidence lists were empty. The production browser showed canonical findings and the connected test wallet with no API response failures.

## Migration and release corrections

Applied CrowdListen migrations 20260917010000–060000, 080000 and 090000; applied AWB 20260917070000 and 080000. Backend/frontend copies match. The older entity_relationships and entity_activity_log tables were missing in production; the completion migration creates them behind the workspace-authorized service API and revokes direct browser privileges. Repeatability and access restrictions passed on local PostgreSQL. Existing user records and subscriptions were preserved.

The obsolete repository-root Vercel configuration initially produced 404 routes. The previous frontend was restored, then the correct candidate was tested under the production origin and promoted. Root and frontend Vercel configs now match. One automatic promotion review rejected an earlier check that hit the rollback frontend during an API restart; the exact candidate subsequently passed authenticated verification and promotion was approved. Final production frontend deployment: `crowdlistening-bvlz7cx2y-terrylinhaochens-projects.vercel.app`; live JavaScript entry `index.51621702.js`.

For CLI releases from the repository root, use `vercel deploy --prod --local-config frontend/vercel.json`. Confirm the actual production alias after a rollback; a Ready build alone is insufficient. Do not run browser acceptance checks during an API restart.

## Regression checks

- Backend: 112 release-focused database/API tests passed; 26 transport/jobs/access checks passed after the transport fix; 25 synthesis/pricing tests passed after source-window constraints; one additional real-PostgreSQL metadata migration/access test passed.
- AWB API: all 68 tests passed, including actual SQL wallet transactions, cross-mode holds, idempotency, key isolation and native source/quotation contracts. TypeScript build and hosted typecheck passed.
- Frontend: 383 tests passed, four skipped; build passed; lint had zero errors and 47 existing warnings. Final collection/onboarding wording checks: 13 passed; final build passed. All 116 live API paths matched the frontend contract.
- AWB website: build and five billing-view tests passed; product-surface checks passed. An older static catalog test still expects the retired data-tool-account-access attribute and fails that obsolete assertion; the live catalog and Pages deployment were verified.

## Explicit limits

Pricing is ceil(provider list cost × 400) cents: 75% margin on those modeled provider costs, rounded once per analysis. Payment fees, hosting/storage and support are excluded. X invoice discounts/daily deduplication are not allocated to individual customers. Paid provider coverage currently includes stored/supplied evidence and configured X accounts; other providers fail closed in paid mode until metered.

Production AWB remains metering-only: this release does not enable real checkout or charge real money. The funded test environment proved the complete shared-wallet path. Existing live payment prerequisites remain unfinished: published credit terms, merchant tax configuration, matching live namespace/credentials/webhook, and an authorized real purchase check. This is distinct from the approved CrowdListen rate and shipped application code.

Broad synthesis runs can be partial when a proposed quotation, source ID or duplicate evidence edge fails validation. Valid findings are retained; rejected findings are not published. AWB refuses to present a partial upstream analysis as complete, while consumed provider usage remains visible. Focused complete runs above are not a guarantee that every question produces a complete finding set. One earlier test-only provider-routing failure remains a $2 reconciliation hold with unknown usage, not a fabricated zero-cost settlement; it is isolated from production wallets.

Agent selection saves a preferred client and supplies connection instructions; it does not install or authenticate Cursor/Claude Code/Codex automatically. This release exercised Codex calling the HTTP MCP, not each desktop client. Skills run on demand; selection does not create a recurring schedule. Slack/support/analytics examples require authorized source imports or actual configured access.

Private fixture state and test receipts are retained locally for audit/replay outside Git. The disposable CrowdListen account has a temporary test entitlement; its entities do not enable scheduled research. Unrelated .serena edits were left untouched.
