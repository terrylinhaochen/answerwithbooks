# Thirty-guide plan and compact installation

- Local preview Skills installer hides the prompt text while retaining the copy button, Markdown link, and accessible clipboard fallback.
- Local billing card: $24/month, Get up to 30 guides per month. Removed repeated feature prose and legacy billing panel. Guest state hides unavailable checkout; returning checkout polls briefly for verified entitlement.
- Hosted migration reader_plan_thirty_guides applied: reader_plan reports 30 and confirm_reader_guide enforces 30 under a subscriber row lock. Existing usage and $24 price are preserved.
- Deployed reading-guides function uses updated 30-guide messages. Skill and documentation sources updated locally.
- Real local PostgreSQL tests pass for 34 simultaneous confirmations capped at 30, repeat confirmation, failed-guide release, completed-guide deletion accounting, new periods, cancellation, owner isolation, webhook deduplication and revision checks.
- Stripe signature and exact-price tests pass. UI fixtures pass for guest/subscriber usage. Browser install tests pass on desktop/mobile, including correct copied prompt and manual-copy fallback; default prompt text is hidden.
- Live authenticated status: priceCents 2400, limit 30, status none, active false, checkoutAvailable false. Live checkout returns Subscription checkout is not available yet.
- Hosted project has no AWB_STRIPE_SECRET_KEY, AWB_STRIPE_PRICE_ID or AWB_STRIPE_WEBHOOK_SECRET. No payment was submitted and no Stripe objects were created.
- Access checks: computer-use initialization fails on the workspace symlink writable root. Accessible Chrome opens Stripe login. Existing Vercel auth file has no credentials; its CLI login attempt was canceled. The approved CrowdListen account still needs an authenticated connection before dedicated price/webhook/portal setup and end-to-end payment verification.

## Resumed in the canonical workspace

The access/configuration observations above describe the earlier handoff state and are superseded by [Stripe activation verification](stripe-activation.md). The approved restricted key and all four Stripe settings are installed, a dedicated cancellation-enabled portal and seven-event webhook are active, and authenticated checkout/portal previews work. Live checkout visibly confirms $24/month and up to 30 guides. No payment was submitted. Actual Stripe delivery and paid entitlement transitions remain untested; frontend and CLI publication remain unfinished.
