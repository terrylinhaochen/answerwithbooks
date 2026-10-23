import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const base = process.env.DISCOVERY_BASE_URL || 'http://127.0.0.1:4363';
const output = process.env.DISCOVERY_SCREENSHOTS || '/private/tmp/awb-search-discovery';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const paths = ['/reading-lists/', ...['customer-interviews', 'startup-validation', 'business-strategy', 'management-and-team-design', 'decision-making', 'focus-and-priorities'].map(slug => `/reading-lists/${slug}/`), '/answers/how-to-run-user-interviews-that-do-not-lie-to-you/', '/books/the-mom-test/', '/guides/'];
const results = [];
try {
  for (const javaScriptEnabled of [true, false]) {
    for (const width of [390, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled });
      // Reading must work without tracking, API requests, or third-party fonts.
      await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
      const page = await context.newPage();
      for (const path of paths) {
        const response = await page.goto(`${base}${path}`, { waitUntil: 'load' });
        assert.equal(response.status(), 200, path);
        await page.locator('main h1').waitFor({ state: 'visible' });
        assert.equal(await page.locator('main h1').count(), 1, `${path} h1`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${path} overflows at ${width}`);
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        assert.equal(canonical, `https://answerwithbooks.com${path}`);
        if (path.startsWith('/reading-lists/')) {
          const covers = page.locator('[data-reading-path-cover]');
          assert.equal(await covers.count(), path === '/reading-lists/' ? 6 : 1, 'Every reading path has artwork');
          for (const cover of await covers.all()) {
            const image = cover.locator('img');
            await image.scrollIntoViewIfNeeded();
            await image.evaluate(img => img.decode());
            assert.ok(await image.evaluate(img => img.naturalWidth === 1536 && img.naturalHeight === 864));
            assert.ok(await cover.locator('.guide-cover__label').evaluate(label => label.scrollHeight <= label.clientHeight + 1), 'Cover label fits');
          }
        }
        if (path.startsWith('/reading-lists/') && path !== '/reading-lists/') {
          assert.equal(await page.locator('[data-reading-choice]').count(), 3);
          assert.equal(await page.locator('[data-reading-choice]').first().isVisible(), true);
          const images = page.locator('[data-reading-choice] img');
          for (const image of await images.all()) {
            await image.scrollIntoViewIfNeeded();
            await image.evaluate(img => img.decode());
            assert.ok(await image.evaluate(img => img.naturalWidth > 0));
          }
        }
        if (path.includes('how-to-run-user-interviews')) {
          assert.equal(await page.locator('main table').count(), 1);
          assert.ok(await page.getByRole('heading', { name: 'What interviews cannot tell you on their own' }).isVisible());
        }
        if (!javaScriptEnabled && path === '/guides/') {
          for (const card of await page.locator('[data-filter-item]').all()) assert.equal(await card.isVisible(), true, 'Guide hidden without JavaScript');
        }
        if (javaScriptEnabled && (path === '/reading-lists/customer-interviews/' || path === '/reading-lists/')) {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.screenshot({ path: `${output}/${path === '/reading-lists/' ? 'index' : 'interviews'}-${width}.png`, fullPage: true });
        }
        results.push({ path, width, javaScriptEnabled, status: 'passed' });
      }
      await context.close();
    }
  }
  writeFileSync(`${output}/results.json`, JSON.stringify({ base, checkedAt: new Date().toISOString(), checks: results }, null, 2));
  console.log(`Passed ${results.length} page/viewport/JavaScript checks at ${base}. Screenshots and results: ${output}`);
} finally { await browser.close(); }
