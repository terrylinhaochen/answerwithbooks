import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { bookSkillCommand } from '../src/lib/tool-catalog.mjs';

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
  assert.equal(await page.locator('#question-first-reading .demo-catalog-title').count(), 3);

  assert.equal(await page.locator('#home-intro form').count(), 0);
  assert.equal(await page.locator('footer').getByRole('link', { name: 'Newsletter', exact: true }).getAttribute('href'), '/newsletter/');
  const install = page.locator('#skill-install-dialog');
  const installTriggers = page.locator('[data-open-skill-install]');
  assert.equal(await installTriggers.count(), 3);
  for (const trigger of await installTriggers.all()) {
    await trigger.click();
    assert.equal(await install.isVisible(), true);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
    assert.equal(await install.isVisible(), false);
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
  }
  await installTriggers.first().click();
  await install.getByRole('button', { name: 'Copy install command' }).click();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), bookSkillCommand);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('Denied for fallback test'); }; });
  await install.getByRole('button', { name: 'Copy install command' }).click();
  assert.equal(await install.getByRole('textbox', { name: 'Text to copy manually' }).inputValue(), bookSkillCommand);
  await install.getByRole('button', { name: 'Close installation' }).click();
  await installTriggers.first().click();
  await page.mouse.click(1, 1);
  assert.equal(await install.isVisible(), false);

  const upload = page.locator('#book-upload-dialog');
  const uploadTriggers = page.locator('[data-open-book-request]');
  assert.equal(await uploadTriggers.count(), 2);
  for (const trigger of await uploadTriggers.all()) {
    await trigger.click();
    assert.equal(await upload.isVisible(), true);
    assert.equal(await upload.locator('input[type=file]').getAttribute('multiple'), '');
    await upload.getByRole('button', { name: 'Close upload' }).click();
  }
  await uploadTriggers.first().click();
  await upload.locator('[data-upload-drop]').evaluate(drop => {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(new File(['Preview only'], 'The Mom Test.pdf', { type: 'application/pdf' }));
    dataTransfer.items.add(new File(['Preview only'], 'Original notes.md', { type: 'text/markdown' }));
    drop.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
  });
  assert.equal(await upload.locator('[data-upload-files] > li').count(), 2);
  assert.equal(await upload.getByRole('button', { name: 'Use library book', exact: true }).count(), 1);
  await upload.getByRole('button', { name: 'Clear files', exact: true }).click();
  assert.equal(await upload.locator('[data-upload-files] > li').count(), 0);
  await upload.getByRole('button', { name: 'Close upload' }).click();

  assert.equal(await page.locator('#install a,#install button').count(),1);
  assert.equal(await page.locator('.library-book [data-copy-public-book]').count(),0);
  assert.equal(await page.locator('.library-book .library-cover[href^="/books/"]').count(),8);

  for (const width of [1440, 390, 320]) {
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
  await page.locator('[data-auth-link]').evaluate(el => el.classList.remove('hidden'));
  assert.ok(await page.locator('.awb-brand').evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Signed-in mobile brand stays readable');
  await page.screenshot({ path: '/tmp/awb-home-cta-signed-in-320.png' });
  await page.goto('http://127.0.0.1:4321/tools/#public-shelf-install');
  await page.waitForFunction(() => document.querySelector('#public-shelf-install').open);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, order: order, desktop: true, mobile: true, carousel: true, bookLinks: true, install: 'copy, fallback, close, focus return, setup anchor', upload: 'batch drop and cached-library suggestion; not submitted' }, null, 2));
} finally {
  await browser.close();
}
