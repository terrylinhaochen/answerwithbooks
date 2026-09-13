# Skills implementation tracker

Started 2026-09-12. Implements `SKILLS_PRODUCT_DESIGN.md` without replacing Books, Guides, existing authentication, or provider integrations.

## Milestones

- [x] 1. Versioned task catalog; CrowdListen entry; search, job-function filters and pagination; inline tool dependencies; consistent detail cards.
- [x] 2. Connect AWB accounts to the execution service; durable queue and deployment configuration; scoped agent credentials and connection checks.
- [ ] 3. CrowdListen adapter with bounded feedback inputs, source-preserving results, and authorization tests.
- [ ] 4. Billing page, wallet ledger, reservations/settlements, payment integration in test mode, and failure/idempotency tests.
- [ ] 5. Browser and API verification; deployment readiness report with explicit remaining configuration.

## Release constraints

- Paid execution stays off until Stripe test configuration, prices, and full-path payment verification are complete.
- Do not expose provider credentials or reuse one customer's CrowdListen workspace for another.
- A listed skill is not proof of hosted access. Preview/unavailable states remain accurate.
- Keep application mutations in the AWB web and Capability Lab repositories. Changes to the CrowdListen service itself require an adapter contract, not an unrelated rewrite.
- Any public runtime requires an authorized deployment target and persistent storage. Do not expose the local Mac through an unsolicited tunnel.

## Validation log

Initial baseline: public catalog had four cards; Capability Lab had three research IDs, local SQLite, and metering-only usage. Local research port 4318 was stopped.

### 2026-09-13 shared merchant billing

- User approved AWB as a product of the existing Crowdlisten merchant, not a separate Stripe account. Existing Crowdlisten products/subscriptions/payout settings have not been changed.
- Backend supports disabled/test/live billing, expected-account verification, product-tagged paid events, durable idempotent checkout intents, owner-scoped credits, reservation/settlement, cumulative refunds, and dispute review. Test/live databases cannot be interchanged.
- Billing page now consumes server-configured credit denominations and an approved policy URL/version. Consent is unchecked by default, uncertain requests reuse a checkout key, and returning from Stripe does not credit funds. Live/test/metering states remain distinct.
- Downloadable AWB instructions describe current-price consent and recovery without exposing provider credentials. CrowdListen's bounded feedback input contract is included, with private-preview authorization explicit.
- Backend: 37 local tests pass; TypeScript build passes. Includes mocked Stripe/account/skill execution over real HTTP, actual SDK signature verification, duplicate fulfillment, database reopen durability, refunds, failure release, ledger isolation, and owner-scoped results. This is not Stripe-hosted sandbox or live-payment proof.
- Web: 107-page production build passes. In-app browser verified signed-out Billing rendering, history tabs, and homepage navigation. Signed-in checkout remains unverified in the browser because no hosted API is configured.
- Focused account-client and catalog checks pass (6 tests/check groups). The older broad Skills browser script was attempted against stopped port 4321 and did not run; it also retains pre-redesign assumptions. Do not count that script as a passing UI regression suite.
- Remaining launch gates: authorized HTTPS API host with durable storage/backups; approved live prices and credit/refund policy; reviewed tax treatment; server-only Stripe credentials and dedicated AWB webhook; connected sandbox rehearsal; explicit live enablement. No live payment, production deployment, commit, or push was performed in this update.

See Capability Lab `docs/PRODUCTION_BILLING.md` for the deployment/acceptance runbook. The earlier design document records the original proposal and baseline, not current deployment status.

### 2026-09-13 hosted private preview

- Deployed an isolated `crowdlisten-skills-api` project in the existing Pro team, without modifying Crowdlisten's live app. API origin: `https://crowdlisten-skills-api.vercel.app`.
- Added private, RLS-enabled Supabase job/key tables and a backend-only invoker RPC. Browser roles cannot access them. Raw platform keys are never stored.
- Queued requests survive function shutdown. Transactional claims enforce two global workers and fence stale results. An authenticated one-minute cron recovers queued jobs and fails expired executions without replaying uncertain upstream calls.
- Real hosted GitHub run `7823a625-8f50-45f5-9b20-288001b65726` completed with 3 leads and 86 retrieved source records. Duplicate request reused its ID; changed-input replay returned 409. No customer charge was made.
- In-app browser verified an existing AWB session against the hosted API: create masked key, check connection (3 of 4 managed capabilities configured), revoke key, and open signed-in Billing. The verification key was revoked.
- Three research providers are configured; only GitHub execution was exercised on this deployment. CrowdListen remains unavailable until an authorized workspace binding is configured. This is not evidence that every skill is production-ready.
- Existing Crowdlisten Stripe account `acct_1RHSafA3c3cnLmTh` was checked read-only: live credentials match, charges/payouts enabled, details submitted. Existing subscriptions, products and webhooks remain unchanged.
- 40 backend tests pass, including actual PostgreSQL-compatible migration/permission tests via PGlite, hosted HTTP ownership/idempotency tests, lease recovery and fail-closed storage errors. Website production build passes (107 pages).
- Live billing is NOT enabled: the tested SQLite payment implementation still needs its financial transactions ported into the hosted database, a dedicated AWB webhook, approved prices/top-ups/credit policy/tax treatment, and a hosted payment rehearsal. Do not mistake the hosted usage page or merchant verification for completed payment integration.
