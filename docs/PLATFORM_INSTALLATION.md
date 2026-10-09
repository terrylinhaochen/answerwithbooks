# Public skill installation

The primary setup is one message: `Set up https://answerwithbooks.com/SKILL.md`. The website's `SkillInstallOptions.astro` shows setup, optional private-library browser connection and an example together. Terminal commands are a collapsed fallback, with a host selector. Clipboard failure exposes selectable text; reopening clears transient state. The inline modal opener remains independent of deferred modules.

The root setup endpoint uses `src/lib/book-cli-release.json`, currently the published GitHub release 0.5.0. Codex installs with `install --skill`; normal setup no longer installs the optional local API. Other supported hosts use `skills@1.5.0` with the canonical repository skill and its references. That shared installer supports the Node 20 minimum used by AWB. Unknown hosts are selected interactively, not installed everywhere. OpenClaw custom profiles need the active profile's skill directory.

Public retrieval needs no account or API key. Private access uses the CLI browser authorization flow. The setup document does not authorize paid processing or uploads. Individual book installation remains optional, and the generic skill can retrieve from a large library.

Customer documentation is prepared in `mintlify/`; see `MINTLIFY_DEPLOYMENT.md` for the Starter deployment connection and cutover status. The root setup URL remains on the product domain independently of the docs host.

Verified locally: fresh site build; all eight terminal choices; clipboard copy and denied-clipboard fallback on the homepage dialog and Skills FAQ; dialog reopen; mobile widths 320/390 and desktop 1280; published 0.5.0 public retrieval. Installation/discovery in every native host application is not certified by these checks.
