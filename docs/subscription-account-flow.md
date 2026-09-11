# Subscription to account activation

The homepage, newsletter page, and Subscribe popup use one shared component and client controller.

1. Enter an email and choose **Subscribe**. The visible consent covers both an AWB account and the newsletter.
2. The existing newsletter endpoint records newsletter consent; the client then automatically requests a Supabase email link with `shouldCreateUser: true` for the same email. There is no separate activation or skip button.
3. The email link returns to `/auth/confirm/`, verifies the user with Auth, strips credentials from the URL, and redirects straight to `/profile/`. There is no confirmation-success page to click through.

The two service calls are not an atomic transaction. If Auth email delivery fails, newsletter consent may already be saved. The UI states that clearly and retries only the Auth email request, with a 60-second cooldown. Refreshing never sends another email automatically. Existing newsletter opt-outs are preserved; verification is not used to overwrite consent. Returning-user login does not submit newsletter consent.

UI continuity uses `awb:signup-flow:v2` in this tab for 30 minutes. Older optional-activation state is not reused as consent for the combined flow. It is UI state, never proof of identity. Successful verification or starting over clears it. A legacy password signup remains for account-only integration/onboarding links.

## Hosting prerequisites

- Email Auth and signup must be enabled. The live public Auth settings were read during implementation: both enabled; email auto-confirm disabled.
- Allow `https://answerwithbooks.com/auth/confirm/` (and the `www` equivalent if used) in Supabase Auth redirect URLs. For local testing also allow `http://127.0.0.1:4321/auth/confirm/` and `http://localhost:4321/auth/confirm/`.
- Auth email templates must contain `{{ .ConfirmationURL }}` for magic links. If customized to send only `{{ .Token }}`, this link-based UI cannot consume that code.
- Configure custom SMTP or an email Auth hook for delivery beyond authorized project team addresses. Supabase's default sender is not a production newsletter or general-public mail delivery setup.
- No SMTP credentials, Auth dashboard settings, existing users, or subscriber records are modified by these frontend changes. No newsletter delivery or Substack synchronization is added.

## Verification boundaries

`scripts/test-subscribe-account-flow.mjs` exercises the real local UI against mocked newsletter and Auth endpoints: one-click combined signup, shared modal state, refresh without email resending, partial-failure recovery, direct verified redirect to Profile, and expired-link handling.

Live delivery remains a separate acceptance check: approve one recipient address, request one link through the rendered UI, open the received link, and confirm the signed-in shelf. A mocked callback or HTTP acceptance is not proof of inbox delivery.

References: [Supabase magic links](https://supabase.com/docs/guides/auth/auth-email-passwordless), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
