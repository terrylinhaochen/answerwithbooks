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
    const practical = page.getByRole('tabpanel', { name: 'Practical AI', exact: true });
    const career = page.getByRole('tabpanel', { name: 'Career & Learning', exact: true });
    assert.ok(await practical.isVisible());
    assert.equal(await career.isVisible(), false);
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 3);
    assert.equal(await practical.locator('[data-pagination]').isVisible(), false);
    await practical.locator('[data-filter-category="marketing"]').click();
    assert.equal(await practical.locator('[data-filter-item]:visible').count(), 1);
    await practical.locator('[data-filter-search]').fill('GitHub');
    assert.equal(await practical.locator('[data-filter-item]:visible').count(), 0);
    assert.ok(await practical.locator('[data-filter-empty]').isVisible());
    await practical.locator('[data-filter-category="all"]').click();
    assert.equal(await practical.locator('[data-filter-item]:visible').count(), 1);
    await practical.locator('[data-filter-search]').fill('');
    assert.equal(await page.getByText('More work guides', { exact: true }).count(), 0);
    for (const slug of legacy) assert.equal(await page.locator(`a[href="/guides/${slug}/"]`).count(), 0);
    for (const slug of slugs) {
      const cover = page.locator(`[data-guide-cover="${slug}"] img`);
      await cover.scrollIntoViewIfNeeded();
      await cover.evaluate(image => image.decode());
      assert.ok(await cover.evaluate(image => image.complete && image.naturalWidth > 0));
    }
    await page.getByRole('tab', { name: 'Career & Learning', exact: true }).click();
    assert.equal(await practical.isVisible(), false);
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 6);
    const total = await career.locator('[data-filter-item]').count();
    const pages = Math.ceil(total / 6);
    const visited = [];
    for (let current = 1; current <= pages; current++) {
      const cards = career.locator('[data-filter-item]:visible');
      assert.equal(await cards.count(), Math.min(6, total - (current - 1) * 6));
      visited.push(...await cards.locator('h3 a').evaluateAll(links => links.map(link => link.getAttribute('href'))));
      assert.equal(await career.locator('[data-pagination-page]').textContent(), `Page ${current} of ${pages}`);
      if (current < pages) await career.locator('[data-pagination-next]').click();
    }
    assert.equal(new Set(visited).size, total, 'Every guide is reachable exactly once');
    assert.ok(await career.locator('[data-pagination-next]').isDisabled());
    await career.locator('[data-filter-category="career"]').click();
    assert.equal(await career.locator('[data-filter-item]:visible').count(), 2);
    assert.equal(await career.locator('[data-pagination]').isVisible(), false);
    await career.locator('[data-filter-category="business"]').click();
    await career.locator('[data-pagination-next]').click();
    const position = await career.locator('[data-pagination-page]').textContent();
    const careerTitles = await career.locator('[data-filter-item]:visible h3').allTextContents();
    await page.getByRole('tab', { name: 'Practical AI', exact: true }).click();
    await practical.locator('[data-filter-search]').fill('GitHub');
    await page.getByRole('tab', { name: 'Career & Learning', exact: true }).click();
    assert.equal(await career.locator('[data-pagination-page]').textContent(), position);
    assert.deepEqual(await career.locator('[data-filter-item]:visible h3').allTextContents(), careerTitles);
    await career.locator('[data-filter-search]').fill('no-such-insight-8fa21');
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 0);
    assert.ok(await career.locator('[data-filter-empty]').isVisible());
    assert.ok(await page.locator('[data-question-invite]').isVisible());
    const activeTab = page.getByRole('tab', { name: 'Career & Learning', exact: true });
    await activeTab.focus();
    await page.keyboard.press('ArrowLeft');
    assert.ok(await practical.isVisible());
    assert.equal(await practical.locator('[data-filter-search]').inputValue(), 'GitHub');
    await page.keyboard.press('End');
    assert.ok(await career.isVisible());
    await page.reload();
    assert.ok(await career.isVisible(), 'Reload restores the selected tab');
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 6);
    if (catalog === 'guides') await page.screenshot({ path: '/tmp/awb-guides-career.png' });
    assert.ok(await page.evaluate(() => [...document.querySelectorAll('[data-guide-panel]')].every(panel => Boolean(panel.compareDocumentPosition(document.querySelector('[data-question-invite]')) & Node.DOCUMENT_POSITION_FOLLOWING))));
    await page.goto(`${base}/${catalog}/#ai-tutorials`);
    assert.ok(await practical.isVisible(), 'Old practical-guide anchors still work');
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
    await page.getByRole('tab', { name: 'Career & Learning', exact: true }).click();
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 6);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('#career-learning [data-pagination-next]').click();
    assert.equal(await page.locator('[data-filter-item]:visible').count(), 6);
    await page.getByRole('tab', { name: 'Practical AI', exact: true }).click();
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
  assert.equal(await fallback.locator('[data-guide-panel]:visible').count(), 2);
  assert.equal(await fallback.locator('[data-guide-tabs]').isVisible(), false);
  assert.equal(await fallback.locator('[data-filter-item]:visible').count(), await fallback.locator('[data-filter-item]').count(), 'All guide links remain reachable without JavaScript');
  await noScript.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, newGuides: 3, originalGuidesPreserved: 3, catalogs: 2, separateTabs: true, pageSize: 6, independentFiltersAndPageState: true, keyboardTabs: true, questionAfterGuides: true, pagination: true, search: true, clipboard: true, reviewPersistence: true, personalization: true, desktopAndMobile: true, externalResearchExecuted: false }, null, 2));
} finally {
  await browser.close();
}
