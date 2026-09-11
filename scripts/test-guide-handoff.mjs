import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

const browser = await chromium.launch({headless:true, executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const context = await browser.newContext({permissions:['clipboard-read','clipboard-write']});
// Verify destinations without submitting a prompt to an external service.
await context.route(/https:\/\/(chatgpt\.com|claude\.ai|gemini\.google\.com|grok\.com)\//, route => route.fulfill({body:'Mock AI destination'}));
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  for (const slug of ['the-crowd','the-mom-test']) {
    const body = fs.readFileSync(`src/content/books/${slug}.md`, 'utf8').replace(/^---\s*\n[\s\S]*?\n---\s*\n/,'').trim();
    let awbPrompt;
    for (const [base, prefix] of [['http://127.0.0.1:4321','books'],['http://127.0.0.1:1313','reading']]) {
      await page.goto(`${base}/${prefix}/${slug}/`);
      const root = page.locator('[data-book-personalizer]');
      const prompt = await root.locator('[data-personalize-prompt]').inputValue();
      assert.ok(prompt.includes(`Book digest: https://answerwithbooks.com/books/${slug}/`));
      assert.ok(prompt.includes(body), 'The complete available AWB guide must be included');
      assert.ok(prompt.includes('Book URL Contract (self-contained)'));
      assert.ok(!prompt.includes('${digest}'));
      assert.ok(!prompt.includes('ask me to paste it'));
      if (prefix === 'books') awbPrompt = prompt;
      else assert.equal(prompt.trim(), awbPrompt.trim(), 'Shared books use the identical reading payload on both sites');
      for (const provider of ['chatgpt','claude','gemini','grok']) {
        await root.locator(`[data-ai-provider=${provider}]`).click();
        const action = root.locator('[data-personalize-button]');
        assert.equal(new URL(await action.getAttribute('href')).search, '', 'Do not leak or truncate full guides through URL queries');
        const popupPromise = context.waitForEvent('page');
        await action.click();
        const popup = await popupPromise;
        await popup.waitForLoadState();
        await popup.close();
        await page.waitForFunction(() => document.querySelector('[data-personalize-status]').textContent.includes('copied'));
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), prompt);
      }
      for (const width of [1280,390]) {
        await page.setViewportSize({width,height:900});
        await root.scrollIntoViewIfNeeded();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
    }
  }
  await page.goto('http://127.0.0.1:4321/books/the-crowd/');
  await page.evaluate(() => Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(Error('Blocked'))},configurable:true}));
  const popupPromise = context.waitForEvent('page');
  await page.locator('[data-personalize-button]').click();
  await (await popupPromise).close();
  await page.waitForFunction(() => document.querySelector('[data-personalize-prompt]').closest('details').open);
  assert.ok(await page.getByLabel('Personalized reading prompt').isVisible());
  assert.ok(await page.getByLabel('Personalized reading prompt').evaluate(el => el.selectionEnd === el.value.length));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,books:2,sites:2,providers:4,completeSourceIncluded:true,canonicalAWBSource:true,clipboard:true,blockedClipboardFallback:true,mobile:true,externalAI:'mocked; no real AI response tested'},null,2));
} finally {
  await browser.close();
}
