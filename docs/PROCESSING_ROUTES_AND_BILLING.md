# Book processing routes and billing

## Customer pricing

Hosted conversion uses metered input, cached-input and output token rates shown to the customer before approval. Customer surfaces present the final rates and actual charge, not internal provider costs, markup or margin targets. The private billing backend repository owns internal pricing policy documentation.

The customer chooses and explicitly authorizes a maximum additional spending amount. It is a cap, not a fixed book price or an estimate that the book will finish within that amount. The cap is reserved from the existing USD wallet. Deposits are 1:1 USD, not historical discounted CrowdListen credit packs. The earlier character-based tariff is superseded and is never used by the final metered function.

Existing public content and the owner's completed books remain free to read, retrieve, download and install. Own-agent processing is free from AWB; the customer's existing agent can have its own charges. Hosted generation includes text, source review, repairs and cover tokens. Consumed usage is charged even on failure or cancellation. Unused reserved funds are released to the wallet. Retrieval, indexing and storage are not separately metered here. Private source reuse is owner-scoped, not cross-account publication or deduplication.

## Generation routes

Intake accepts customer uploads or authorized downloaded copies. Hosted extraction stops in staging before paid generation. The customer reviews rates and a cap, adds wallet funds if needed, returns to the same book, and separately authorizes work. A checkout redirect or new balance never starts paid generation by itself.

Own-agent processing answers resumable JSON generation and review requests using the customer's current agent. It needs no AWB login or provider key and uploads no source to AWB. Both routes use the shared text extraction/artifact compiler. Core's `build-processing-runtime.mjs` records dependency hashes. Local output includes the book summary and skill bundle; the agent can install the skill locally. Hosted skills can also be retrieved on demand instead of installing every book.

## Financial boundary

The web-owned migrations are `20261008220000_paid_book_conversion.sql` followed by `20261009182003_metered_book_billing.sql`. The first is an unlaunched schema foundation; the second replaces its flat-price logic. Neither inserts an enabled retail tariff, funds an account, or charges a card.

Quotes bind the owner, source, options, policy version, model rates and cap, and expire in 24 hours. Accepted rate snapshots are retained even if the rate catalog changes. Models outside that snapshot cannot spend. Legacy fixed-price consent is rejected at the HTTP boundary. Queue, retry and worker claims require an active reservation.

Before each provider call, PostgreSQL persists an operation and atomically checks its worst-case input/output cost against the remaining cap. Parallel calls share the same lock and budget. Full request bytes conservatively bound text input, including the output schema; configured output limits bound output. Input/image types outside the supported tariff fail closed. Receipts store actual usage and pinned rates; financial persistence errors stop progress instead of silently retrying paid work. Diagnostic usage logs are separate from the charging ledger.

`awb_skills.call_ledger` is the shared USD wallet. Book-row then wallet lock ordering serializes reservations and settlement with other products. Settlement charges cumulative actual cost minus prior charges, using an idempotent quote event key. Retrying a settled failure requires a new explicitly approved additional cap. A failed cover can receive a new cap without regenerating the delivered text. Refunds, disputes and insufficient wallet cover stop new provider spend and hold settlement for review.

A readable book and skill can appear while the cover runs. Settlement waits until the cover finishes, fails or is skipped. Pausing preserves the hold; cancellation settles already consumed usage. Missing, inconsistent or lost receipts enter reconciliation and retain the hold, never a guessed zero-cost settlement. A worker crash with an unresolved operation prevents automatic reissue. Active or unreconciled work cannot be deleted. Financial records outlive source deletion.

## Operator recovery

Only server operator authorization permits `reconcile-usage` and `settle-usage`; user sessions and book API keys cannot invoke them. Do not put operator credentials in browser code, command history or reports.

1. Inspect the operation, provider receipt and active worker leases. Wait for active work to finish. Do not retry a provider call to obtain its old receipt.
2. Send `reconcile-usage` to `book-process` with `id`, `operationId` and `receipt`: integer `inputTokens`, `cachedInputTokens`, `outputTokens`, plus `providerEvidence` identifying the verified provider receipt. Images additionally use `inputImageTokens: 0`. Zero counts require provider evidence of no charge, not a timeout assumption. The endpoint records a server-derived operator identity hash and retains the previous metric in an audit table.
3. Resolve every incomplete operation. If the book is paused, the customer may resume within the existing cap or cancel. If it is terminal, reconciliation settles automatically where possible.
4. For a payment-review hold, resolve the payment issue through the existing billing workflow first. `settle-usage` then performs terminal/lease checks and settlement under one database row lock. Never clear a dispute merely to force a book charge.

The service role owns these RPCs and financial tables; anonymous and authenticated database clients have no direct access. User usage responses expose token counts, not private operator evidence.

## Verification and release

See [October 9 acceptance](verification/billing-2026-10-09/README.md). The real Stripe sandbox payment, webhook and $1 wallet credit passed on a temporary verification account. Production worker acceptance also completed a public-domain excerpt with real provider calls and an isolated QA wallet; authenticated browser, API key and published CLI checks passed. No live card transaction was made.

Production personal billing is live as of October 9, 2026. The website, matched functions, adapter and CLI 0.5.0 are deployed, with explicit GPT-5.4 mini generation and review settings preserved. Both book migration sources were applied in one atomic transaction, recorded remotely as `20261009190443_book_billing_atomic_release`; do not reapply the two source migrations individually to that database. The legacy minimum/character columns remain for migration compatibility and have no pricing effect.

The Flash candidate has recorded source-quality failures; do not silently replace production Mini while releasing billing. See `verification/flash-quality-2026-10-09/README.md`. Earlier model latency samples excluded extraction, queues, covers, indexing and installation and do not establish full-book performance.
