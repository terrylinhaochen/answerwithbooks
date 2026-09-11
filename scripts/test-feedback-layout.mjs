import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const routes = [
  '/books/the-mom-test/',
  '/answers/how-to-fix-user-interviews-that-are-not-teaching-you-anything/',
  '/guides/meeting-notes-to-action-plan/',
];
let responseStatus = 201;
let payload;
await page.route('**/rest/v1/content_feedback', async route => {
  payload = route.request().postDataJSON();
  await route.fulfill({ status: responseStatus, contentType: 'application/json', body: responseStatus === 201 ? '{}' : '{"message":"Test failure"}' });
});

try {
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    for (const path of routes) {
      await page.goto('http://127.0.0.1:4321' + path);
      const root = page.locator('[data-content-feedback]');
      const input = root.getByRole('textbox', { name: 'What was useful or missing?', exact: true });
      const yes = root.getByRole('button', { name: 'Yes', exact: true });
      const notYet = root.getByRole('button', { name: 'Not yet', exact: true });
      const submit = root.locator('[data-feedback-submit]');
      assert.equal(await submit.isDisabled(), true);
      await root.scrollIntoViewIfNeeded();
      const box = await input.boundingBox();
      const options = await root.getByRole('group').boundingBox();
      const action = await submit.boundingBox();
      assert.ok(options.y >= box.y + box.height, 'Choices below input');
      assert.ok(Math.abs(options.x - box.x) <= 1, 'Choices left aligned with input');
      assert.ok(Math.abs(action.x + action.width - box.x - box.width) <= 1, 'Submit right aligned with input');
      if (width === 1280) assert.ok(Math.abs(options.y - action.y) <= 2, 'Desktop controls share a row');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      if (path === routes[0]) await page.screenshot({ path: `/tmp/awb-feedback-${width}.jpg`, type: 'jpeg', quality: 75 });
      await yes.click();
      assert.equal(await yes.getAttribute('aria-pressed'), 'true');
      assert.equal(await submit.isEnabled(), true);
      await notYet.click();
      assert.equal(await yes.getAttribute('aria-pressed'), 'false');
      assert.equal(await notYet.getAttribute('aria-pressed'), 'true');
      await input.fill('The next step could be clearer.');
      responseStatus = 503;
      await submit.click();
      await root.getByRole('status').filter({ hasText: 'Please try again' }).waitFor();
      assert.equal(await input.inputValue(), 'The next step could be clearer.');
      responseStatus = 201;
      await submit.click();
      await root.getByRole('status').filter({ hasText: 'Thank you' }).waitFor();
      assert.equal(payload.sentiment, 'not_helpful');
      assert.equal(payload.comment, 'The next step could be clearer.');
      assert.equal(payload.source_path, path);
      assert.equal(await submit.isDisabled(), true);
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, routes: routes.length, widths: [1280, 390, 320], belowInput: true, alignment: true, selection: true, retry: true, submit: 'Mocked; no live feedback submitted' }, null, 2));
} finally {
  await browser.close();
}
