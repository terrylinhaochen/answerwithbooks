# Skills in action: agent conversation demo

## Design

Replaces the homepage's three-step prompt-copy form with one compact agent conversation. The headline is “Your agent, well read.” A book appears beside a task, an actual command or API operation, and a short agent response. The illustration automatically rotates through browsing the catalog, asking about idea validation, and applying Deep Work with personal context. There are no task tabs. Expanding the tool call reveals its complete runnable command, prerequisites, and verified retrieval results. “Explore skills” is the sole primary destination.

This is an authored illustration of an installed skill in a compatible agent. It is labeled “Illustrated demo · public book skill.” It does not connect an agent, install a skill, submit a task, upload a source, or call a model. Its agent replies are authored examples grounded in our existing public digests. Tool output titles and counts were checked against the published CLI; the CLI retrieves sources and does not generate these replies. Public book pages continue to offer the saved editorial digest and copyable prompt; full source-derived skill packages come from private uploads.

The dark frame uses warm charcoal with restrained brass and sage accents. The existing book covers retain visible thickness. On phones the book becomes a small strip above the conversation. No editable composer is shown, so the display does not invite an unsupported live chat.

## Open-source research and implementation

- **CrowdListen:** inspected current `frontend/package.json` and `frontend/DESIGN.md` via GitHub. The frontend uses shadcn/Radix and `motion` 12.40.0. The existing design guide records Instrument Serif, DM Sans, and warm neutral surfaces. These were references, not instructions to overwrite this site's design.
- **Magic UI Terminal:** https://magicui.design/docs/components/terminal and https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/terminal.tsx. Useful patterns: start in view, sequential messages, and explicit playback state. MIT license reviewed. No React component code was copied.
- **Motion Primitives Text Effect:** https://github.com/ibelick/motion-primitives/blob/main/components/core/text-effect.tsx. Useful pattern: reveal meaningful segments instead of a long typewriter paragraph. MIT license. No component code was copied.
- **assistant-ui Tool UI:** https://www.assistant-ui.com/docs/tools/tool-ui. Reference for keeping a loading/result tool call inside the conversation and exposing supporting details on demand. No assistant-ui runtime is installed.
- **Motion:** https://motion.dev/docs/animate. The implementation uses the MIT-licensed `motion/mini` API from pinned `motion@12.40.0`, with an original Astro/TypeScript controller. No React runtime is added. Motion's bundled license notices are preserved at `public/licenses/motion.txt` and served at `/licenses/motion.txt`. The initial compiled demo script is about 4.3 KB gzipped.

## Interaction and accessibility

The sequence starts only when in view. Each example reveals over about five seconds, holds the complete answer for about six seconds, then fades to the next book. The three examples loop without changing the panel height. It pauses outside the viewport or when the tab is hidden. A single pause/play control is available, with keyboard support and an accessible label. Opening skill details completes and pauses the illustration so content stays still while reading; Play closes the details and resumes. Keyboard focus inside the example also pauses it. Browser back/forward restoration resumes the playback controller.

Reduced-motion users get a static complete example and a Next control instead of autoplay. Without JavaScript the first conversation and native command disclosure remain readable. Reveal timing does not change the page layout. Screen readers receive no unsolicited announcements during automatic cycling; manually selected examples are announced.

## Local validation

`npm run build` passes. `node scripts/test-agent-demo.mjs` exercises ordered tool/result reveals, pause/resume, automatic scene switching and wraparound, reading hold, offscreen suspension, stable panel height, command disclosure, preserved surrounding homepage sections, phone/desktop layouts, keyboard activation, reduced motion, and the no-JavaScript transcript. The test rejects provider and processing-worker calls. Browser screenshots are reviewed at 320, 390, 768, and 1280 px.

No production release is included in this change.

## Verified command contract (2026-10-06)

Inspected and executed the **published** `answer-with-books@0.1.4` tarball from npm, rather than relying only on the development checkout. Tarball SHA-1: `36234591b16de1868f6853f9051b670e2922c2d2`.

- `install --skill --api`: installs the skill and bundled runtime. Node 20+ required.
- `ask "QUESTION" --json`: retrieves relevant public books and published editorial answers locally. No account, API key, running HTTP server, or model call is needed by default.
- `ask ... --top-of-mind "CONTEXT"`: accepts request-only context. In 0.1.4 the retrieval query still comes from the question; this flag does not change ranking or generate a personalized answer. The agent retains the user's chat context and applies the retrieved sources itself.
- `serve`: runs the optional localhost HTTP API. `GET /v1/books` lists its catalog. The illustrated curl command is shown with this prerequisite, not as a standalone CLI subcommand.
- `--help`: prints the available commands and flags. Both `list` and `answer` exit with “Unknown command” in 0.1.4. No unsupported commands are advertised.

Executed checks:

1. Started the published `serve` entrypoint on an ephemeral loopback port, fetched `/v1/books`, confirmed 46 books including all three shown, and stopped the test server.
2. `ask "Am I validating this idea or collecting compliments?" --json` returns The Mom Test and Thinking, Fast and Slow, plus two published answers: “How to validate an idea without fooling yourself” and “How to test a risky idea before you build too much.”
3. `ask "How can I protect time for deep work?" --top-of-mind "I keep checking Slack instead of finishing my proposal." --json` returns Deep Work and The Effective Executive, with no published answer. The disclosure preserves that miss and the unsaved-question status.

The UI does not execute these commands or query localhost. The catalog count is pinned to this package's bundled snapshot, not a live website count. Individual uploaded book packages are a different artifact: their instructions and reference files are loaded by a compatible agent, rather than exposing their own `list` or `ask` executables.
