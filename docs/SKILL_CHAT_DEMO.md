# Skills in action: agent conversation demo

## Design

Replaces the homepage's three-step prompt-copy form with one compact agent conversation. The headline is “Your agent, well read.” A book appears beside a task, an inline “Read skill” call, and a short applied result. The illustration automatically rotates through The Mom Test, Deep Work, and Atomic Habits, with no task tabs. Expanding the skill call reveals three methods it contributed. “Explore skills” is the sole primary destination.

This is an authored illustration of an installed skill in a compatible agent. It is labeled “Illustrated demo · skill installed.” It does not connect an agent, install a skill, submit a task, upload a source, or call a model. Its questions and plans are authored examples grounded in our existing public digests. Public book pages continue to offer the saved editorial digest and copyable prompt; full source-derived skill packages come from private uploads.

The dark frame uses warm charcoal with restrained brass and sage accents. The existing book covers retain visible thickness. On phones the book becomes a small strip above the conversation. No editable composer is shown, so the display does not invite an unsupported live chat.

## Open-source research and implementation

- **CrowdListen:** inspected current `frontend/package.json` and `frontend/DESIGN.md` via GitHub. The frontend uses shadcn/Radix and `motion` 12.40.0. The existing design guide records Instrument Serif, DM Sans, and warm neutral surfaces. These were references, not instructions to overwrite this site's design.
- **Magic UI Terminal:** https://magicui.design/docs/components/terminal and https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/terminal.tsx. Useful patterns: start in view, sequential messages, and explicit playback state. MIT license reviewed. No React component code was copied.
- **Motion Primitives Text Effect:** https://github.com/ibelick/motion-primitives/blob/main/components/core/text-effect.tsx. Useful pattern: reveal meaningful segments instead of a long typewriter paragraph. MIT license. No component code was copied.
- **assistant-ui Tool UI:** https://www.assistant-ui.com/docs/tools/tool-ui. Reference for keeping a loading/result tool call inside the conversation and exposing supporting details on demand. No assistant-ui runtime is installed.
- **Motion:** https://motion.dev/docs/animate. The implementation uses the MIT-licensed `motion/mini` API from pinned `motion@12.40.0`, with an original Astro/TypeScript controller. No React runtime is added. Motion's bundled license notices are preserved at `public/licenses/motion.txt` and served at `/licenses/motion.txt`. The initial compiled demo script is about 4.3 KB gzipped.

## Interaction and accessibility

The sequence starts only when in view. Each example reveals over about five seconds, holds the complete answer for about six seconds, then fades to the next book. The three examples loop without changing the panel height. It pauses outside the viewport or when the tab is hidden. A single pause/play control is available, with keyboard support and an accessible label. Opening skill details completes and pauses the illustration so content stays still while reading; Play closes the details and resumes. Keyboard focus inside the example also pauses it. Browser back/forward restoration resumes the playback controller.

Reduced-motion users get a static complete example and a Next control instead of autoplay. Without JavaScript the first conversation and native skill disclosure remain readable. Reveal timing does not change the page layout. Screen readers receive no unsolicited announcements during automatic cycling; manually selected examples are announced.

## Local validation

`npm run build` passes. `node scripts/test-agent-demo.mjs` exercises ordered tool/result reveals, pause/resume, automatic scene switching and wraparound, reading hold, offscreen suspension, stable panel height, method disclosure, preserved surrounding homepage sections, phone/desktop layouts, keyboard activation, reduced motion, and the no-JavaScript transcript. The test rejects provider and processing-worker calls. Browser screenshots are reviewed at 320, 390, 768, and 1280 px.

No production release is included in this change.
