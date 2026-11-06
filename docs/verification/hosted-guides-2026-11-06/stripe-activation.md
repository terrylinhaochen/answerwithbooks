# Stripe activation — 2026-11-06

## Completed

Continued from chat `01a1ae2f-7ea0-7511-91d9-5a95d6c500ed` in the canonical workspace. User explicitly approved the restricted key, Supabase storage, and dedicated subscription webhook. Browser setup and authenticated backend verification succeeded.

| Object | Live value |
| --- | --- |
| Stripe account | Crowdlisten `acct_1RHSafA3c3cnLmTh` |
| Product | `prod_Va2XMpiBxFLjvk`, Answer With Books |
| Price | `price_1UYsScA3c3cnLmThGQDAJOZY`, USD $24/month |
| Allowance | Up to 30 guides per month |
| Dedicated portal | `bpc_1UYsZjA3c3cnLmThThidciEx` |
| Dedicated webhook | `we_1UYsckA3c3cnLmThDCNy9o8K` |
| Supabase project | `yozeqanibszoxnowmvsm` |

All four required Edge Function secrets are installed and their names read back: `AWB_STRIPE_SECRET_KEY`, `AWB_STRIPE_PRICE_ID`, `AWB_STRIPE_PORTAL_CONFIGURATION_ID`, `AWB_STRIPE_WEBHOOK_SECRET`. No secret values are stored in this evidence directory. Temporary local credential and session files were removed after verification.

## Restricted key

Name: Answer With Books subscription backend. Customers, Checkout Sessions, and Customer Portal have Write access. Products, Prices, Invoices, and Subscriptions have Read access. All other resource and Connect permissions remain None. These permissions cover the Crowdlisten account; they are not scoped to one product. Runtime webhook management permission was not granted.

## Portal and webhook

The dedicated non-default portal has the headline “Manage your Answer With Books plan”, invoice history and payment-method updates enabled, and cancellation at period end with no proration. Subscription changes and customer detail changes are disabled. Return URL is `https://answerwithbooks.com/billing/`. Existing default portal `bpc_1UMZAAA3c3cnLmThnVzhVhDP` was preserved.

The active webhook destination is `https://yozeqanibszoxnowmvsm.supabase.co/functions/v1/reader-subscription/webhook`. It receives snapshot payloads for the account using API version `2025-03-31.basil`, the current account version available in Stripe's setup UI. The handler reads the customer ID and reconciles canonical provider state through requests pinned to `2024-06-20`.

Exactly seven event types were selected and read back:

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_action_required
- invoice.payment_failed

Existing destinations `we_1UIlbrA3c3cnLmThAhPvyN40` and `we_1RJS1nA3c3cnLmThTjmWF1Pn` were preserved.

## Verification and boundaries

- Deployed `reader-subscription` requires an explicit portal configuration and uses it to create sessions. Existing gateway setting is preserved; handler authentication and webhook signature validation remain in place.
- Local HTTP regression, Deno type check, existing signature/exact-price tests, and diff check passed in the preceding setup turn. Regression command is in both relevant CI workflows. CI itself has not run.
- Fresh authenticated hosted status after secret installation: used 0, limit 30, priceCents 2400, active false, status none, checkoutAvailable true.
- Authenticated checkout and portal actions both returned valid Stripe session URLs. Browser checkout visibly showed Answer With Books, $24/month, and “Get up to 30 guides per month.” Stripe API readback confirmed USD 2400, subscription mode, open, unpaid, and no subscription created.
- The portal visibly showed its dedicated headline, payment-method section, and empty invoice history. Cancellation is enabled in configuration; an actual cancellation control could not be exercised without an active subscription.
- A locally constructed, correctly signed invoice.paid probe for an unknown customer returned HTTP 200 received=true from the deployed webhook. An invalid signature returned HTTP 400. This verifies deployed signature handling and unknown-customer routing, not an actual Stripe delivery or paid entitlement reconciliation.
- No payment was submitted, card added, or paid subscription created. Paid activation, renewal, cancellation, actual provider event delivery, and a complete public multi-book guide still need separate acceptance evidence.
- Frontend and CLI publishing from the earlier chat remain unfinished; no frontend release occurred in this billing setup.

Evidence: `stripe-checkout-preview.png`, `stripe-portal-preview.png`, `stripe-webhook-active.png`, `stripe-config-verification.json`, and `stripe-webhook-probe.json`. Earlier preparation screenshots are `stripe-plan.png` and `stripe-key-prepared.png`.
