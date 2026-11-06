# Cost snapshot — November 6, 2026

Live Supabase usage receipts for the three supplied books, evaluated at OpenAI standard rates (https://developers.openai.com/api/docs/pricing). Estimates of recorded provider usage, not invoice reconciliation. USD; excludes infrastructure, taxes, unreported calls, and costs outside this pipeline.

| Book | Text calls | Input tokens | Cached tokens (within input) | Output tokens | Text USD | Cover USD | Total USD |
|---|---:|---:|---:|---:|---:|---:|---:|
| Invention: A Life | 86 | 616152 | 30208 | 55788 | 0.69276960 | 0.424354 | 1.11712360 |
| Open | 126 | 905105 | 123264 | 86496 | 0.98485755 | 0.213169 | 1.19802655 |
| Shoe Dog | 118 | 893023 | 65664 | 82048 | 0.99466005 | 0.211674 | 1.20633405 |

Total: $3.52148420. Dyson includes two cover generations; the others include one each. All listed receipts report complete. Text includes generation and review; reasoning tokens are already included in output, not added a second time.

Production BOOK_PROCESSING_MODEL and BOOK_REVIEW_MODEL were verified as gpt-5.4-mini by comparing the Supabase secret digests against the model names; no API secret values were exposed. Generation effort is none; review effort is low. Actual book receipts identify gpt-5.4-mini-2026-03-17. Images use OpenAI gpt-image-1.5, consistent with recorded book and guide cover receipts. Text goes directly to OpenAI chat/completions; images go to OpenAI images/generations. The Fireworks code default is overridden in production.

Formula: ((input - cached) × $0.75 + cached × $0.075 + output × $4.50) / 1,000,000. Image text input $5/M and image output $32/M; current covers are text-prompted high-quality images.

## Latest guide

Guide f4d44ec6-118a-4ec7-8b1b-17824b2e243e has 267 cover input tokens and 6591 image output tokens: $0.212247. Guide text usage is NOT persisted: reading-guides constructs createBookModelClient without onUsage or metering callbacks, and ready jobs discard intermediate progress. There is no measured total for this guide. Do not label a hypothetical text-token budget as observed spend. No paid guide generation was run for this investigation.

## Shared infrastructure

Live AWS instance i-019e8912ea055c71b in us-east-2 is running, type m7i.large, with 30 GiB gp3 storage. AWS Pricing API returns Linux shared on-demand compute $0.1008/hour, equivalent to $73.584 at 730 hours/month. This is a list-price run rate, not an allocated invoice total. EBS, public IPv4/network, Supabase, and other shared services are additional. Account-level Cost Explorer figures were not attributed to this application because they are not resource-isolated.

Import cost is incurred once for a shared source; subsequent guides reuse its maps and select original spans. Already completed guides and Markdown reads require no fresh model inference. At $24 for 30 guides, revenue is $0.80 per guide at full paid allowance; the latest cover alone is about 26.5% of that before text and overhead.
