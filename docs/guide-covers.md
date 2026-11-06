# Practical guide covers

Generated with the built-in image generation tool, one request per cover. The existing value-proposition and user-interview covers were inspected as style references. The new artwork keeps the same wide composition, bold outlines and saturated colors. Short cover titles are HTML, not baked into the images.

Final files are 1536 × 864 JPEGs, resized and compressed from the 1672 × 941 originals. Slight generated shading remains; the title area is intentionally clear. Existing answer covers are unchanged.

## github-lead-research

Asset: `public/guide-covers/github-lead-research.jpg`

Exact generation prompt:

```text
Use case: stylized-concept
Asset type: landscape website editorial guide cover illustration, 16:9 canvas, ideally 1536x864.
Primary request: Create one original cover illustration representing project evidence leading to a shortlist.
Scene/backdrop: perfectly flat, solid saturated electric cobalt blue #0b6bdc, edge to edge.
Subject: one large magnifying glass over a simple three-node repository branching symbol. Make these a single clean, readable grouped motif.
Style/medium: flat vector-like editorial sticker illustration rendered as a raster image; chunky dark navy outlines, rounded joins, saturated solid fills, a few clean geometric highlight planes, simple hard-edged offset shadow.
Composition/framing: all of the motif, outlines and shadows contained in the rightmost 49% of the canvas; clear margins so it sits within x=52%–94%, y=10%–90%. Preserve the entire left 46% as completely empty, flat blue backdrop for later HTML white serif title text. Strong readable silhouette with generous spacing.
Color palette: cobalt backdrop, yellow/cyan/ivory accents, dark navy outlines.
Text: absolutely no text.
Constraints: new original image, not an edit of an existing cover. No actual brand or platform logos, no generated letters or words, no watermark, no UI frame, no gradients, no texture, no photorealism, no tiny decorations, no crowded elements. Do not place anything on the left side. Keep the backdrop truly uniform.
```

## x-discourse-analysis

Asset: `public/guide-covers/x-discourse-analysis.jpg`

Exact generation prompt:

```text
Use case: stylized-concept
Asset type: landscape website editorial guide cover illustration, 16:9 canvas, ideally 1536x864.
Primary request: Create one original cover illustration representing analysis of public discussion.
Scene/backdrop: perfectly flat, solid saturated violet #6a24d8, edge to edge.
Subject: exactly three generously spaced large overlapping speech bubbles forming one readable conversation motif. Keep each bubble interior simple and empty.
Style/medium: flat vector-like editorial sticker illustration rendered as a raster image; chunky dark purple outlines, rounded joins, saturated solid fills, a few clean geometric highlight planes, simple hard-edged offset shadow.
Composition/framing: all three bubbles, outlines and shadows contained in the rightmost 49% of the canvas; clear margins so the group sits within x=52%–94%, y=10%–90%. Preserve the entire left 46% as completely empty, flat violet backdrop for later HTML white serif title text. Strong readable silhouette with generous spacing.
Color palette: violet backdrop, lime and cream accents, dark purple outlines.
Text: absolutely no text.
Constraints: new original image, not an edit of an existing cover. No actual brand or platform logos, no generated letters or words, no watermark, no UI frame, no gradients, no texture, no photorealism, no dots or tiny decorations, no crowded elements. Do not place anything on the left side. Keep the backdrop truly uniform.
```

## audience-enrichment

Asset: `public/guide-covers/audience-enrichment.jpg`

Exact generation prompt:

```text
Use case: stylized-concept
Asset type: landscape website editorial guide cover illustration, 16:9 canvas, ideally 1536x864.
Primary request: Create one original cover illustration representing evidence-backed audience enrichment.
Scene/backdrop: perfectly flat, solid bright teal #008c8c, edge to edge.
Subject: one simple professional profile card with an attached checked evidence card and exactly two short connector strokes. On the profile card use only a large simple generic head-and-shoulders silhouette, not a realistic person. On the evidence card use only one large check mark. Keep this a single clean, readable grouped motif.
Style/medium: flat vector-like editorial sticker illustration rendered as a raster image; chunky dark teal outlines, rounded joins, saturated solid fills, a few clean geometric highlight planes, simple hard-edged offset shadow.
Composition/framing: all of the motif, outlines and shadows contained in the rightmost 49% of the canvas; clear margins so it sits within x=52%–94%, y=10%–90%. Preserve the entire left 46% as completely empty, flat teal backdrop for later HTML white serif title text. Strong readable silhouette with generous spacing.
Color palette: teal backdrop, ivory/yellow/coral accents, dark teal outlines.
Text: absolutely no text.
Constraints: new original image, not an edit of an existing cover. No actual brand or platform logos, no generated letters or words or tiny text, no realistic people, no watermark, no UI frame, no gradients, no texture, no photorealism, no tiny decorations, no crowded elements. Do not place anything on the left side. Keep the backdrop truly uniform.
```


## Private question guides

Private guides follow this same art direction. The repeated green book-jacket collage has been removed. Covers use a short HTML label, a distinct question-specific emblem, and a saturated background; source book jackets remain in the separate books list.

For newly generated guides, `_shared/guide-cover.mjs` asks the language model to plan the metaphor, short label, and palette from the question and reading. Recent covers in the same account are supplied to discourage repetition. A separate queue stage calls the existing hosted image provider and stores the image in `private-books`. The API signs image URLs after owner checks. Image failure leaves the reading available. The reader and saved-guide list refresh while artwork is pending.

The two initial private guide illustrations were created with the built-in image-generation tool, visually inspected against the existing covers, copied into the workspace, and imported into their owners' private guide records. Their exact prompts and final PNG files are recorded in `docs/verification/hosted-guides-2026-11-06/covers/`. Source images were resized to 1536 × 864. This is a cover-only update; passages and editorial text were preserved.

Verification distinguishes the two paths: built-in-generated cover import, private storage, fresh signed-image readback, and desktop/mobile rendering were checked live. Automatic planning/image requests, queue claims/retries, and failure isolation were checked with transport fixtures and local PostgreSQL; a new paid hosted image-generation job was not run for this repair. Visual review is still needed when curating future covers.
