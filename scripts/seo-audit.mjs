import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const distDir = new URL('../dist/', import.meta.url).pathname;
const site = 'https://answerwithbooks.com';
const errors = [];
const warnings = [];

const skippedHtml = [
  /^\/google[a-z0-9]+\.html$/i,
];

if (!existsSync(distDir)) {
  fail('dist/ does not exist. Run npm run build first.');
  report(0);
}

const allFiles = walk(distDir);
const htmlFiles = allFiles.filter((file) => file.endsWith('.html'));
const sitemapUrls = collectSitemapUrls();
const indexableCanonicals = new Map();
const noindexCanonicals = new Map();
const titles = new Map();
const descriptions = new Map();

validateRobots();
validateLlmsTxt();

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const path = routePath(file);
  if (skippedHtml.some((pattern) => pattern.test(path))) continue;

  const isRedirect = /<meta\s+http-equiv=["']refresh["']/i.test(html);
  if (isRedirect) {
    if (sitemapUrls.has(urlForPath(path))) fail(`${path}: redirect page is included in sitemap`);
    continue;
  }

  const robots = meta(html, 'robots');
  const isNoindex = robots?.toLowerCase().includes('noindex') || path === '/404.html';
  const title = textBetween(html, 'title');
  const description = meta(html, 'description');
  const canonical = linkRel(html, 'canonical');
  const expectedCanonical = urlForPath(path);
  const h1Count = countMatches(html, /<h1\b/gi);
  const text = stripTags(html);
  const jsonLd = jsonLdBlocks(html, path);
  const faqBlocks = jsonLd.filter((block) => blockContainsType(block, 'FAQPage'));
  const visibleFaq = /FAQ|Q&A|What this guide answers|How this book is used|How these guides work|How the source shelf works|Questions about/i.test(text);

  requireValue(title, path, 'missing <title>');
  requireValue(description, path, 'missing meta description');
  requireValue(canonical, path, 'missing canonical link');
  requireValue(robots, path, 'missing meta robots');

  if (!isNoindex && canonical && canonical !== expectedCanonical) {
    fail(`${path}: canonical ${canonical} does not match expected ${expectedCanonical}`);
  }
  if (canonical && !canonical.startsWith(site)) fail(`${path}: canonical is not on ${site}`);
  if (h1Count !== 1) fail(`${path}: expected exactly one h1, found ${h1Count}`);
  if (!/<html\b[^>]*\blang=["']en["']/i.test(html)) fail(`${path}: html lang is not set to en`);
  if (!/<meta\b[^>]*\bname=["']viewport["']/i.test(html)) fail(`${path}: missing viewport meta tag`);

  if (!isNoindex && title && (title.length < 15 || title.length > 90)) {
    warn(path, `title length is ${title.length}; check search result readability`);
  }
  if (!isNoindex && description && (description.length < 50 || description.length > 220)) {
    warn(path, `meta description length is ${description.length}; check search result readability`);
  }

  for (const property of [
    'og:type',
    'og:site_name',
    'og:title',
    'og:description',
    'og:url',
    'og:image',
    'og:image:alt',
    'og:image:width',
    'og:image:height',
  ]) {
    requireValue(metaProperty(html, property), path, `missing ${property}`);
  }

  for (const name of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
    requireValue(meta(html, name), path, `missing ${name}`);
  }

  const ogUrl = metaProperty(html, 'og:url');
  if (ogUrl && canonical && ogUrl !== canonical) fail(`${path}: og:url does not match canonical`);
  const ogImage = metaProperty(html, 'og:image');
  const twitterImage = meta(html, 'twitter:image');
  if (ogImage && twitterImage && ogImage !== twitterImage) fail(`${path}: twitter:image does not match og:image`);
  if (ogImage) validateLocalAsset(path, ogImage, 'og:image');

  validateImages(html, path);
  validateInternalLinks(html, path);
  validateAgentFriendlyControls(html, path);

  if (!isNoindex) {
    if (jsonLd.length === 0) fail(`${path}: indexable page has no JSON-LD`);
    if (!sitemapUrls.has(canonical)) fail(`${path}: indexable canonical is missing from sitemap`);
    if (!faqBlocks.length) fail(`${path}: indexable page has no FAQPage JSON-LD`);
    if (!visibleFaq) fail(`${path}: indexable page has no visible FAQ/Q&A section`);
    indexableCanonicals.set(path, canonical);
    trackUnique(titles, title, path, 'title');
    trackUnique(descriptions, description, path, 'meta description');
  } else {
    noindexCanonicals.set(path, canonical);
    if (canonical && sitemapUrls.has(canonical)) fail(`${path}: noindex page is included in sitemap`);
  }
}

for (const sitemapUrl of sitemapUrls) {
  if (!sitemapUrl.startsWith(site)) fail(`sitemap URL is not on ${site}: ${sitemapUrl}`);
  if (!indexableCanonicals.has(pathForUrl(sitemapUrl))) {
    fail(`sitemap URL has no matching indexable HTML page: ${sitemapUrl}`);
  }
}

for (const asset of ['sitemap-index.xml', 'sitemap-0.xml', 'feed.xml', 'llms.txt', 'robots.txt']) {
  if (!existsSync(join(distDir, asset))) fail(`missing ${asset}`);
}

report(htmlFiles.length);

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

function urlForPath(path) {
  return new URL(path, site).href;
}

function pathForUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
}

function collectSitemapUrls() {
  const urls = new Set();
  for (const file of allFiles.filter((candidate) => /^sitemap.*\.xml$/.test(relative(distDir, candidate)))) {
    const xml = readFileSync(file, 'utf8');
    if (!xml.trim().startsWith('<?xml')) fail(`${relative(distDir, file)}: invalid XML prolog`);
    for (const match of xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)) {
      const loc = decode(match[1].trim());
      if (loc.endsWith('.xml')) continue;
      urls.add(loc);
    }
    if (/<priority>|<changefreq>/i.test(xml)) {
      warn(`/${relative(distDir, file)}`, 'sitemap includes priority/changefreq; Google ignores these fields');
    }
  }
  if (urls.size === 0) fail('no page URLs found in sitemap XML');
  return urls;
}

function validateRobots() {
  const path = join(distDir, 'robots.txt');
  if (!existsSync(path)) return fail('missing robots.txt');
  const body = readFileSync(path, 'utf8');
  if (!/User-agent:\s*\*/i.test(body)) fail('robots.txt: missing User-agent: *');
  if (!/Allow:\s*\//i.test(body)) fail('robots.txt: missing Allow: /');
  if (!/Sitemap:\s*https:\/\/answerwithbooks\.com\/sitemap-index\.xml/i.test(body)) {
    fail('robots.txt: missing sitemap-index.xml reference');
  }
  for (const bot of ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot']) {
    if (!new RegExp(`User-agent:\\s*${escapeRegExp(bot)}`, 'i').test(body)) {
      warn('/robots.txt', `AI crawler ${bot} is not explicitly declared`);
    }
  }
}

function validateLlmsTxt() {
  const path = join(distDir, 'llms.txt');
  if (!existsSync(path)) return fail('missing llms.txt');
  const body = readFileSync(path, 'utf8');
  for (const section of ['# Answer with Books', '## Best Entry Points', '## Guides', '## Source Books', '## Topics']) {
    if (!body.includes(section)) fail(`llms.txt: missing ${section}`);
  }
  for (const url of ['https://answerwithbooks.com/', 'https://answerwithbooks.com/answers/', 'https://answerwithbooks.com/books/']) {
    if (!body.includes(url)) fail(`llms.txt: missing ${url}`);
  }
}

function validateImages(html, path) {
  for (const img of tags(html, 'img')) {
    const alt = attr(img, 'alt');
    const ariaHidden = attr(img, 'aria-hidden') === 'true';
    const role = attr(img, 'role');
    const decorative = ariaHidden || role === 'presentation' || alt === '';
    const src = attr(img, 'src');

    if (alt === null) fail(`${path}: image missing alt attribute`);
    if (!decorative && alt && (alt.length < 6 || alt.length > 125)) {
      fail(`${path}: image alt text length is ${alt.length}`);
    }
    if (!attr(img, 'width') || !attr(img, 'height')) fail(`${path}: image missing width/height attributes`);
    if (!attr(img, 'decoding')) warn(path, `image ${src || '(missing src)'} missing decoding attribute`);
    if (src) validateLocalAsset(path, src, 'image src');
  }
}

function validateInternalLinks(html, path) {
  const knownRoutes = new Set(
    htmlFiles
      .map(routePath)
      .filter((route) => !skippedHtml.some((pattern) => pattern.test(route)))
      .map((route) => (route.endsWith('.html') ? route : route))
  );

  for (const tag of tags(html, 'a')) {
    const href = attr(tag, 'href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (/^https?:\/\//i.test(href)) {
      const parsed = new URL(href);
      if (parsed.origin !== site) continue;
      const route = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
      if (!knownRoutes.has(route) && !assetExists(route)) fail(`${path}: internal link target missing: ${href}`);
      continue;
    }
    if (!href.startsWith('/')) continue;
    const clean = href.split('#')[0].split('?')[0];
    if (!clean || clean === '/') continue;
    const route = clean.endsWith('/') || extname(clean) ? clean : `${clean}/`;
    if (!knownRoutes.has(route) && !assetExists(route)) fail(`${path}: internal link target missing: ${href}`);
  }
}

function validateAgentFriendlyControls(html, path) {
  if (/<div\b[^>]*\bonclick=/i.test(html)) fail(`${path}: div onclick found; use semantic button/link`);
  for (const button of tags(html, 'button')) {
    if (!attr(button, 'type')) fail(`${path}: button missing type attribute`);
  }
  for (const input of tags(html, 'input')) {
    const id = attr(input, 'id');
    const ariaLabel = attr(input, 'aria-label');
    const labelledBy = attr(input, 'aria-labelledby');
    const wrapped = new RegExp(`<label\\b[^>]*>[\\s\\S]*${escapeRegExp(input)}[\\s\\S]*<\\/label>`, 'i').test(html);
    if (!ariaLabel && !labelledBy && !(id && new RegExp(`<label\\b[^>]*\\bfor=["']${escapeRegExp(id)}["']`, 'i').test(html)) && !wrapped) {
      fail(`${path}: input missing accessible label`);
    }
  }
}

function validateLocalAsset(path, value, label) {
  const url = value.startsWith('http') ? new URL(value) : new URL(value, site);
  if (url.origin !== site) return;
  if (!assetExists(url.pathname)) fail(`${path}: ${label} asset missing: ${url.pathname}`);
}

function assetExists(pathname) {
  const route = pathname === '/' ? '/index.html' : pathname;
  const candidates = [
    join(distDir, route),
    join(distDir, route.replace(/\/$/, '/index.html')),
    join(distDir, route.replace(/^\//, '')),
  ];
  return candidates.some((candidate) => existsSync(candidate));
}

function trackUnique(map, value, path, label) {
  if (!value) return;
  if (!map.has(value)) {
    map.set(value, path);
    return;
  }
  fail(`${path}: duplicate ${label} also used by ${map.get(value)}`);
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

function attrFromTag(html, tagRegex, attrName) {
  const tag = html.match(tagRegex)?.[0];
  if (!tag) return '';
  return attr(tag, attrName) ?? '';
}

function tags(html, tag) {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'gi'))].map((match) => match[0]);
}

function attr(tag, attrName) {
  const match = tag.match(new RegExp(`\\b${attrName}=(["'])(.*?)\\1`, 'i'));
  return match ? decode(match[2]) : null;
}

function jsonLdBlocks(html, path) {
  const matches = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  return matches
    .map((match) => {
      try {
        const parsed = JSON.parse(decode(match[1]));
        if (!parsed['@context']) fail(`${path}: JSON-LD missing @context`);
        return parsed;
      } catch (error) {
        fail(`${path}: invalid JSON-LD (${error.message})`);
        return undefined;
      }
    })
    .filter(Boolean);
}

function blockContainsType(block, type) {
  if (!block || typeof block !== 'object') return false;
  if (block['@type'] === type) return true;
  if (Array.isArray(block['@graph'])) return block['@graph'].some((item) => blockContainsType(item, type));
  return false;
}

function stripTags(html) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  );
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

function report(checkedCount) {
  if (warnings.length > 0) {
    console.log(`SEO audit warnings (${warnings.length}):`);
    for (const warning of warnings) console.log(`- ${warning}`);
  }

  if (errors.length > 0) {
    console.error(`SEO audit failed (${errors.length}):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    `SEO audit passed: ${checkedCount} HTML files checked, ${indexableCanonicals.size} indexable pages verified, ${sitemapUrls.size} sitemap URLs verified.`
  );
}
