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

## Email delivery: provider connection required

A read-only production configuration check found no custom SMTP host, no Send Email hook, and a two-email-per-hour limit. AWB has no email-provider secret configured. Supabase documents that its default sender only delivers to project-team addresses; public signup requires a production sender. This is a configuration blocker, not merely an unobserved inbox result. See [Supabase SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

Connect an existing sending account and verified sender domain in the project Auth SMTP settings, keeping email confirmation enabled. Then authorize one verification email and confirm arrival from the receiving inbox. No email was sent during this check. The repaired signup flow preserves plus aliases and does not create newsletter consent. Provider acceptance alone does not prove delivery.

Independent, blind agent-quality benchmarking and multilingual semantic retrieval are broader product capabilities, not established by this regression pass. Current public retrieval explicitly supports English; an agent can translate a query and disclose that translation.

Evidence: `verification/open-items-2026-10-06/` contains the historical repair, live repair/privacy acceptance, operator-authorization preflight, mobile, topic-filter, clean npm install, and email configuration results. No real user source text or credential is included in these receipts.
