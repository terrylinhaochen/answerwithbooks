# Private books API

Create a personal API key at https://answerwithbooks.com/api-keys/. Keep it in your secret manager or agent environment. Revoking it removes access. Browser login and revocable `awb_cli_` sessions also work; customer-agent local generation needs neither.

POST JSON to `https://yozeqanibszoxnowmvsm.supabase.co/functions/v1/book-process` with `Authorization: Bearer YOUR_API_KEY`. These keys use the same account ownership checks as CLI sessions. CrowdListen workspace identities cannot read personal books.

Free actions: `list`, `lookup` (source `sha`), `status` (`id`), `export` (`id`), `usage` (`id`), and `billing-history`. Existing book access does not require a credit balance. Public shelf digests remain available without an account.

To process a new source, prefer the CLI `upload` command, which validates and extracts supported files, uploads the original plus extracted text, and finalizes the source. A new source waits for payment acceptance before hosted generation. A hash match reuses your existing result. A new source or revision is quoted separately; private results never become public through this cache.

1. `{ "action": "quote", "id": "BOOK_ID" }` returns a quote ID, exact price in USD cents, expiration, and scope.
2. Show that quote to the user and wait for acceptance.
3. `{ "action": "accept-price", "id": "BOOK_ID", "quoteId": "QUOTE_ID", "acceptedPriceCents": 100 }` starts only if the exact current quote is valid and the shared wallet has enough available funds. The amount above is an example, not a tariff.
4. Check `status`. Funds are reserved at acceptance and charged once when both the readable book and skill are ready. Failed conversions release the reservation. `cancel` releases an unfinished reservation once its current worker step has finished.

An optional cover failure does not prevent text delivery. Pausing retains the reservation; cancelling releases it. Reading, exporting and installing the completed result never charge for a second conversion. Repeated acceptance and retries do not duplicate an already settled charge. Add funds separately at https://answerwithbooks.com/billing/; adding funds does not start a conversion.

For private retrieval, POST `{ "action": "search", "question": "YOUR TASK" }` to the sibling `/book-library` function using the same bearer key. Your current agent applies retrieved methods and checks the citations; this endpoint is retrieval, not autonomous skill execution. Search is rate limited but does not debit book-conversion credits.

A missing tariff returns `BOOK_PRICE_REQUIRED` with an explanation that hosted pricing is not enabled. The source remains saved. No retail tariff is activated merely by deploying the code.
