# Personal book billing acceptance — October 9, 2026

## Verified

- A fresh synthetic confirmed account on production returned `metering-only`, `canTopUp:false`; personal book charging was not enabled. The account was deleted afterward.
- The existing isolated Stripe test project now serves the full updated backend with `personalBilling.mode:test`, `pricingModel:quoted-book-conversion`. Production continues to serve its existing metering-only personal account configuration and native workspace prepaid billing.
- Browser → authenticated test account API → real Stripe test Checkout opens for a $1 test deposit. The merchant is Crowdlisten and Checkout visibly identifies the sandbox. No real payment was attempted.
- A real payment completion is **not verified**: Stripe's page presented a verification challenge and the automated run did not reach the card fields. No wallet credit or remote webhook completion is claimed. The temporary auth accounts were deleted; incomplete Stripe test purchase records are retained as test history.
- The local integration runs the actual hosted HTTP server, all Skills API PostgreSQL migrations, and the identical book billing migration. It exercises checkout idempotency, actual Stripe signature verification, unpaid and repeated webhook events, wallet visibility, owner/quote/amount checks, service-role execution, concurrent duplicate acceptance, delivery enforcement, single settlement, and failure release. Stripe network calls are fixtures here.
- A fresh browser build verifies own-agent/hosted choice, actual source-upload handoff, insufficient balance, checkout return navigation, explicit price acceptance once, cancel/release display, account links, and mobile overflow. Its book/auth/API responses are fixtures.
- Backend regression: all 376 tests pass in the final full run; build passes.
- Processing regression: all 62 pipeline tests and 11 billing/account/view tests pass.
- CLI regression: 42 passing tests, including staged and resumed paid uploads waiting for explicit price acceptance.
- Cover requests use the OpenAI credential even when text generation uses Fireworks; the processing handler test checks the two different Authorization headers.

## Remaining release gates

1. Customer retail pricing approval. The pending selection has not been answered; no tariff has been enabled.
2. Complete a Stripe **test** payment and observe its signed remote webhook, durable wallet credit, receipt, and fresh browser readback. `scripts/test-personal-checkout-live.mjs` is opt-in; temporary session data arrives over stdin and is never saved.
3. Coordinate deployment of the book migration, matching Edge Functions, website, personal payment adapter, and CLI 0.5.0 release. This work is still in draft PRs. The new migration has not been applied to production.
4. Verify a real small hosted conversion against the deployed tariff: quote → accepted hold → book and skill delivery → one charge; verify failure/cancel release too. Local SQL tests do not replace this check.

Flash's previously recorded factual failures remain separate. Do not change the explicit production GPT-5.4 mini configuration as a side effect of releasing billing.
