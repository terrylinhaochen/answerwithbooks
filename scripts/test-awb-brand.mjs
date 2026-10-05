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
  assert.ok(!/\b(?:Arda|AWB)\b/.test(html), `Old display brand: ${path}`);
}
assert.ok((await readFile('dist/feed.xml', 'utf8')).includes('<title>Answer with Books</title>'));
assert.ok((await readFile('dist/llms.txt', 'utf8')).startsWith('# Answer with Books'));
assert.ok((await readFile('dist/og.svg', 'utf8')).includes('>Answer with Books</text>'));

const browser = await chromium.launch({headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try {
  const page = await browser.newPage();
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({width, height: 950});
    for (const path of ['/', '/books/', '/books/the-mom-test/', '/guides/', '/tools/', '/login/', '/newsletter/', '/editorial/']) {
      const response = await page.goto(`${process.env.AWB_TEST_ORIGIN || 'http://127.0.0.1:4321'}${path}`);
      assert.equal(response.status(), 200);
      assert.equal(await page.getByRole('link', {name: 'Answer with Books home', exact: true}).innerText(), 'Answer with Books');
      assert.ok((await page.title()).includes('Answer with Books'));
      assert.ok((await page.getByRole('contentinfo').innerText()).includes('Answer with Books'));
      assert.equal(await page.locator('meta[property="og:site_name"]').getAttribute('content'), 'Answer with Books');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), `https://answerwithbooks.com${path}`);
      assert.ok(!/\b(?:Arda|AWB)\b/.test(await page.locator('body').innerText()));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow: ${width} ${path}`);
      if (path === '/') await page.screenshot({path: `/tmp/awb-brand-${width}.png`});
      if (path === '/') assert.equal(await page.locator('[data-install-command]').innerText(), 'npx answer-with-books install --skill --api');
    }
  }
  console.log(`PASS: ${files.length} built HTML files free of old display branding; 8 routes on desktop/mobile; Answer with Books titles, metadata, feed and preview asset; existing URLs and install command preserved.`);
} finally { await browser.close(); }
