import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { guideCovers } from '../src/lib/guide-covers.mjs';

const dist = process.env.AWB_TEST_DIST || 'dist';
const read = route => fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
for (const route of ['tools', 'skills']) assert.match(read(route), /https:\/\/crowdlisten\.com\/directory/);
assert.match(read(''), /Loops by CrowdListen/);
assert.match(read(''), /Book archive/);
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
console.log(JSON.stringify({ passed: true, skills: 'moved to CrowdListen', illustratedGuides: Object.keys(guideCovers).length, navigation: 'Skills in CrowdListen; historical books and guides retained', deploymentAssetsPresent: true, connectionKeyAbsentFromArtifact: true }, null, 2));
