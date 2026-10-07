# Skills in action: agent conversation demo

## Design

The headline is “Your agent, well read.” One concrete customer interview question progresses through **Ask → Find books → Apply**. The question, retrieval call, and final reply accumulate in the same conversation. The three progress labels are passive status indicators, not tabs. There is no catalog-browsing scene or switch to a different task. The Mom Test remains beside the conversation as its source book. “Explore skills” is the sole primary destination.

The user asks “How should I interview customers to validate my meal-planning app?” and provides context about five interviews before building. The agent's `ask` call finds The Mom Test, then the illustration applies its methods to three interview questions about actual behavior. Expanding the tool call exposes the complete runnable command and verified retrieval result, including the lack of a matching published answer.

This is an authored illustration labeled “Illustrated demo · public book skill.” It does not connect an agent, install a skill, submit a task, upload a source, or call a model. The CLI retrieves sources; the displayed final response is an authored example of how the agent can apply them. Public book pages continue to offer the saved editorial digest and copyable prompt; full source-derived skill packages come from private uploads.

The dark frame uses warm charcoal with restrained brass and sage accents. The existing book cover retains visible thickness. On phones the book becomes a compact strip above the conversation. No editable composer is shown, so the display does not invite an unsupported live chat.

## Open-source research and implementation

- **CrowdListen:** inspected current `frontend/package.json` and `frontend/DESIGN.md` via GitHub. The frontend uses shadcn/Radix and `motion` 12.40.0. The existing design guide records Instrument Serif, DM Sans, and warm neutral surfaces. These were references, not instructions to overwrite this site's design.
- **Magic UI Terminal:** https://magicui.design/docs/components/terminal and https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/terminal.tsx. Useful patterns: start in view, sequential messages, and explicit playback state. MIT license reviewed. No React component code was copied.
- **Motion Primitives Text Effect:** https://github.com/ibelick/motion-primitives/blob/main/components/core/text-effect.tsx. Useful pattern: reveal meaningful segments instead of a long typewriter paragraph. MIT license. No component code was copied.
- **assistant-ui Tool UI:** https://www.assistant-ui.com/docs/tools/tool-ui. Reference for keeping a loading/result tool call inside the conversation and exposing supporting details on demand. No assistant-ui runtime is installed.
- **Motion:** https://motion.dev/docs/animate. The implementation uses the MIT-licensed `motion/mini` API from pinned `motion@12.40.0`, with an original Astro/TypeScript controller. No React runtime is added. Motion's bundled license notices are preserved at `public/licenses/motion.txt` and served at `/licenses/motion.txt`. The initial compiled demo script is about 4.3 KB gzipped.

## Interaction and accessibility

The flow starts only when in view, unfolds over about seven seconds, then stays complete until the user chooses Replay. Each step highlights automatically as its content appears. The original question and earlier stages remain visible as the response develops. The panel height stays stable during reveals. Playback pauses outside the viewport or when the tab is hidden. Pause, Play, and Replay share one control with keyboard support and an accessible label. Opening tool details completes the flow so the command can be read without motion. Keyboard focus inside the conversation pauses playback. Browser back/forward restoration resumes an unfinished flow.

Reduced-motion users receive the completed static conversation without playback controls. Without JavaScript the complete conversation and native command disclosure remain readable. Screen readers receive no unsolicited announcements during playback. The current progression step has `aria-current="step"`; unrevealed content is hidden from accessibility navigation and made inert.

## Local validation

`npm run build` and `node scripts/test-agent-demo.mjs` cover ordered three-step progression in one conversation, pause/resume, replay, retention of the completed answer, offscreen suspension, stable panel height, actual command disclosure, preserved surrounding homepage sections, phone/desktop layouts, keyboard operation, reduced motion, and the no-JavaScript transcript. The test rejects provider, processing-worker, and local API calls from the illustration. Screenshots are reviewed at 320, 390, and 1280 px.

No production release is included in this change.

## Verified command contract (2026-10-06)

Inspected and executed the **published** `answer-with-books@0.1.4` tarball from npm, rather than relying only on the development checkout. Tarball SHA-1: `36234591b16de1868f6853f9051b670e2922c2d2`.

- `install --skill --api`: installs the skill and bundled runtime. Node 20+ required.
- `ask "QUESTION" --json`: retrieves relevant public books and published editorial answers locally. No account, API key, running HTTP server, or model call is needed by default.
- `ask ... --top-of-mind "CONTEXT"`: accepts request-only context. In 0.1.4 the retrieval query still comes from the question; this flag does not change ranking or generate a personalized answer. The agent retains the user's chat context and applies the retrieved sources itself.
- `serve`: runs the optional localhost HTTP API. `GET /v1/books` lists its catalog. Catalog listing requires this local API; it is documented on the Skills page.
- `--help`: prints the available commands and flags. Both `list` and `answer` exit with “Unknown command” in 0.1.4. No unsupported commands are advertised.

Current illustrated command, executed against the published package:

```sh
npx --yes answer-with-books@0.1.4 ask "How should I interview customers to validate my meal-planning app?" --top-of-mind "I want five customer interviews before building the app." --json
```

It returns `status: new_question`, The Mom Test as the only book, no published answers, and `new_question.saved: false`. The disclosure preserves those distinctions. The short source-method note and final questions are editorial applications of the matched book, not claimed verbatim CLI output.

The earlier command audit also confirmed 46 books in the optional local API catalog. Catalog listing remains documented in the Skills page FAQ; it is not a separate scene in this single-task demo.

Individual uploaded book packages are a different artifact: their instructions and reference files are loaded by a compatible agent, rather than exposing their own `list` or `ask` executables.
