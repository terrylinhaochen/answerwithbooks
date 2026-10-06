import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto('http://127.0.0.1:4321/');
  const order = await page.locator('main .reading-room > section[id]').evaluateAll(sections => sections.map(section => section.id));
  assert.deepEqual(order, ['home-intro', 'question-first-reading', 'source-books', 'install', 'featured-answers', 'profile-tracker', 'home-faq']);
  const profile = page.locator('#profile-tracker');
  assert.ok(await page.getByRole('heading', { name: 'Have a question of your own?', exact: true }).evaluate((heading) => !!(heading.compareDocumentPosition(document.querySelector('#profile-tracker')) & Node.DOCUMENT_POSITION_FOLLOWING)));
  assert.ok(await page.locator('#home-faq h2').evaluate((heading) => !!(document.querySelector('#profile-tracker').compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING)));
  assert.equal(await profile.getByRole('link', { name: 'Open profile', exact: true }).getAttribute('href'), '/profile/');
  assert.equal(await page.getByRole('link', { name: 'Start personalization', exact: true }).count(), 0);
  for (const id of order) assert.equal(await page.locator(`#${id}`).count(), 1);
  assert.match(await page.locator('#home-intro h1').innerText(), /Turn what you read/);
  assert.equal(await page.locator('#home-intro [data-insight-carousel]').count(), 1);
  assert.equal(await page.locator('#source-books a').count() > 0, true);
  assert.equal(await page.locator('#question-first-reading article').count(), 3);

  const email = page.locator('#home-intro input[type=email]');
  await email.fill('preview@example.com');
  assert.equal(await email.inputValue(), 'preview@example.com');
  await email.clear(); // Do not submit a signup during a layout test.

  assert.equal(await page.locator('#install a,#install button').count(),1);
  assert.equal(await page.locator('.library-book [data-copy-public-book]').count(),0);
  assert.equal(await page.locator('.library-book .library-cover[href^="/books/"]').count(),8);

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 950 });
    const intro = await page.locator('#home-intro h1').boundingBox();
    const ideas = await page.locator('#ideas-for-work').boundingBox();
    if (width >= 1280) assert.ok(ideas.x > intro.x + intro.width, 'Carousel beside headline');
    else assert.ok(ideas.y > intro.y + intro.height, 'Carousel below headline on mobile');
    for (const index of [1, 2, 0]) {
      const visible = page.locator('[data-carousel-slide]:visible');
      await visible.locator(`[data-carousel-dot="${index}"]`).click();
      assert.equal(await page.locator('[data-carousel-slide]:visible').getAttribute('data-carousel-slide'), String(index));
      assert.ok(await page.locator('[data-carousel-slide]:visible').getByRole('link', { name: 'Open insight', exact: true }).getAttribute('href'));
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No horizontal overflow at ${width}px`);
    for (const id of ['install', 'profile-tracker']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/awb-home-${id}-${width}.jpg`, type: 'jpeg', quality: 70 });
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, order: order, desktop: true, mobile: true, carousel: true, bookLinks: true, signup: 'input only; not submitted' }, null, 2));
} finally {
  await browser.close();
}
