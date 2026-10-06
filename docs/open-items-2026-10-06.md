# Follow-up on open dogfood items

## Historical skill repair: closed

The one existing ready book was rebuilt from its saved source using the current distillation and source-support checks. All four sections completed. The original source text, source hash, cover, and private ownership are unchanged. The old artifacts were archived in the same private book folder before generation; the live book remained available until the checked replacement was committed. Owners can download the current or previous ZIP. Previous versions are explicitly labeled as superseded.

The `repair-private-books.mjs` operator script defaults to an audit. `--apply` advances bounded, resumable section processing. It prints only counts and verification flags, never book contents or credentials. Already reviewed books are skipped. Important claims still need human review; an automated source-support check is not a guarantee of correctness.

Repair is restricted to verified project operators. The server checks bearer-token authority with the project's Auth admin endpoint and fails closed on invalid credentials or network failure. Live preflight verified a valid operator succeeds while anonymous, ordinary-user, invalid, empty, and forged-role credentials fail. Owner-only export checks also apply to archived revisions. Tests verified that deleting a book removes its private revision files.

## Mobile and topics: closed

The existing surface audit passed on 23 routes at 1440, 390, and 320 pixels, including task copy, keyboard tabs, manual clipboard fallback, uploads, authenticated profile rendering, and login guards. These tests mock account responses.

The topic audit passed for all nine library categories, complete pagination without skipped or duplicate books, search and empty results, and all eight topic pages at the same three widths. These tests exercise the real catalog and browser rendering.

## npm: closed

Package 0.1.4 is published with one pinned npm command across CLI help, README, SKILL.md, and the website. Nine package tests and GitHub CI pass. The exact documented npm command passed from an empty directory with an empty npm cache, and the installed skill successfully retrieved a relevant public answer. The published tarball SHA-1 is `36234591b16de1868f6853f9051b670e2922c2d2`.

## Email delivery: closed

Production authentication now uses the existing CrowdListen Resend workspace with a dedicated verified `auth.answerwithbooks.com` domain and a sending-only key restricted to that domain. All four DNS records match on both GoDaddy nameservers and a public resolver. SMTP authentication and an independent Supabase configuration readback passed. The project email limit is now 30 per hour, and email confirmation remains enabled.

All 13 authentication and security templates use **Answer with Books**, as does the live sender `no-reply@auth.answerwithbooks.com`. One explicitly authorized test through the production login page returned HTTP 200 and was reported delivered to Gmail by Resend. The request kept account creation disabled. The recipient then confirmed receipt and successful sign-in through the emailed link. This verifies one live Gmail sign-in; deliverability across other mailbox providers and long-term reliability are not established by this test. No newsletter subscription or additional test email was created.

See [email setup](email-setup-2026-10-06.md) and `verification/email-setup-2026-10-06/email-connection.json` for the configuration and nonsecret acceptance evidence.

Independent, blind agent-quality benchmarking and multilingual semantic retrieval are broader product capabilities, not established by this regression pass. Current public retrieval explicitly supports English; an agent can translate a query and disclose that translation.

Evidence: `verification/open-items-2026-10-06/` contains the historical repair, live repair/privacy acceptance, operator-authorization preflight, mobile, topic-filter, clean npm install, and email configuration results. No real user source text or credential is included in these receipts.
