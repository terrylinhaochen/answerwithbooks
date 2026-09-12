import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { availableTools, buildExamplePrompt } from '../src/lib/tool-catalog.mjs';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
// This test exercises the UI only: never create an account or execute research.
await page.route('**/auth/v1/token**', route => route.abort());
await page.route('**/auth/v1/signup**', route => route.abort());
await page.route('**/v1/run', route => route.abort());
try {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal((await page.goto(`${base}/tools/`)).status(), 200);
    assert.equal(await page.locator('h1').innerText(), 'Browse and hire skills on demand.');
    assert.deepEqual((await page.locator('nav[aria-label="Main"] a').allTextContents()).map(t => t.trim()), ['Books', 'Guides', 'Skills']);
    assert.equal(await page.locator('[data-open-tool]').count(), 4);
    assert.doesNotMatch(await page.locator('[data-tool-capabilities]').innerText(), /POST \/v1|CLI|One API|curl /);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: `/tmp/awb-skills-${width}.png` });

    for (const tool of availableTools) {
      const opener = page.locator(`[data-open-tool="${tool.id}"]`);
      await opener.click();
      const detail = page.locator(`[data-tool-detail="${tool.id}"]`);
      assert.ok(await detail.isVisible());
      assert.ok(await detail.getByText('What you get', { exact: true }).isVisible());
      assert.equal(await detail.getByRole('tab').count(), 0);
      assert.doesNotMatch(await detail.innerText(), /POST \/v1|curl |npm run|Endpoint Detail|Pricing not set/);
      await detail.getByRole('button', { name: 'Copy task for your agent', exact: true }).click();
      await page.waitForFunction(() => [...document.querySelectorAll('dialog[open] [data-copy-status]')].some(el => el.textContent === 'Copied.'));
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), buildExamplePrompt(tool.id));
      if (tool.id === 'github-leads') await page.screenshot({ path: `/tmp/awb-skill-detail-${width}.png` });
      await detail.getByRole('button', { name: 'Connect your agent' }).click();
      assert.ok(await page.locator('#tools-setup').isVisible());
      assert.equal(await detail.isVisible(), false);
      assert.equal(await page.locator('#tools-setup input[name="tools-agent"]').count(), 9);
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog[open]') && document.body.style.overflow !== 'hidden');
      assert.ok(await opener.evaluate(el => el === document.activeElement));
    }

    const setup = page.locator('#tools-setup');
    for (const agent of ['codex', 'claude-ai', 'grok-bot']) {
      await page.locator('#install [data-open-setup]').click();
      await setup.locator(`input[value="${agent}"]`).check();
      await setup.locator('[data-setup-next]').click();
      if (agent === 'codex') {
        await setup.locator('[data-copy-install]').click();
        await page.waitForFunction(() => document.querySelector('[data-install-status]').textContent === 'Copied.');
        assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `Set up ${base}/tools/awb-tools/SKILL.md`);
      } else if (agent === 'claude-ai') {
        assert.ok(await setup.getByRole('link', { name: 'Get Claude skill' }).isVisible());
        const response = await page.request.get(`${base}/tools/awb-tools.zip`);
        assert.equal(response.status(), 200);
        assert.ok((await response.body()).length > 100);
      } else {
        await setup.getByRole('button', { name: 'Copy Grok Bot setup', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('[data-agent-saved-skill] [data-copy-status]').textContent === 'Copied.');
        assert.match(await page.evaluate(() => navigator.clipboard.readText()), /name: awb-tools/);
      }
      await setup.locator('[data-setup-next]').click();
      assert.ok(await setup.locator('[data-tools-signup-form]').isVisible());
      assert.equal(await setup.locator('[data-key-secret]').count(), 0);
      for (const provider of ['github', 'google']) assert.ok(await setup.locator(`[data-oauth-provider="${provider}"]`).isVisible());
      await setup.locator('[data-tools-auth-mode="login"]').click();
      assert.ok(await setup.locator('[data-tools-login-form]').isVisible());
      await setup.locator('[data-tools-auth-mode="signup"]').click();
      assert.ok(await setup.locator('[data-tools-signup-form]').isVisible());
      assert.ok(await setup.locator('[data-setup-next]').isDisabled());
      await page.keyboard.press('Escape');
    }
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, skills: 4, desktopAndMobile: true, agentSetup: ['Codex', 'Claude.ai', 'Grok Bot'], clipboard: true, focusRestoration: true, accountForms: true, realSignups: 0, researchCalls: 0 }, null, 2));
} finally {
  await browser.close();
}
