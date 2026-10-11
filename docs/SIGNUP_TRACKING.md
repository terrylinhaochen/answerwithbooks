# Account signup tracking

Account creation is recorded in Supabase Auth. It is separate from newsletter subscription and from optional public-page analytics. No email address, account ID, auth token, or private book information is sent to Google Analytics by this feature.

## View signups

Use the project’s **Authentication → Users** screen for individual accounts. Operators with existing Supabase management access can run:

```sh
npm run report:signups -- --days 30
npm run report:signups -- --days 7 --json
```

The report uses read-only queries and prints aggregate counts, never email addresses or tokens. Operator authentication comes from the existing deployment helper; do not put a service-role key in the website’s public environment variables. Do not publish report output in this repository, build logs, or the public docs.

The report shows daily account-creation cohorts, confirmations within those cohorts, signups explicitly attributed to Answer with Books, current agent connections, and accounts with ready books. It excludes anonymous accounts and known test fixtures. New test accounts should carry the operator-owned `app_metadata.awb_test_account=true`; reserved test domains and the legacy `+awb-test-` inbox tag are also excluded.

New website and tool signup requests set `user_metadata.awb_signup` with a fixed product name, schema version, and allowlisted entrypoint. Legacy accounts stay **unattributed**: this auth project has served more than one application. Do not present all historical project accounts as Answer with Books customers. User metadata is editable attribution, not an authorization or billing signal.

Counts cover current accounts, not a permanent event ledger. Deleting an account removes it from this report. “Confirmed by now” describes a creation-date cohort, not confirmations that occurred on that date. “Currently connected” counts unexpired agent sessions, not all-time activations. No automatic signup notification or scheduled email is enabled.

## Reproduce acceptance

```sh
# Public settings only. No email, account, payment, or model call.
npm run test:auth
node --test scripts/test-signup-metadata.mjs
node scripts/test-tool-auth.mjs

# Disposable production accounts. Requires operator access and installed core sibling.
# Generated links test actual confirmation, recovery, CLI pairing and billing UI.
# They do not test mailbox delivery and do not make a payment or run a model.
AWB_LAUNCH_AUTH_TEST=1 node scripts/test-launch-auth-live.mjs
```

For actual mailbox delivery, use the separate opt-in email check only with an authorized inbox. It creates a random plus-tag fixture and keeps its password in a temporary file with owner-only permissions. It never changes the inbox owner's existing account. A successful API request means **accepted**, not delivered; the recipient must confirm arrival. Do not paste email action links into chat or logs.

```sh
AWB_EMAIL_TEST_STATE=/private/tmp/awb-email-test.json \
AWB_TEST_EMAIL='your-authorized-inbox@example.com' \
  node scripts/test-account-email-live.mjs begin
# Open the confirmation email, then:
node scripts/test-account-email-live.mjs status
node scripts/test-account-email-live.mjs recovery
# Check the second message in the inbox, then always clean up:
node scripts/test-account-email-live.mjs cleanup
```

The inbox must support plus addressing. Use the same `AWB_EMAIL_TEST_STATE` on every phase if overriding the default. Run once per test; throttling or an auth failure is a failed or incomplete test, never a pass. Cleanup deletes only the matching marked fixture account and its local secret state.
