import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { guideCovers } from '../src/lib/guide-covers.mjs';

const root = path.resolve(import.meta.dirname, '..');
const slugs = ['github-lead-research', 'x-discourse-analysis', 'audience-enrichment'];
assert.deepEqual(Object.keys(guideCovers), slugs);
const hashes = new Set();
for (const slug of slugs) {
  const cover = guideCovers[slug];
  const file = path.join(root, 'public', cover.src);
  const bytes = await fs.readFile(file);
  const { width, height, format } = await sharp(bytes).metadata();
  assert.equal(format, 'jpeg');
  assert.ok(width >= 1200 && height >= 675, `${slug}: sufficient resolution`);
  assert.ok(Math.abs(width / height - 16 / 9) < 0.01, `${slug}: 16:9 cover`);
  assert.ok(bytes.length < 450_000, `${slug}: compressed card asset`);
  hashes.add((await import('node:crypto')).createHash('sha256').update(bytes).digest('hex'));
  const titleArea = await sharp(bytes)
    .extract({ left: 0, top: 0, width: Math.floor(width * 0.43), height })
    .toBuffer();
  const stats = await sharp(titleArea).stats();
  assert.ok(stats.channels.slice(0, 3).every(channel => channel.stdev < 22), `${slug}: quiet title area`);

  const html = await fs.readFile(path.join(root, 'dist', 'guides', slug, 'index.html'), 'utf8');
  assert.equal(html.split(`data-guide-cover="${slug}"`).length - 1, 1, `${slug}: detail cover`);
  assert.ok(html.includes(`src="${cover.src}"`), `${slug}: emitted asset reference`);
  assert.ok(html.includes(cover.label), `${slug}: real HTML title`);
  assert.ok(/loading="eager"/.test(html), `${slug}: eager detail cover`);
}
assert.equal(hashes.size, 3, 'Each guide has its own illustration');
for (const catalog of ['guides', 'answers']) {
  const html = await fs.readFile(path.join(root, 'dist', catalog, 'index.html'), 'utf8');
  assert.equal((html.match(/data-guide-cover=/g) || []).length, 3, `${catalog}: all three covers`);
  for (const slug of slugs) {
    const card = html.match(new RegExp(`<a\\b[^>]*href="/guides/${slug}/"[^>]*>([\\s\\S]*?)</a>`))?.[1];
    assert.ok(card?.includes(`data-guide-cover="${slug}"`), `${catalog}: entire illustrated card linked`);
    assert.ok(!/<a\b/.test(card), `${catalog}: no nested cover links`);
    assert.ok(card.includes('alt=""') && card.includes('aria-hidden="true"'), 'Avoid duplicate accessible titles');
  }
}
for (const slug of ['meeting-notes-to-action-plan', 'customer-feedback-to-evidence', 'evidence-to-decision-memo']) {
  const html = await fs.readFile(path.join(root, 'dist/guides', slug, 'index.html'), 'utf8');
  assert.ok(!html.includes('data-guide-cover='), 'Unchanged work guides do not get broken placeholder images');
}
console.log(JSON.stringify({ passed: true, distinctCovers: 3, catalogs: 2, detailPages: 3, originalWorkGuidesPreserved: 3, imagesDecoded: true, browserTested: false }, null, 2));
