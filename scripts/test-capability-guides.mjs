import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4321';
const slugs = ['github-lead-research', 'x-discourse-analysis', 'audience-enrichment'];
const legacy = ['meeting-notes-to-action-plan', 'customer-feedback-to-evidence', 'evidence-to-decision-memo'];
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  for (const catalog of ['guides', 'answers']) {
    assert.equal((await page.goto(`${base}/${catalog}/`)).status(), 200);
    assert.equal(await page.locator('[data-capability-guides] > a').count(), 3);
    assert.doesNotMatch(await page.locator('[data-capability-guides]').textContent(), /tinker|cookbook/i);
    assert.equal(await page.getByText('Hands-on AI tutorials', { exact: true }).count(), 0);
    assert.equal(await page.locator('[data-question-invite]').count(), 1);
    assert.equal(await page.locator('[data-question-invite] a').getAttribute('href'), 'https://forms.gle/bd5By1m4Vko9sn4g6');
    assert.ok(await page.evaluate(() => {
      const before = (a, b) => Boolean(document.querySelector(a).compareDocumentPosition(document.querySelector(b)) & Node.DOCUMENT_POSITION_FOLLOWING);
      return before('[data-answer-filter]', '[data-capability-guides]')
        && before('[data-capability-guides]', '[data-filter-list]')
        && before('[data-filter-list]', '[data-pagination]')
        && before('[data-pagination]', '[data-question-invite]');
    }));
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 9);
    const firstPageTitle = await page.locator('[data-filter-item]:visible h3').first().textContent();
    await page.locator('[data-pagination-next]').click();
    assert.match(await page.locator('[data-pagination-page]').textContent(), /Page 2 of/);
    assert.notEqual(await page.locator('[data-filter-item]:visible h3').first().textContent(), firstPageTitle);
    await page.locator('[data-pagination-prev]').click();
    await page.locator('[data-filter-search]').fill('no-such-insight-8fa21');
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 0);
    assert.ok(await page.locator('[data-question-invite]').isVisible());
    await page.locator('[data-filter-search]').fill('');
    assert.equal(await page.getByText('More work guides', { exact: true }).count(), 0);
    for (const slug of legacy) assert.equal(await page.locator(`a[href="/guides/${slug}/"]`).count(), 0);
    for (const slug of slugs) {
      const cover = page.locator(`[data-guide-cover="${slug}"] img`);
      await cover.scrollIntoViewIfNeeded();
      await cover.evaluate(image => image.decode());
      assert.ok(await cover.evaluate(image => image.complete && image.naturalWidth > 0));
    }
  }
  await page.goto(`${base}/guides/`);
  await page.screenshot({ path: '/tmp/awb-guides-desktop.png' });
  await page.locator('[data-question-invite]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/awb-guides-question-order.png' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/guides/`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (width === 390) await page.screenshot({ path: '/tmp/awb-guides-mobile.png' });
    for (const slug of slugs) {
      assert.equal((await page.goto(`${base}/guides/${slug}/`)).status(), 200);
      assert.ok(await page.locator('[data-guide]').isVisible());
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      const practice = await page.locator('#practice-text').textContent();
      const prompt = await page.locator('#prompt-text').textContent();
      await page.locator('[data-copy-target="practice-text"]').click();
      await page.waitForFunction(() => document.querySelector('[data-copy-target="practice-text"]').textContent === 'Copied');
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), practice);
      await page.locator('[data-copy-target="prompt-text"]').click();
      await page.waitForFunction(() => document.querySelector('[data-copy-target="prompt-text"]').textContent === 'Copied');
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
      await page.locator('[data-guide-check]').first().check();
      await page.reload();
      assert.ok(await page.locator('[data-guide-check]').first().isChecked());
      const handoff = await page.locator('[data-personalize-prompt]').inputValue();
      if (slug === 'audience-enrichment') {
        assert.doesNotMatch(await page.locator('[data-reading-content]').textContent(), /tinker|cookbook|github|fireworks|\bexa\b/i);
        assert.doesNotMatch(handoff, /tinker|cookbook/i);
        assert.match(handoff, /Preserve existing client-owned owner, status, and notes/);
      }
      assert.ok(handoff.includes(prompt) && handoff.includes(practice), 'Personalize includes the complete exercise');
      // Test the real clipboard handler without opening or sending content to an AI service.
      await page.evaluate(() => { window.open = () => null; });
      await page.locator('[data-personalize-button]').click();
      await page.waitForFunction(() => document.querySelector('[data-personalize-button]').dataset.promptCopied === 'true');
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), handoff);
    }
  }
  for (const slug of legacy) assert.equal((await page.goto(`${base}/guides/${slug}/`)).status(), 200);
  await page.goto(`${base}/guides/tinker-audience-to-client-sheet/`);
  await page.waitForURL(`${base}/guides/audience-enrichment/`);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, newGuides: 3, originalGuidesPreserved: 3, catalogs: 2, questionAfterGuides: true, pagination: true, search: true, clipboard: true, reviewPersistence: true, personalization: true, desktopAndMobile: true, externalResearchExecuted: false }, null, 2));
} finally {
  await browser.close();
}
