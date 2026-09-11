# Subscription to account activation

The homepage, newsletter page, and Subscribe popup use one shared component and client controller.

1. Enter an email and explicitly subscribe. The existing newsletter endpoint records newsletter consent.
2. In the same interface, optionally choose **Activate my account**. Supabase Auth sends a magic link to the same normalized email with `shouldCreateUser: true`, handling both new and existing accounts. No password or second email entry is required.
3. The link returns to `/auth/confirm/`, validates the session with Supabase Auth, removes auth tokens from the URL, and offers **Open my shelf**.

Skipping activation does not cancel a newsletter opt-in. Activation failures do not rerun newsletter submission. Account creation is never triggered simply by subscribing, opening the modal, or refreshing. Newsletter opt-out status remains managed separately; auth success must not be used to overwrite newsletter consent or mark an address as a verified newsletter subscriber.

UI continuity uses `awb:signup-flow:v1` in this tab's session storage with a 30-minute TTL. It holds email, UI step, and resend cooldown only. It is not authorization or proof of subscription. Starting over or completing account activation clears it. No email is placed in a page URL. Resending is explicit and has a 60-second client cooldown in addition to Supabase's own rate limits.

Returning users use **Log in → Send sign-in link** without another newsletter submission. That path sets `shouldCreateUser: false`, keeps account existence private, and retains password login as a secondary compatibility option for existing accounts. Expired links lead there, not back through newsletter consent. The legacy password signup route remains available for existing account-only onboarding/integration links.

## Hosting prerequisites

- Email Auth and signup must be enabled. The live public Auth settings were read during implementation: both enabled; email auto-confirm disabled.
- Allow `https://answerwithbooks.com/auth/confirm/` (and the `www` equivalent if used) in Supabase Auth redirect URLs. For local testing also allow `http://127.0.0.1:4321/auth/confirm/` and `http://localhost:4321/auth/confirm/`.
- Auth email templates must contain `{{ .ConfirmationURL }}` for magic links. If customized to send only `{{ .Token }}`, this link-based UI cannot consume that code.
- Configure custom SMTP or an email Auth hook for delivery beyond authorized project team addresses. Supabase's default sender is not a production newsletter or general-public mail delivery setup.
- No SMTP credentials, Auth dashboard settings, existing users, or subscriber records are modified by these frontend changes. No newsletter delivery or Substack synchronization is added.

## Verification boundaries

`scripts/test-subscribe-account-flow.mjs` exercises the real local UI against mocked newsletter and Auth endpoints: one email, optional activation, new/returning request contract, shared modal state, reload, skip, rate limit/retry, URL stripping, successful/expired callback, and session-state expiry.

Live delivery remains a separate acceptance check: approve one recipient address, request one link through the rendered UI, open the received link, and confirm the signed-in shelf. A mocked callback or HTTP acceptance is not proof of inbox delivery.

References: [Supabase magic links](https://supabase.com/docs/guides/auth/auth-email-passwordless), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
