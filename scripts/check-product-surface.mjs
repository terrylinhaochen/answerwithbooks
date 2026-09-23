import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { guideCovers } from '../src/lib/guide-covers.mjs';
import { availableTools, agentOptions } from '../src/lib/tool-catalog.mjs';

const dist = process.env.AWB_TEST_DIST || 'dist';
const read = route => fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
const skills = read('tools');
assert.match(skills, /Browse and hire skills on demand\./);
const skillIds = availableTools.map(tool => tool.id);
assert.deepEqual(skillIds, ['github-leads', 'x-discourse', 'tinker-audience', 'product-feedback-analysis', 'book-answers']);
assert.deepEqual([...skills.matchAll(/data-open-tool="([^"]+)"/g)].map(match => match[1]), skillIds);
assert.deepEqual([...skills.matchAll(/data-tool-detail="([^"]+)"/g)].map(match => match[1]), skillIds);
assert.doesNotMatch(skills, /data-endpoint-tab|data-endpoint-panel/);
assert.equal((skills.match(/name="tools-agent"/g) || []).length, agentOptions.length);
const keyField = skills.match(/<input\b[^>]*data-key-secret[^>]*>/)?.[0];
assert.ok(keyField, 'Provide a masked field for the one-time personal connection key');
assert.match(keyField, /type="password"/);
assert.doesNotMatch(keyField, /\bvalue=/, 'Never include a connection key in the deployment artifact');
assert.match(skills, /<div\b[^>]*data-access-secret[^>]*\bhidden\b/);
assert.match(skills, /Paid hiring is not available yet/);
assert.equal((skills.match(/data-task-card/g) || []).length, availableTools.length);
assert.doesNotMatch(skills, /A task to start with/);
assert.equal((skills.match(/<h3\b[^>]*>Copy task for your agent<\/h3>/g) || []).length, availableTools.length);
assert.equal((skills.match(/Read the full guide/g) || []).length, availableTools.filter(tool => tool.kind === 'API').length);
for (const route of ['tools', 'books', 'guides']) {
  const html = read(route);
  const nav = html.match(/<nav\b[^>]*aria-label="Main"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, `${route}: main navigation exists`);
  assert.match(nav, />\s*Skills\s*</);
  assert.doesNotMatch(nav, />\s*Tools\s*</);
}
for (const route of ['guides', 'answers']) {
  const html = read(route);
  assert.match(html, /Curated guides to help you get started\./);
  assert.doesNotMatch(html, /New: hands-on AI tutorials|More work guides/);
  assert.doesNotMatch(html, /role="tab"|role="tabpanel"|data-guide-tab/);
  assert.equal((html.match(/<div\b[^>]*data-filter-list[^>]*>/g) || []).length, 1);
  assert.equal((html.match(/data-pagination aria-label/g) || []).length, 1);
  assert.match(html, /Showing 1–6 of/);
  assert.match(html, /data-filter-category="ai"/);
  assert.match(html, /Featured guides/);
  assert.equal((html.match(/data-featured-guide=/g) || []).length, 3);
  assert.equal((html.match(/data-guide-ai-tag/g) || []).length, 6);
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
console.log(JSON.stringify({ passed: true, skills: availableTools.length, illustratedGuides: Object.keys(guideCovers).length, navigation: 'Books, Guides, Skills', deploymentAssetsPresent: true, connectionKeyAbsentFromArtifact: true }, null, 2));
