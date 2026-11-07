# Responsive layout audit — November 6, 2026

Browser viewport checks in headless Chrome; these are not physical-device or Safari tests.

## Coverage

- Production baseline: 320×568, 390×844, 430×932, 768×1024, 1024×768, 1280×800, and 1920×1080.
- Pages: home, catalog, Skills, Guides, billing, a source book, and a published guide.
- Dialogs: book preview, skill installation, and guide creation. Opened only; no guide generation or purchase submitted.
- Measured page overflow, visible content outside the horizontal viewport, dialog bounds and internal overflow, and browser runtime errors. Inspected screenshots of the hero, demo, installation banner, footer, and dialogs.
- The guide initially showed its loading shell. The reusable audit now explicitly waits for the populated reader before measuring it. Book checks likewise wait for the loaded title.
- Profile: static markup checked at 320, 768, 1024, and 1920 with a long sample name and email. This does not verify authentication or account data.

## Fixes

1. Skills introduction switches to one column at 1100px and below. On phones up to 480px, the cover and reading note stack so neither gets squeezed into a narrow strip.
2. The installation dialog hides the full setup prompt behind a prominent copy button. The example also uses a compact copy button. The terminal option remains available under its disclosure.
3. The dialog heading and paper use the site's shared editorial type and palette.

The off-screen feedback input flagged by the initial scan is an intentionally hidden anti-spam field, not visible content or document overflow. The audit excludes its `aria-hidden` container.

## Verification

- Revised public layouts: 60 page/dialog cases at 320, 390, 768, 844×390 landscape, 1024, and 1280. No horizontal page overflow, off-screen visible controls, dialog bounds failures, or JavaScript errors.
- Install prompt clipboard contents, terminal platform switching, and Escape dismissal checked against the built site.
- Production build, product-surface audit, and all 71 rendered-cover checks pass.

## Repeat

```sh
AWB_TEST_ORIGIN=http://127.0.0.1:4321 node scripts/audit-responsive-layout.mjs
```

Defaults to production when `AWB_TEST_ORIGIN` is omitted. Screenshots and JSON results go to `/tmp/awb-responsive-layout`; override with `AWB_LAYOUT_OUTPUT`. Restrict cases with `AWB_LAYOUT_ROUTES=skills,guides` and/or `AWB_LAYOUT_SIZES='[[320,568],[768,1024]]'`.

Reduced-motion mode is enabled to inspect the complete demo layout. Animation timing has a separate check in `scripts/test-print-release.mjs`.
