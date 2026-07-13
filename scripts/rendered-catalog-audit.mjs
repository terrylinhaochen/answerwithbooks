import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const root = new URL('..', import.meta.url).pathname;
const baseUrl = getArg('--base-url') ?? 'http://127.0.0.1:4323';
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH
  ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const entries = [
  ...readEntries('books'),
  ...readEntries('answers'),
];

const browser = await chromium.launch({ headless: true, executablePath });
const failures = [];
let illustrationPages = 0;
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleErrors = [];
const pageErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => pageErrors.push(error.message));

try {
  for (const entry of entries) {
    consoleErrors.length = 0;
    pageErrors.length = 0;

    const response = await page.goto(`${baseUrl}/${entry.collection}/${entry.slug}/`, {
      waitUntil: 'load',
      timeout: 10_000,
    });
    const state = await page.evaluate((collection) => {
      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .flatMap((script) => {
          try {
            const value = JSON.parse(script.textContent || '{}');
            return Array.isArray(value) ? value : [value];
          } catch {
            return [];
          }
        });
      const schemaNodes = jsonLd.flatMap((item) => Array.isArray(item?.['@graph']) ? item['@graph'] : [item]);
      const article = schemaNodes.some((item) => {
        const types = Array.isArray(item?.['@type']) ? item['@type'] : [item?.['@type']];
        return types.includes('Article');
      });
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ?? '';
      const sourceBrief = document.querySelector('details[data-source-brief]');
      return {
        bodyLength: document.body.innerText.trim().length,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? '',
        descriptionLength: description.length,
        article,
        byline: document.querySelector('a[href="/editorial/"]')?.textContent?.trim() ?? '',
        sourceBriefOpen: sourceBrief?.open ?? null,
        illustration: Boolean(document.querySelector('.awb-line-illustration, .digest-illustration')),
        errorOverlay: Boolean(document.querySelector('.vite-error-overlay, #webpack-dev-server-client-overlay')),
        containsPlaceholder: [...document.body.querySelectorAll('*')].some((element) => {
          if (element.children.length > 0) return false;
          return /^(?:undefined|null|nan|\[object object])$/i.test(element.textContent?.trim() ?? '');
        }),
        collection,
      };
    }, entry.collection);

    const entryFailures = [];
    if (response?.status() !== 200) entryFailures.push(`HTTP ${response?.status() ?? 'no response'}`);
    if (state.bodyLength < 3000) entryFailures.push(`rendered body too short: ${state.bodyLength} characters`);
    if (!state.h1) entryFailures.push('missing h1');
    if (!state.canonical) entryFailures.push('missing canonical');
    if (state.descriptionLength < 80 || state.descriptionLength > 200) {
      entryFailures.push(`meta description length ${state.descriptionLength}`);
    }
    if (!state.article) entryFailures.push('missing Article JSON-LD');
    if (state.byline !== 'Answer with Books') entryFailures.push('missing linked Answer with Books byline');
    if (entry.collection === 'answers' && state.sourceBriefOpen !== true) {
      entryFailures.push('source brief is not expanded by default');
    }
    if (entry.hasIllustration && !state.illustration) entryFailures.push('source illustration did not render');
    if (state.errorOverlay) entryFailures.push('framework error overlay present');
    if (state.containsPlaceholder) entryFailures.push('rendered runtime placeholder text');
    if (consoleErrors.length) entryFailures.push(`console errors: ${consoleErrors.join(' | ')}`);
    if (pageErrors.length) entryFailures.push(`page errors: ${pageErrors.join(' | ')}`);
    if (state.illustration) illustrationPages += 1;

    if (entryFailures.length) failures.push({ id: entry.slug, collection: entry.collection, errors: entryFailures });
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(JSON.stringify({ checked: entries.length, failures }, null, 2));
  process.exit(1);
}

console.log(`Rendered catalog audit passed: ${entries.length} pages checked (${illustrationPages} with rendered line illustrations).`);

function readEntries(collection) {
  const directory = join(root, 'src', 'content', collection);
  return readdirSync(directory)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const source = readFileSync(join(directory, file), 'utf8');
      return {
        collection,
        slug: file.replace(/\.md$/, ''),
        hasIllustration: /<figure\b/i.test(source),
      };
    });
}

function getArg(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}
