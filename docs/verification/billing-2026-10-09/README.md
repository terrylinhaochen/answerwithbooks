# Personal book billing acceptance — October 9, 2026

## Verified

- **Real Stripe test payment completed by the user.** A synthetic confirmed account used the isolated `https://crowdlisten-skills-calls-test.vercel.app` adapter. Checkout accepted a $1 test deposit. Fresh authenticated API readback returned HTTP 200, `mode:test`, `balanceCents:100`, `heldCents:0`, `availableCents:100`, `paymentReview:false`, and one receipt. Only signed webhook evidence can credit this wallet. No real money was charged. The temporary auth account was deleted after verification; test purchase records remain.
- The sandbox runs the complete payment backend with personal metered-book billing, its existing separate test namespace and merchant, and no cron jobs. Production personal billing remains metering-only; native workspace prepaid billing is independent.
- Local payment integration uses the actual HTTP server, real Stripe signature verification, all Skills API PostgreSQL migrations, and exact copies of both web-owned book billing migrations under service-role privileges. Stripe network transport is mocked. It covers terms, session-only purchase authority, owner isolation, duplicate checkout/webhook/acceptance/completion, missing funds, metered settlement and release of unused funds.
- The SQL suite passes 18 tests: 5 foundation checks and 13 metered checks. It verifies cached/input/output rates, rounding once, concurrent cap admission, unpriced models, quote-time rate snapshots, duplicate/conflicting receipts, unknown-usage holds, audited reconciliation, cross-owner denial, new caps after failure, covers, crashed leases, refunds/disputes atomic operator settlement and safe deletion after reconciliation and a new cap for cover-only retries.
- Provider-boundary tests verify a durable operation exists before a paid call, exhausted budgets make zero provider calls, financial receipt errors stop work, and old fixed-price approvals and customer reconciliation attempts are rejected. Deno type checks pass.
- The fresh browser test verifies desktop/mobile route choices, source-upload handoff, explicit metered cap, insufficient balance, billing/return navigation, a single explicit acceptance and account links. Its auth/book/API responses are fixtures; the post-payment wallet check above used the real API, not this browser fixture.
- Full backend regression: 382 passing tests; build passes. The final SQL fixture revision also passes the focused personal-payment integration.
- Pipeline: 64 passing tests. CLI: 43 passing tests. Website: fresh build of 117 pages passes.
- No paid model calls were made during these billing checks. Earlier provider-quality and full-book runs do not validate this new charging flow.

## Production release gates

The 4× token policy is approved and implemented; no further flat-price selection is needed. Production personal charging is not enabled and the web-owned billing migrations have not been applied.

1. Deploy both book migrations and matched `book-process`, `book-native`, and `book-library` functions together. Preserve explicit production GPT-5.4 mini model settings.
2. Enable the versioned `metered-4x` tariff and personal adapter with existing approved merchant, namespace, origin and signing-secret configuration. Live startup fails closed without the new tariff.
3. Publish the matched CLI 0.5.0 and ship website references/account UI.
4. Verify an actual small hosted book: accepted cap → provider receipts → book and skill → one actual-usage charge → unused funds released, then failure/cancel and fresh account readback. Local SQL/provider fixtures and a successful Stripe deposit do not replace this complete deployed flow.

Flash's factual failures remain a separate release gate for changing models. Do not treat billing tests as a source-quality pass.
