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
    const collection = page.locator('[data-guide-catalog]');
    const featured = page.locator('[data-featured-guides]');
    assert.ok(await featured.isVisible());
    assert.equal(await featured.locator('[data-featured-guide]').count(), 3);
    assert.equal(await featured.locator('[data-filter-item]').count(), 0, 'Featured cards do not change catalog counts');
    assert.equal(await featured.locator('[data-guide-ai-tag]').count(), 3);
    assert.ok(await page.evaluate(() => Boolean(document.querySelector('[data-featured-guides]').compareDocumentPosition(document.querySelector('[data-guide-catalog]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    assert.equal(await featured.locator('a[href="#all-guides"]').count(), 1);
    assert.equal(await collection.locator('[role="tab"], [role="tabpanel"]').count(), 0);
    assert.equal(await collection.locator('[data-filter-list]').count(), 1);
    assert.equal(await collection.locator('[data-filter-search]').count(), 1);
    assert.equal(await collection.locator('[data-pagination]').count(), 1);
    assert.equal(await collection.locator('[data-capability-guide]').count(), 3);
    assert.doesNotMatch((await collection.locator('[data-capability-guide]').allTextContents()).join(' '), /tinker|cookbook/i);
    assert.equal(await page.getByText('Hands-on AI tutorials', { exact: true }).count(), 0);
    assert.equal(await page.locator('[data-question-invite]').count(), 1);
    assert.equal(await page.locator('[data-question-invite] a').getAttribute('href'), 'https://forms.gle/bd5By1m4Vko9sn4g6');
    assert.equal(await collection.locator('[data-filter-item]:visible').count(), 6);
    assert.equal(await collection.locator('[data-capability-guide]:visible').count(), 3);
    assert.equal(await collection.locator('div[data-filter-item]:visible').count(), 3, 'The first page includes both kinds of guide');
    for (const slug of legacy) assert.equal(await page.locator(`a[href="/guides/${slug}/"]`).count(), 0);
    for (const slug of slugs) {
      const covers = page.locator(`[data-guide-cover="${slug}"] img`);
      assert.equal(await covers.count(), 2, 'Each AI cover appears in featured and the full collection');
      for (const cover of await covers.all()) {
        await cover.scrollIntoViewIfNeeded();
        await cover.evaluate(image => image.decode());
        assert.ok(await cover.evaluate(image => image.complete && image.naturalWidth > 0));
      }
    }
    await collection.locator('[data-filter-category="ai"]').click();
    assert.equal(await collection.locator('[data-filter-count]').textContent(), '3 guides');
    assert.equal(await collection.locator('[data-filter-item]:visible').count(), 3);
    assert.equal(await collection.locator('[data-guide-ai-tag]:visible').count(), 3);
    assert.equal(await collection.locator('[data-pagination]').isVisible(), false);
    await collection.locator('[data-filter-search]').fill('audience');
    assert.equal(await collection.locator('[data-filter-item]:visible').count(), 1);
    assert.ok(await collection.locator('a[href="/guides/audience-enrichment/"]').isVisible());
    await collection.locator('[data-filter-search]').fill('');
    await collection.locator('[data-filter-category="all"]').click();
    const total = await collection.locator('[data-filter-item]').count();
    const pages = Math.ceil(total / 6);
    const visited = [];
    assert.equal(await collection.locator('[data-filter-count]').textContent(), `${total} guides`);
    for (let current = 1; current <= pages; current++) {
      const cards = collection.locator('[data-filter-item]:visible');
      assert.equal(await cards.count(), Math.min(6, total - (current - 1) * 6));
      visited.push(...await cards.evaluateAll(items => items.map(item => item.matches('a') ? item.getAttribute('href') : item.querySelector('h3 a').getAttribute('href'))));
      assert.equal(await collection.locator('[data-pagination-page]').textContent(), `Page ${current} of ${pages}`);
      if (current < pages) await collection.locator('[data-pagination-next]').click();
    }
    assert.equal(visited.length, total);
    assert.equal(new Set(visited).size, total, 'Every guide is reachable exactly once');
    assert.ok(await collection.locator('[data-pagination-next]').isDisabled());
    await collection.locator('[data-pagination-prev]').click();
    assert.equal(await collection.locator('[data-pagination-page]').textContent(), `Page ${pages - 1} of ${pages}`);
    // Every category count includes all matching guide types, not only the old answers.
    for (const button of await collection.locator('[data-filter-category]:not([data-filter-category="all"])').all()) {
      const category = await button.getAttribute('data-filter-category');
      const expected = await collection.locator('[data-filter-item]').evaluateAll((items, category) => items.filter(item => JSON.parse(item.dataset.categories).includes(category)).length, category);
      assert.equal(Number(await button.locator('.category-count').textContent()), expected);
      await button.click();
      assert.equal(await collection.locator('[data-filter-item]:visible').count(), Math.min(6, expected));
      assert.equal(await collection.locator('[data-filter-count]').textContent(), `${expected} guide${expected === 1 ? '' : 's'}`);
    }
    await collection.locator('[data-filter-category="business"]').click();
    assert.equal(await collection.locator('[data-capability-guide]:visible').count(), 3);
    await collection.locator('[data-filter-search]').fill('GitHub');
    assert.equal(await collection.locator('[data-filter-item]:visible').count(), 1);
    assert.equal(await collection.locator('[data-pagination]').isVisible(), false);
    await collection.locator('[data-filter-category="career"]').click();
    assert.equal(await collection.locator('[data-filter-item]:visible').count(), 0);
    assert.ok(await collection.locator('[data-filter-empty]').isVisible());
    await collection.locator('[data-filter-category="all"]').click();
    assert.equal(await collection.locator('[data-filter-item]:visible').count(), 1);
    await collection.locator('[data-filter-search]').fill('career');
    assert.ok(await collection.locator('div[data-filter-item]:visible').count() > 0);
    await collection.locator('[data-filter-search]').fill('no-such-guide-8fa21');
    assert.equal(await collection.locator('[data-filter-item]:visible').count(), 0);
    assert.ok(await page.locator('[data-question-invite]').isVisible());
    await collection.locator('[data-filter-search]').fill('');
    assert.equal(await collection.locator('[data-pagination-page]').textContent(), `Page 1 of ${pages}`);
    assert.ok(await page.evaluate(() => Boolean(document.querySelector('[data-filter-list]').compareDocumentPosition(document.querySelector('[data-question-invite]')) & Node.DOCUMENT_POSITION_FOLLOWING)));
    for (const anchor of ['ai-tutorials', 'practical-ai', 'career-learning']) {
      await page.goto(`${base}/${catalog}/#${anchor}`);
      assert.equal(await collection.locator('[data-filter-item]:visible').count(), 6, 'Old anchors lead to the complete catalog');
    }
  }
  await page.goto(`${base}/guides/`);
  await page.screenshot({ path: '/tmp/awb-guides-desktop.png' });
  await page.locator('[data-featured-guide="github-lead-research"]').click();
  await page.waitForURL(`${base}/guides/github-lead-research/`);
  assert.ok(await page.locator('[data-guide]').isVisible());
  await page.goto(`${base}/guides/`);
  await page.locator('[data-featured-guides] a[href="#all-guides"]').click();
  await page.locator('[data-filter-category="ai"]').click();
  await page.screenshot({ path: '/tmp/awb-guides-ai-filter.png' });
  await page.locator('[data-question-invite]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/awb-guides-question-order.png' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`${base}/guides/`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    if (width === 390) await page.screenshot({ path: '/tmp/awb-guides-mobile.png' });
    await page.locator('[data-featured-guides] a[href="#all-guides"]').click();
    await page.locator('[data-filter-category="ai"]').click();
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 3);
    if (width === 390) await page.screenshot({ path: '/tmp/awb-guides-ai-mobile.png' });
    await page.locator('[data-filter-category="all"]').click();
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 6);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('[data-guide-catalog] [data-pagination-next]').click();
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 6);
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
  const noScript = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noScript.newPage();
  await fallback.goto(`${base}/guides/`);
  assert.equal(await fallback.locator('[data-filter-list]:visible').count(), 1);
  assert.equal(await fallback.locator('[data-guide-filter]').isVisible(), false);
  assert.equal(await fallback.locator('[data-filter-item]:visible').count(), await fallback.locator('[data-filter-item]').count(), 'All guide links remain reachable without JavaScript');
  await noScript.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, newGuides: 3, originalGuidesPreserved: 3, catalogs: 2, unifiedCollection: true, featuredGuides: 3, aiCategory: true, pageSize: 6, sharedSearchAndFilters: true, questionAfterGuides: true, pagination: true, search: true, clipboard: true, reviewPersistence: true, personalization: true, desktopAndMobile: true, externalResearchExecuted: false }, null, 2));
} finally {
  await browser.close();
}
