import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, writeFileSync } from 'node:fs';
import { readingLists } from '../src/lib/reading-lists.ts';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = path => read(`dist${path}index.html`);
const sitemap = read('dist/sitemap-0.xml');
const llms = read('dist/llms.txt');
const catalog = html('/books/');
const guides = html('/guides/');
const rows = [];
const field = (body, name) => body.match(new RegExp(`^${name}:\\s*["']?(.*?)["']?\\s*$`, 'm'))?.[1];
const noindexPaths = ['/login/', '/signup/', '/your-book/', '/manage-skills/', '/profile/', '/processing/', '/billing/', '/connect-agent/'];
for (const path of noindexPaths) {
  assert.match(html(path), /name="robots"[^>]+noindex/, `${path} must remain noindex`);
  assert.ok(!sitemap.includes(`<loc>https://answerwithbooks.com${path}</loc>`), `${path} leaked into sitemap`);
}
assert.ok(!sitemap.includes('<lastmod>'), 'Do not fabricate content freshness from deployment time');
assert.ok(!sitemap.includes('<loc>https://answerwithbooks.com/answers/</loc>'), 'Duplicate guide index is in sitemap');
assert.match(html('/answers/'), /http-equiv="refresh"/, 'Legacy answers index must redirect');
assert.match(html('/answers/'), /https:\/\/answerwithbooks.com\/guides\//, 'Legacy guide index target');
for (const list of readingLists) {
  const path = `/reading-lists/${list.slug}/`;
  const page = html(path);
  assert.ok(sitemap.includes(`https://answerwithbooks.com${path}`));
  assert.ok(llms.includes(`https://answerwithbooks.com${path}`));
  for (const source of [catalog, guides, html('/reading-lists/')]) assert.ok(source.includes(`href="${path}"`), `Reading path orphaned: ${path}`);
  assert.equal((page.match(/data-reading-choice/g) || []).length, list.choices.length);
  assert.ok(page.includes(list.answer), `${path} must include its direct answer in HTML`);
  for (const choice of list.choices) {
    const bookPath = `/books/${choice.book}/`;
    assert.ok(page.includes(`href="${bookPath}"`), `${path} source link`);
    assert.ok(html(bookPath).includes(`href="${path}"`), `${bookPath} reciprocal discovery link`);
    assert.ok(page.includes(choice.limit), `${path} missing comparison limitation`);
  }
  for (const id of list.guides) {
    const guidePath = `/answers/${id}/`;
    assert.ok(page.includes(`href="${guidePath}"`));
    assert.ok(html(guidePath).includes(`href="${path}"`));
  }
  rows.push({ intent: 'book selection', queries: list.queries, canonical: `https://answerwithbooks.com${path}`, sourceDigests: list.choices.map(choice => `/books/${choice.book}/`) });
}
for (const file of readdirSync(new URL('../src/content/books/', import.meta.url)).filter(file => file.endsWith('.md'))) {
  const slug = file.slice(0, -3), path = `/books/${slug}/`, body = read(`src/content/books/${file}`), title = field(body, 'title');
  assert.ok(sitemap.includes(`https://answerwithbooks.com${path}`));
  assert.ok(catalog.includes(`href="${path}"`));
  rows.push({ intent: 'book digest', queries: [`${title} summary`, `${title} key ideas`, `when to use ${title}`], canonical: `https://answerwithbooks.com${path}`, sourceDigests: [path] });
}
for (const file of readdirSync(new URL('../src/content/answers/', import.meta.url)).filter(file => file.endsWith('.md'))) {
  const slug = file.slice(0, -3), path = `/answers/${slug}/`, body = read(`src/content/answers/${file}`);
  assert.ok(guides.includes(`href="${path}"`));
  rows.push({ intent: 'application', queries: [field(body, 'question')], canonical: `https://answerwithbooks.com${path}` });
}
const interview = html('/answers/how-to-run-user-interviews-that-do-not-lie-to-you/');
for (const label of ['Customer interview questions you can use', 'A simple interview plan and notes template', 'What interviews cannot tell you on their own']) assert.ok(interview.includes(label));
assert.match(interview, /2026-10-23T00:00:00.000Z/, 'Real content revision date');
for (const slug of ['the-crowd', 'zero-to-one']) {
  const page = html(`/books/${slug}/`);
  assert.match(page, new RegExp(`property="og:image" content="https://answerwithbooks.com/covers/${slug}\\.png"`), 'Use available PNG cover in sharing metadata');
}
if (process.argv.includes('--write-inventory')) {
  writeFileSync(new URL('../docs/search-discovery/query-inventory.json', import.meta.url), JSON.stringify({ note: 'Editorial query hypotheses, not measured search volume or ranking evidence. One canonical owner per intent; wording variants share a page.', pages: rows }, null, 2) + '\n');
}
console.log(`Search discovery passed: ${readingLists.length} reading paths, ${rows.filter(row => row.intent === 'book digest').length} public books, ${rows.filter(row => row.intent === 'application').length} application guides, private-route exclusions and canonical ownership.`);
