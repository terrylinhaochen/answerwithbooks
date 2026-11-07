import {publicCover} from '../src/lib/public-cover.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { guideCovers } from '../src/lib/guide-covers.mjs';
import { availableTools } from '../src/lib/tool-catalog.mjs';

const dist = process.env.AWB_TEST_DIST || 'dist';
const read = route => fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
const skills = read('tools');
const uploadedBooks = JSON.parse(fs.readFileSync('src/lib/uploaded-books.json','utf8'));
assert.match(skills, /Turn what you read/);
assert.match(skills, /Install skill/);
assert.doesNotMatch(skills, /data-example-tab|data-example-panel|Install skill \(copy prompt\)|The Mom Test|data-local-processing/);
assert.match(skills, /Add a book/);
assert.match(skills, /shared library/);
const homepage = read('');
assert.ok(homepage.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').includes('Live a thousand lives.'));
assert.doesNotMatch(homepage, /data-personal-shelf-heading|data-shelf-date|The Mom Test/);
assert.equal((read('books').match(/data-filter-item/g)||[]).length,13);
for(const book of uploadedBooks) {
 assert.ok(read('books').includes(book.id) || book.stage !== 'ready');
 assert.ok(read('books').includes(`/print-study/${book.art}`));
 assert.ok(fs.statSync(path.join(dist,'print-study',book.art)).size > 0);
}
for(const route of ['', 'books','tools','guides']) {
 const html = read(route);
 assert.match(html,/data-print-study/);
 assert.doesNotMatch(html, /name="robots" content="noindex/);
 assert.match(html,/images\/brand\/book-fan-128.webp/);
 assert.match(html,/favicon-32.png\?v=book-fan/);
}
for(const asset of ['images/brand/book-fan-128.webp','images/brand/book-fan-256.webp','favicon.ico','favicon-32.png','favicon-48.png','apple-touch-icon.png']) {
 assert.deepEqual(fs.readFileSync(path.join(dist,asset)),fs.readFileSync(path.join('public',asset)));
}
for (const route of ['', 'books', 'tools', 'guides', 'privacy']) {
 const html = read(route);
 const ids = JSON.parse(html.match(/const ids = (\[[^;]*\]);/)?.[1] || '[]');
 assert.equal(ids.filter(id => id === 'G-FNWRC3EMV4').length, 1, `${route}: primary Google Analytics destination appears exactly once`);
 assert.equal(ids.length, new Set(ids).size, 'Analytics destinations must not duplicate pageviews');
 assert.match(html, /data-analytics-notice/, `${route}: discoverable analytics choice`);
}
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
  assert.doesNotMatch(nav, />\s*Docs\s*</);
}
assert.match(read('answers'), /http-equiv="refresh"/);
assert.match(read('answers'), /href="https:\/\/answerwithbooks\.com\/guides\/"/);
for (const route of ['guides']) {
  const html = read(route);
  assert.match(html, /See how book ideas become better questions/);
  assert.doesNotMatch(html, /New: hands-on AI tutorials|More work guides/);
  assert.doesNotMatch(html, /role="tab"|role="tabpanel"|data-guide-tab/);
  for (const marker of ['data-guide-dialog','data-guide-question','data-your-guides','data-public-guide-list','data-guide-proposal','data-guide-ready']) assert.ok(html.includes(marker), `${route}: ${marker} is present`);
  assert.match(html, /All guides/);
  assert.doesNotMatch(html, /Featured guides|From the shared library|data-guide-ai-tag/);
  for (const [slug, cover] of Object.entries(guideCovers)) {
    assert.ok(!html.includes(`href="/guides/${slug}/"`), 'Legacy guides are not in the new catalog');
    assert.ok(fs.statSync(path.join(dist, publicCover(cover.src))).size > 0, `${slug}: compatibility artwork remains`);
    assert.ok(read(`guides/${slug}`).includes(`src="${publicCover(cover.src)}"`));
  }
  for (const slug of ['meeting-notes-to-action-plan', 'customer-feedback-to-evidence', 'evidence-to-decision-memo']) {
    assert.ok(!html.includes(`href="/guides/${slug}/"`), `${route}: old tutorials removed from catalog`);
    assert.ok(read(`guides/${slug}`), 'Keep old direct links working');
  }
}
console.log(JSON.stringify({ passed: true, uploadedBooks: uploadedBooks.length, publicBookPrompts: publicPrompts.length, illustratedGuides: Object.keys(guideCovers).length, navigation: 'Books, Guides, Skills', deploymentAssetsPresent: true, connectionKeyAbsentFromArtifact: true }, null, 2));
