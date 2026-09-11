import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context = await browser.newContext(); // No pre-granted clipboard permissions.
await context.route(/https:\/\/(chatgpt\.com|claude\.ai|gemini\.google\.com|grok\.com)\//, route => route.fulfill({contentType:'text/html', body:'<textarea aria-label="Paste test"></textarea>'}));
const page = await context.newPage();
try {
  await page.goto('http://127.0.0.1:4321/books/zero-to-one/');
  const prompt = await page.locator('[data-personalize-prompt]').inputValue();
  assert.ok(prompt.includes('Zero to One') && prompt.includes('Book URL Contract'));
  await page.evaluate(() => {
    const write = navigator.clipboard.writeText.bind(navigator.clipboard);
    window.copyFinished = false;
    navigator.clipboard.writeText = async text => {
      await write(text);
      // Model an asynchronous clipboard completion; navigation must wait for it.
      await new Promise(resolve => setTimeout(resolve, 1200));
      window.copyFinished = true;
    };
  });
  const popupPromise = page.waitForEvent('popup');
  await page.locator('[data-personalize-button]').click();
  const popup = await popupPromise;
  assert.equal(await page.evaluate(() => window.copyFinished), true, 'AI tab must not open before copy completes');
  await popup.waitForLoadState('domcontentloaded');
  // Grant read only after copying, so permission overrides do not mask write behavior.
  await context.grantPermissions(['clipboard-read'], {origin:'http://127.0.0.1:4321'});
  await page.bringToFront();
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt, 'Full prompt is on the real Chrome clipboard');
  await popup.close();
  await context.clearPermissions();
  await page.reload();
  // Popup blockers must leave a usable native Open link after a successful copy.
  await page.evaluate(() => { window.open = () => null; });
  await page.locator('[data-personalize-button]').click();
  await page.waitForFunction(() => document.querySelector('[data-personalize-button]').dataset.promptCopied === 'true');
  const retryPopup = page.waitForEvent('popup');
  await page.locator('[data-personalize-button]').click();
  await (await retryPopup).close();
  await page.reload();
  await page.locator('[data-personalize-prompt]').evaluate(el => { el.closest('[data-personalize-fallback]').hidden = false; });
  const beforeCopyOnly = context.pages().length;
  await page.locator('[data-copy-reading-prompt]').click();
  await page.waitForFunction(() => document.querySelector('[data-personalize-button]').dataset.promptCopied === 'true');
  assert.equal(context.pages().length, beforeCopyOnly, 'Copy-only does not navigate');
  await context.grantPermissions(['clipboard-read'], {origin:'http://127.0.0.1:4321'});
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
  await page.reload();
  await page.evaluate(() => { navigator.clipboard.writeText = () => Promise.reject(new DOMException('Blocked', 'NotAllowedError')); });
  const pagesBefore = context.pages().length;
  await page.locator('[data-personalize-button]').click();
  await page.waitForFunction(() => document.querySelector('[data-personalize-prompt]').closest('[data-personalize-fallback]').hidden === false);
  assert.equal(context.pages().length, pagesBefore, 'Blocked copy must not open an empty AI conversation');
  assert.match(await page.locator('[data-personalize-status]').textContent(), /blocked/i);
  assert.equal(await page.locator('[data-personalize-prompt]').evaluate(el => el.selectionEnd - el.selectionStart), prompt.length);
  console.log('PASS: Chrome full clipboard content, copy-before-navigation ordering, denied-copy fallback; AI destinations mocked, no prompt submitted.');
} finally { await browser.close(); }
