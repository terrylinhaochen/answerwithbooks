# Tactile shelf studies

Two local homepage prototypes, based on release `c623573`.

- `/shelf-lab/?direction=room`: a paper background, wooden ledge, separated artwork and typography, dimensional jackets, pointer tilt, and a click-to-lift reading view. On small screens the shelf scrolls horizontally with snap points.
- `/shelf-lab/?direction=table`: a dark reading table with freely movable books. Drag or use arrow keys on a focused book to arrange it; reset restores the arrangement. Clicking or pressing Enter opens the same reading view.

The shared detail dialog supports Escape, previous/next buttons, arrow navigation, focus restoration, and reduced motion. Titles, authors, descriptions, years, and reading links come from the existing book collection. The task prompts are editorial invitations, not quotations. The detail dialog presents a task-specific “Copy to agent” button, with “Open the book” as the secondary reading link. Copied text carries the catalog digest and task; clipboard failure exposes a selectable fallback.

The former cover renderer puts an absolutely positioned title plate over a full-frame image. The new BookJacket component gives artwork and text separate grid rows. Existing illustrations are reused; no external artwork or third-party interaction code was copied. The physical pull-out reference was https://press.stripe.com/.

The previews share the homepage sections below their replacement hero. See collector-homepage.md for the subsequent full-page redesign. The collector homepage uses TactileShelf as its entry section. The prototype route is noindex and excluded from the sitemap. Production deployment uses the main-branch Pages workflow.

Validation: Astro build; four viewport sizes (1440, 768, 390, 320); five book dialogs; separate artwork/type regions; mouse dragging and reset; keyboard movement and focus return; native touch drag/tap and shelf swipe; reduced motion; original lower landing markup comparison.

## Hardcover refinement

Book depth now scales with the jacket width (30–64 px), with solid recessed paper blocks and separate cover-board edges. Repeating page stripes, edition rules, section dividers, and the drawn arrow were removed. The dark hero is inset in a rounded panel on the existing light page. The 3D buttons no longer use a CSS filter, which flattened their descendant planes.

## Rendering continuity

The collector table used to initialize from the query string only after its external module loaded. It now selects the layout with a small inline script before the visible subtree paints; delayed JavaScript no longer changes the book angles or theme after the first frame.

The pickup animation also interpolated opacity from 0.55 to 1 on the wrapper that owns the 3D planes. Opacity below 1 forces those planes to flatten, producing a visible page-block pop at the end. Pickup now animates only transforms, retains the source book's 3D angle, and starts synchronously when the dialog opens. The redundant dialog fade was removed.

Verified with deferred modules held back and animation samples at 0, 60, 250, 600, and 620 milliseconds in both layouts. Book opacity stays at 1 and the side remains visible throughout. Existing desktop, mobile, keyboard, drag, touch, and reduced-motion checks pass.
