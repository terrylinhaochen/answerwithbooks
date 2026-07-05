import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const distDir = new URL('../dist/', import.meta.url).pathname;
const site = 'https://answerwithbooks.com';
const errors = [];
const warnings = [];

if (!existsSync(distDir)) {
  fail('dist/ does not exist. Run npm run build first.');
  report();
}

const htmlFiles = walk(distDir).filter((file) => file.endsWith('.html'));

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const path = routePath(file);
  const isRedirect = /<meta http-equiv="refresh"/i.test(html);
  const robots = meta(html, 'robots');
  const isNoindex = robots?.includes('noindex') || path === '/404.html';

  if (isRedirect) continue;

  const title = textBetween(html, 'title');
  const description = meta(html, 'description');
  const canonical = linkRel(html, 'canonical');
  const h1Count = countMatches(html, /<h1\b/gi);
  const jsonLd = jsonLdBlocks(html, path);
  const faqBlocks = jsonLd.filter((block) => blockContainsType(block, 'FAQPage'));
  const visibleFaq = /Questions answered|Q&A|Quick Q&A|What this guide answers|How this book is used/i.test(
    stripTags(html)
  );

  requireValue(title, path, 'missing <title>');
  requireValue(description, path, 'missing meta description');
  requireValue(canonical, path, 'missing canonical link');

  if (!isNoindex && title && (title.length < 15 || title.length > 90)) {
    warn(path, `title length is ${title.length}; check search result readability`);
  }
  if (!isNoindex && description && (description.length < 50 || description.length > 220)) {
    warn(path, `meta description length is ${description.length}; check search result readability`);
  }
  if (canonical && !canonical.startsWith(site)) fail(`${path}: canonical is not on ${site}`);
  if (h1Count !== 1) fail(`${path}: expected exactly one h1, found ${h1Count}`);

  for (const property of ['og:type', 'og:site_name', 'og:title', 'og:description', 'og:url', 'og:image']) {
    requireValue(metaProperty(html, property), path, `missing ${property}`);
  }

  const faqRequired = !isNoindex && path !== '/';

  if (!isNoindex) {
    if (jsonLd.length === 0) fail(`${path}: indexable page has no JSON-LD`);
  }

  if (faqRequired) {
    if (faqBlocks.length === 0) fail(`${path}: indexable page has no FAQPage JSON-LD`);
    if (!visibleFaq) fail(`${path}: indexable page has no visible FAQ/Q&A section`);
  }
}

for (const asset of ['sitemap-index.xml', 'feed.xml', 'llms.txt']) {
  if (!existsSync(join(distDir, asset))) fail(`missing ${asset}`);
}

report();

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function routePath(file) {
  const rel = relative(distDir, file);
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.replace(/\/index\.html$/, '/')}`;
  return `/${rel}`;
}

function textBetween(html, tag) {
  return decode(html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1]?.trim() ?? '');
}

function meta(html, name) {
  return attrFromTag(html, new RegExp(`<meta\\b(?=[^>]*\\bname=["']${escapeRegExp(name)}["'])[^>]*>`, 'i'), 'content');
}

function metaProperty(html, property) {
  return attrFromTag(html, new RegExp(`<meta\\b(?=[^>]*\\bproperty=["']${escapeRegExp(property)}["'])[^>]*>`, 'i'), 'content');
}

function linkRel(html, rel) {
  return attrFromTag(html, new RegExp(`<link\\b(?=[^>]*\\brel=["']${escapeRegExp(rel)}["'])[^>]*>`, 'i'), 'href');
}

function attrFromTag(html, tagRegex, attr) {
  const tag = html.match(tagRegex)?.[0];
  if (!tag) return '';
  return decode(tag.match(new RegExp(`\\b${attr}=(["'])(.*?)\\1`, 'i'))?.[2] ?? '');
}

function jsonLdBlocks(html, path) {
  const matches = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return matches.map((match) => {
    try {
      return JSON.parse(decode(match[1]));
    } catch (error) {
      fail(`${path}: invalid JSON-LD (${error.message})`);
      return undefined;
    }
  }).filter(Boolean);
}

function blockContainsType(block, type) {
  if (!block || typeof block !== 'object') return false;
  if (block['@type'] === type) return true;
  if (Array.isArray(block['@graph'])) return block['@graph'].some((item) => blockContainsType(item, type));
  return false;
}

function stripTags(html) {
  return decode(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' '));
}

function countMatches(value, regex) {
  return [...value.matchAll(regex)].length;
}

function requireValue(value, path, message) {
  if (!value) fail(`${path}: ${message}`);
}

function fail(message) {
  errors.push(message);
}

function warn(path, message) {
  warnings.push(`${path}: ${message}`);
}

function decode(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function report() {
  if (warnings.length > 0) {
    console.log(`SEO audit warnings (${warnings.length}):`);
    for (const warning of warnings) console.log(`- ${warning}`);
  }

  if (errors.length > 0) {
    console.error(`SEO audit failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`SEO audit passed: ${htmlFiles.length} HTML files checked.`);
}
