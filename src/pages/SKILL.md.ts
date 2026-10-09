import release from '../lib/book-cli-release.json';
export const prerender = true;
export function GET() {
 const cli = `npx --yes ${release.package}`;
 const body = `---
name: answer-with-books
description: Set up Answer with Books to find book recommendations, retrieve cited methods, and turn user-selected sources into summaries and reusable skills.
---

# Set up Answer with Books

Install the book skill in the user's current agent, verify public retrieval, and give them one useful example. This is the setup entrypoint; the installed skill contains the reading and conversion workflows.

## Install

Use the current agent from context. Node 20 or later is required for the CLI. If this host cannot run commands or install local skills, explain that limitation and link to https://answerwithbooks.com/books/ for reading in the browser.

For Codex:

\`\`\`sh
${cli} install --skill
\`\`\`

For Claude Code, Cursor, GitHub Copilot, Gemini CLI, OpenCode or OpenClaw, install the canonical skill and its references:

\`\`\`sh
npx --yes skills@1.5.0 add Crowdlisten/Crowdlisten_books --skill answer-with-books --global --agent AGENT_ID
\`\`\`

Replace AGENT_ID with the current host: claude-code, cursor, github-copilot, gemini-cli, opencode or openclaw. If unknown, omit --agent and let the user select their host. OpenClaw uses its default profile; custom profiles need the active skills directory.

Read the installed SKILL.md. Preserve user edits and existing account credentials. Do not downgrade a newer installed release; this guide's published CLI is ${release.version}. No local API server or --api installation is needed for normal use.

## Verify

\`\`\`sh
${cli} books --public --json
\`\`\`

Report whether retrieval succeeded. Public books require no account or API key. Public entries are editorial digests, not full-source books. Installing and listing books do not authorize uploads or paid conversions.

## Connect a private library when requested

\`\`\`sh
${cli} login
\`\`\`

The CLI opens browser authorization. Let the user sign in and approve the connection, matching the terminal code. Do not ask for passwords, API keys or session tokens in chat. Wait for actual authorization; an opened browser is not a completed login. Then verify with books --private --json. Use logout to revoke access.

## Try it

“Use Answer with Books to help me understand organizational structure and division of labor.”

For selected books, the installed skill offers the host's multiple-choice selection and waits for the user's answer. Accept an uploaded copy or an authorized downloadable source. Offer own-agent generation or hosted processing; hosted work requires explicit approval of the returned rates and spending limit. Return the summary and reusable skill when ready.

Keep one generic skill for library retrieval. Installing each book is optional. Follow the installed skill's references for conversion and local generation details. This book integration uses the CLI and hosted API; a book MCP/OAuth endpoint is not currently provided by this setup.
`;
 return new Response(body, {headers: {'Content-Type': 'text/markdown; charset=utf-8'}});
}
