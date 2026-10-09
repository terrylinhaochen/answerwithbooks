# Implementation

1. Apply additive setup migrations, preserving existing records and old routes.
2. Persist metadata-only provider receipts before and after each supported API call. Prefer the verified OpenAI synthesis provider.
3. Use an explicit owner-approved workspace grant and an encrypted AWB connection. A callback credential can only reserve/settle its linked wallet and workspace. Keep test and production bindings separate.
4. Reserve a per-analysis ceiling across the shared wallet; meter OpenAI, Gemini and X responses; settle 4x known costs once. Retain uncertain charges for reconciliation and retry lost callbacks from a durable outbox.
5. Present shared usage and connection settings, clearer collection choices and CrowdListen in AWB's catalog.
6. Run database-backed regression tests, build both frontends and API, apply remaining additive migrations, stage and cut over backend before frontend.
7. Run isolated authenticated hosted and agent-path checks; record actual deployment evidence.

## Price policy

Hosted processing uses metered token and API usage at the customer rates approved before work starts. Internal rate derivation is documented in the private billing backend repository. Consumed usage can be charged on failure; unused reserved funds are released. Customer-agent local reasoning is billed separately by the agent provider.

Official rate sources checked 2026-09-17: https://developers.openai.com/api/docs/models/gpt-5.4-mini ; https://developers.openai.com/api/docs/models/text-embedding-3-small ; https://ai.google.dev/gemini-api/docs/pricing ; https://docs.x.com/x-api/getting-started/pricing . X owned-read discounts and provider-wide daily deduplication are not allocated per customer. Unpriced providers remain preview-only; paid collection currently covers stored/supplied originals and configured X accounts.

Production AWB is currently metering-only. Existing CrowdListen subscriptions are not altered. Dedicated payment configuration is distinct from deploying this integration.
