# Public skill installation

The homepage install dialog and the public-shelf FAQ share `SkillInstallOptions.astro` and `book-skill-install.mjs`. The selector changes the command, installation note, and first-task instructions together. Homepage setup controls are buttons with no navigation URL. A small inline controller opens the modal even if deferred modules are unavailable. Changing platforms clears copied/fallback state; a pending clipboard response cannot show confirmation for a different command.

## Available choices

- Codex: keep `npx --yes answer-with-books@0.1.4 install --skill --api`. This installer copies the skill and bundled corpus/runtime to Codex, plus an optional local API under the current directory. Existing installations remain usable.
- Claude Code, Cursor, GitHub Copilot, Gemini CLI, OpenCode, OpenClaw: use `npx --yes skills@1.5.0 add Crowdlisten/Crowdlisten_books --skill answer-with-books --global --agent <id>`.
- Other / multiple agents: the same shared command without `--agent`. The terminal presents the agent selection; it does not silently install into every supported agent. No `--all` or installer `--yes` flag is added.

`skills@1.5.0` supports Node >=18, while Answer with Books requires Node 20+, so the UI consistently asks for Node 20+. The checked `skills@1.6.0` and `1.7.1` require Node >=22.20 and would exclude the user's Node 22.12 installation. The shared installer uses the default OpenClaw state (or its recognized legacy directories); custom profiles need their active skill folder. The UI discloses that limitation.

The shared installer downloads the `skill/answer-with-books` directory from the public CLI repository. That directory contains instructions, not the bundled runtime. Its existing documented fallback is `npx --yes answer-with-books@0.1.4 ask "QUESTION" --json`; the first invocation fetches the public runtime/corpus through npm. The UI therefore does not describe these installs as a preloaded offline library. No AI provider key, account, or running local HTTP server is required. Shell-capable agents still need permission to execute the CLI.

## References reviewed on 2026-10-06

- [Upstream book-to-skill installation](https://github.com/virgiliojr94/book-to-skill/blob/master/docs/install.md): recommends `npx skills add`, with manual host-specific locations as alternatives.
- [Shared skills installer](https://github.com/vercel-labs/skills): agent selection, global scope, install paths, and supported agent IDs. Actual v1.5.0 package code and npm engine metadata were checked, rather than assuming current main describes the pinned release.
- [Public Answer with Books skill](https://github.com/Crowdlisten/Crowdlisten_books/blob/main/skill/answer-with-books/SKILL.md): bundled-runtime and published-CLI fallback paths.
- CrowdListen's existing `frontend/src/components/collection/AgentClientPicker.jsx`: native agent dropdown, selected-agent setup, and cleared copy state. Reused the interaction pattern; its MCP login/configuration commands do not apply to this skill.

## Validation

- The real pinned shared installer discovers exactly one `answer-with-books` skill in the public repository.
- A temporary project installation for all seven named agents succeeded. Shared skill files plus Claude Code/OpenClaw links were read back. These tests used project scope to avoid replacing the user's installed skills; the advertised global destinations were checked in the pinned installer's source.
- Executed the fallback retrieval command from that installation against the published `answer-with-books@0.1.4`: `status: hit`, three books and one published answer for the great-work career question. No API server or model invocation.
- `node scripts/test-skill-install-ui.mjs`: every selector option copies the appropriate command on both surfaces, manual clipboard fallback follows the new selection, copied status resets, no browser errors or horizontal overflow at 320, 390, and 1280 px.
- Browser installation/discovery inside each native agent application is not certified by these filesystem/CLI checks.
