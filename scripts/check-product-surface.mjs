import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { guideCovers } from '../src/lib/guide-covers.mjs';
import { availableTools } from '../src/lib/tool-catalog.mjs';

const dist = process.env.AWB_TEST_DIST || 'dist';
const read = route => fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
const skills = read('tools');
assert.match(skills, /Give your agent/);
assert.equal((skills.match(/data-example-tab="\d+"/g) || []).length, 6);
assert.equal((skills.match(/data-example-panel="\d+"/g) || []).length, 6);
for (const label of ['Customer interviews', 'Better decisions', 'Habits that last', 'Focused work', 'Career moves', 'Difficult conversations']) assert.ok(skills.includes(label));
assert.doesNotMatch(skills, /data-open-tool=|data-tool-detail=|name="tools-agent"/);
assert.match(skills, /Upload a source/);
assert.match(skills, /PDF · EPUB · DOCX · Markdown · HTML · RTF · Text/);
assert.match(skills, /fuller downloadable skill package/);
const homepage = read('');
assert.match(homepage, /data-direction="table"/);
for (const marker of ['data-personalize-shelf', 'data-personal-shelf-heading', 'data-shelf-date', 'data-shelf-preferences', 'data-clear-shelf', 'data-share-shelf', 'data-copy-shelf-link', 'data-create-shelf-image']) assert.ok(homepage.includes(marker));
const sharedShelf = read('shelf');
assert.match(sharedShelf, /name="robots" content="noindex, follow"/);
assert.equal((sharedShelf.match(/data-shared-book-template=/g) || []).length, 46);
assert.ok(sharedShelf.includes('data-copy-shared-book'));
assert.doesNotMatch(read('books'), /<button\b[^>]*data-copy-public-book/);
const featured = homepage.match(/<section id="source-books"[\s\S]*?<\/section>/)?.[0];
assert.ok(featured);assert.doesNotMatch(featured, /data-copy-public-book|Open the book/);
const publicPrompts=fs.readdirSync(path.join(dist, 'book-prompts')).filter(file=>file.endsWith('.json'));
assert.equal(publicPrompts.length, 46);
for (const file of publicPrompts) {
 const payload=JSON.parse(fs.readFileSync(path.join(dist,'book-prompts',file),'utf8'));
 assert.equal(file,`${payload.slug}.json`);assert.match(payload.prompt,/BEGIN BOOK ARTIFACT/);assert.match(payload.prompt,/MY TASK/);
}
// Existing research access remains available on its dedicated account page.
assert.equal(availableTools.length,5);
const keys=read('api-keys');
const keyField = keys.match(/<input\b[^>]*data-key-secret[^>]*>/)?.[0];
assert.ok(keyField, 'Keep the masked personal connection field on the account page');
assert.match(keyField, /type="password"/);
assert.doesNotMatch(keyField, /\bvalue=/, 'Never include a connection key in the deployment artifact');
assert.match(keys, /<div\b[^>]*data-access-secret[^>]*\bhidden\b/);
for (const route of ['tools', 'books', 'guides']) {
  const html = read(route);
  const nav = html.match(/<nav\b[^>]*aria-label="Main"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, `${route}: main navigation exists`);
  assert.match(nav, />\s*Skills\s*</);
  assert.doesNotMatch(nav, />\s*Tools\s*</);
}
for (const route of ['guides', 'answers']) {
  const html = read(route);
  assert.match(html, /See how book ideas become better questions/);
  assert.doesNotMatch(html, /New: hands-on AI tutorials|More work guides/);
  assert.doesNotMatch(html, /role="tab"|role="tabpanel"|data-guide-tab/);
  assert.equal((html.match(/<div\b[^>]*data-filter-list[^>]*>/g) || []).length, 1);
  assert.equal((html.match(/data-pagination aria-label/g) || []).length, 1);
  assert.match(html, /Showing 1–6 of/);
  assert.match(html, /data-filter-category="ai"/);
  assert.match(html, /Featured guides/);
  assert.match(html, /Three ways to put book ideas to work\./);
  assert.equal((html.match(/data-guide-ai-tag/g) || []).length, Object.keys(guideCovers).length);
  const cards = [...html.matchAll(/<(?:a|div)\b[^>]*data-filter-item[^>]*>/g)].map(match => match[0]);
  assert.equal(cards.filter(card => !/\bhidden(?:\s|>)/.test(card)).length, 6, 'Render only six guides total before JavaScript loads');
  for (const [slug, cover] of Object.entries(guideCovers)) {
    assert.ok(html.includes(`href="/guides/${slug}/"`), `${route}: ${slug} is discoverable`);
    assert.ok(html.includes(`data-guide-cover="${slug}"`), `${route}: ${slug} has its cover`);
    assert.ok(fs.statSync(path.join(dist, cover.src)).size > 0, `${slug}: cover is in the deployment artifact`);
    assert.ok(read(`guides/${slug}`).includes(`src="${cover.src}"`));
  }
  for (const slug of ['meeting-notes-to-action-plan', 'customer-feedback-to-evidence', 'evidence-to-decision-memo']) {
    assert.ok(!html.includes(`href="/guides/${slug}/"`), `${route}: old tutorials removed from catalog`);
    assert.ok(read(`guides/${slug}`), 'Keep old direct links working');
  }
}
console.log(JSON.stringify({ passed: true, skillExamples: 6, publicBookPrompts: publicPrompts.length, illustratedGuides: Object.keys(guideCovers).length, navigation: 'Books, Guides, Skills', deploymentAssetsPresent: true, connectionKeyAbsentFromArtifact: true }, null, 2));
