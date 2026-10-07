# Skills in action: agent conversation demo

## Design

The headline is “Your agent, well read.” One question about finding a direction for great work progresses through **List books → Ask → Apply**. The question, both tool calls, catalog results, and final reply accumulate in the same conversation. The conversation shows the progression directly, without a step-label row or tabs. The same complete flow loops; it never switches to a different user task. “Explore skills” is the sole primary destination.

1. The user asks ‘How do I choose a career where I can do great work?’ with interests in writing, software, and teaching. A visible `GET /v1/books` tool call lists the public catalog, followed by three compact book entries from its 46 results: Designing Your Life, Deep Work, and Zero to One.
2. A separate `ask` call submits that question and context. It retrieves three books and one published answer. Designing Your Life is highlighted as the lead source in the sample catalog; the disclosure lists all matches.
3. The agent applies the sources to a concrete experiment: build a small teaching tool, try it with five people, and seek feedback on a skill worth developing. The complete result holds before the same conversation replays.

Both tool calls have native command disclosures. Catalog details show the required optional local API startup command and exact curl request. Ask details show the executable command and verified result, including the matched published career brief. Opening a disclosure pauses at the current step instead of skipping to the final reply; Play closes disclosures and continues.

This is an authored illustration labeled “Illustrated demo · skill + local API.” It does not connect an agent, install a skill, submit a task, upload a source, or call a model or localhost API. The CLI retrieves sources; the displayed final response is an authored application. Public book pages continue to offer editorial digests and copyable prompts; full source-derived skill packages come from private uploads.

The dark frame uses warm charcoal with restrained brass and sage accents. The main source cover and all catalog thumbnails use the shared `BookJacket` component, including its cream title-and-author panel, artwork, paper texture, and solid book edges. Depth is scaled for the smaller demo covers. On phones the book becomes a compact strip above the conversation. No editable composer is shown.

## Open-source research and implementation

- **CrowdListen:** inspected current `frontend/package.json` and `frontend/DESIGN.md` via GitHub. The frontend uses shadcn/Radix and `motion` 12.40.0. The existing design guide records Instrument Serif, DM Sans, and warm neutral surfaces. These were references, not instructions to overwrite this site's design.
- **Magic UI Terminal:** https://magicui.design/docs/components/terminal and https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/terminal.tsx. Useful patterns: start in view, sequential messages, and explicit playback state. MIT license reviewed. No React component code was copied.
- **Motion Primitives Text Effect:** https://github.com/ibelick/motion-primitives/blob/main/components/core/text-effect.tsx. Useful pattern: reveal meaningful segments instead of a long typewriter paragraph. MIT license. No component code was copied.
- **assistant-ui Tool UI:** https://www.assistant-ui.com/docs/tools/tool-ui. Reference for keeping a loading/result tool call inside the conversation and exposing supporting details on demand. No assistant-ui runtime is installed.
- **Motion:** https://motion.dev/docs/animate. The implementation uses the MIT-licensed `motion/mini` API from pinned `motion@12.40.0`, with an original Astro/TypeScript controller. No React runtime is added. Motion's bundled license notices are preserved at `public/licenses/motion.txt` and served at `/licenses/motion.txt`. The initial compiled demo script is about 4.3 KB gzipped.

## Interaction and accessibility

Playback begins when at least a quarter of the panel is visible. Listing occupies the first 4.5 seconds, the separate ask call the next 3.4 seconds, then the applied answer unfolds. The full answer is visible by about 11 seconds and remains until a short fade at 18.5 seconds. At 19 seconds the same task starts again. Earlier stages remain visible as later stages appear; the panel height remains stable.

Pause/Play shares one keyboard-accessible control. Playback pauses offscreen, in a hidden tab, on focus inside the conversation, or when either command disclosure opens. Inspection holds the current time rather than forcing completion. Play closes the disclosures and resumes. Browser back/forward restoration resumes playback.

Reduced-motion users get the completed static flow with both calls and catalog results, without playback controls. Without JavaScript the same complete transcript and native disclosures remain readable. Screen readers receive no unsolicited announcements during the loop. Unrevealed content is hidden from accessibility navigation and made inert.

## Local validation

`npm run build` and `node scripts/test-agent-demo.mjs` cover the actual listing step preceding ask, visible catalog results, matched-book highlighting, ordered progression, a repeating single task, reading hold, pause/continue without skipping, stable layout, actual command disclosures, preserved surrounding homepage sections, phone/desktop layouts, keyboard operation, reduced motion, and the no-JavaScript transcript. The test rejects provider, processing-worker, and local API calls from the illustration. Screenshots are reviewed at 320, 390, and 1280 px.

No production release is included in this change.

## Verified command contract (2026-10-06)

Inspected and executed the **published** `answer-with-books@0.1.4` tarball from npm, rather than relying only on the development checkout. Tarball SHA-1: `36234591b16de1868f6853f9051b670e2922c2d2`.

- `install --skill --api`: installs the skill and bundled runtime. Node 20+ required.
- `ask "QUESTION" --json`: retrieves relevant public books and published editorial answers locally. No account, API key, running HTTP server, or model call is needed by default.
- `ask ... --top-of-mind "CONTEXT"`: accepts request-only context. In 0.1.4 the retrieval query still comes from the question; this flag does not change ranking or generate a personalized answer. The agent retains the user's chat context and applies the retrieved sources itself.
- `serve`: runs the optional localhost HTTP API. `GET /v1/books` lists its catalog. The catalog disclosure shows this prerequisite; the Skills page also documents it.
- `--help`: prints the available commands and flags. Both `list` and `answer` exit with “Unknown command” in 0.1.4. No unsupported commands are advertised.

Current illustrated command, executed against the published package:

```sh
npx --yes answer-with-books@0.1.4 ask "How do I choose a career where I can do great work?" --top-of-mind "I love writing, software, and teaching. Where should I focus?" --json
```

It returns `status: hit`; Working Identity, So Good They Can't Ignore You, and Designing Your Life; the published answer ‘How to decide what to do with your career next’; and `new_question: null`. The disclosure preserves those actual results. The small teaching-tool project is an editorial application of the sources, not claimed verbatim CLI output.

The question takes inspiration from Paul Graham's *How to Do Great Work* (https://paulgraham.com/greatwork.html), checked on 2026-10-06. His essay informed the choice of ambition, curiosity, and work selection as the example's theme. It is not installed in this package or represented as a retrieved book. The final reply draws on our existing digests' career experiments, prototyping, and deliberate skill-building.

The catalog response was rechecked in the published package: 46 books, including all three displayed entries. Catalog listing is now the first visible tool call in the same conversation, not a separate example.

Individual uploaded book packages are a different artifact: their instructions and reference files are loaded by a compatible agent, rather than exposing their own `list` or `ask` executables.
