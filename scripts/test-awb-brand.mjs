import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright';

async function htmlFiles(dir) {
  const files = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(files.map(f => f.isDirectory() ? htmlFiles(join(dir, f.name)) : f.name.endsWith('.html') ? [join(dir, f.name)] : []))).flat();
}
const files = await htmlFiles('dist');
assert.ok(files.length >= 90);
for (const path of files) {
  const html = await readFile(path, 'utf8');
  assert.ok(!/\bArda\b/i.test(html), `Old display brand: ${path}`);
}
assert.ok((await readFile('dist/feed.xml', 'utf8')).includes('<title>AWB</title>'));
assert.ok((await readFile('dist/llms.txt', 'utf8')).startsWith('# AWB'));
assert.ok((await readFile('dist/og.svg', 'utf8')).includes('>AWB</text>'));

const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  const page = await browser.newPage();
  for (const width of [1280, 390]) {
    await page.setViewportSize({width, height: 950});
    for (const path of ['/', '/books/', '/books/the-mom-test/', '/guides/', '/skills/', '/login/', '/newsletter/', '/editorial/']) {
      const response = await page.goto(`http://127.0.0.1:4321${path}`);
      assert.equal(response.status(), 200);
      assert.equal(await page.getByRole('link', {name: 'AWB home', exact: true}).innerText(), 'AWB');
      assert.ok((await page.title()).includes('AWB'));
      assert.ok((await page.locator('footer').innerText()).includes('AWB · Answer with Books'));
      assert.equal(await page.locator('meta[property="og:site_name"]').getAttribute('content'), 'AWB');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://answerwithbooks.com${path}`);
      assert.ok(!/\bArda\b/i.test(await page.locator('body').innerText()));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${width} ${path}`);
      if (path === '/') await page.screenshot({path: `/tmp/awb-brand-${width}.png`});
      if (path === '/skills/') assert.equal(await page.locator('[data-skill-command]').innerText(), 'npx answer-with-books install --skill --api');
    }
  }
  console.log(`PASS: ${files.length} built HTML files free of old display branding; 8 routes on desktop/mobile; AWB titles, metadata, feed and preview asset; existing URLs and install command preserved.`);
} finally { await browser.close(); }
