import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { guideCovers } from '../src/lib/guide-covers.mjs';

const dist = process.env.AWB_TEST_DIST || 'dist';
const read = route => fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
const skills = read('tools');
assert.match(skills, /Browse and hire skills on demand\./);
assert.equal((skills.match(/data-open-tool=/g) || []).length, 4);
assert.equal((skills.match(/data-tool-detail=/g) || []).length, 4);
assert.doesNotMatch(skills, /data-endpoint-tab|data-endpoint-panel|data-key-secret/);
assert.match(skills, /Paid hiring is not available yet/);
assert.equal((skills.match(/data-task-card/g) || []).length >= 4, true);
assert.doesNotMatch(skills, /A task to start with|Copy task for your agent/);
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
  assert.equal((html.match(/role="tab"/g) || []).length, 2);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 2);
  assert.match(html, /data-guide-tab="practical-ai"/);
  assert.match(html, /data-guide-tab="career-learning"/);
  assert.match(html, /Showing 1–6 of/);
  const careerCards = [...html.matchAll(/<div\b[^>]*data-filter-item[^>]*>/g)].map(match => match[0]);
  assert.equal(careerCards.filter(card => !/\bhidden(?:\s|>)/.test(card)).length, 6, 'Render only six career cards before JavaScript loads');
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
console.log(JSON.stringify({ passed: true, skills: 4, illustratedGuides: 3, navigation: 'Books, Guides, Skills', deploymentAssetsPresent: true }, null, 2));
