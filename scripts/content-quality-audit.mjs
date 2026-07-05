import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const collectionArg = getArg('--collection') ?? 'all';
const ids = getArg('--ids')?.split(',').map((id) => id.trim()).filter(Boolean) ?? null;
const strict = process.argv.includes('--strict');

const checks = [];
if (collectionArg === 'all' || collectionArg === 'books' || collectionArg === 'book') {
  checks.push(...readCollection('books').filter(matchesIds).map(auditBook));
}
if (collectionArg === 'all' || collectionArg === 'answers' || collectionArg === 'answer') {
  checks.push(...readCollection('answers').filter(matchesIds).map(auditAnswer));
}

const failures = checks.filter((check) => check.errors.length > 0 || check.score < 80);

console.log(JSON.stringify({
  checked: checks.length,
  strict,
  failures: failures.length,
  results: checks.map((check) => ({
    id: check.id,
    collection: check.collection,
    score: check.score,
    words: check.words,
    headings: check.headings.length,
    paragraphs: check.paragraphs,
    list_items: check.listItems,
    quote_words: check.quoteWords,
    errors: check.errors,
    warnings: check.warnings,
  })),
}, null, 2));

if (strict && failures.length > 0) {
  process.exit(1);
}

function auditBook(entry) {
  const required = ['What the book is about', 'Core lessons', 'How to use it', 'When this lens breaks'];
  const state = baseAudit(entry, 'books');
  for (const heading of required) {
    if (!state.headings.includes(heading)) state.errors.push(`missing heading: ${heading}`);
  }
  if (state.words < 650) state.errors.push(`too short: ${state.words} words`);
  if (state.paragraphs < 8) state.warnings.push('needs more paragraph-led explanation');
  if (state.quoteWords > 25) state.errors.push(`too many quoted source words: ${state.quoteWords}`);
  if (!state.headings.includes('Best paired with')) state.warnings.push('missing pairing section');
  return score(state);
}

function auditAnswer(entry) {
  const state = baseAudit(entry, 'answers');
  if (state.words < 450) state.errors.push(`too short: ${state.words} words`);
  if (state.headings.length < 4) state.errors.push('needs at least 4 section headings');
  if (state.paragraphs < 6) state.warnings.push('needs more paragraph-led explanation');
  if (state.quoteWords > 25) state.errors.push(`too many quoted source words: ${state.quoteWords}`);
  return score(state);
}

function baseAudit(entry, collection) {
  const body = stripFrontmatter(entry.markdown);
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const words = wordCount(stripMarkdown(body));
  const quoteWords = [...body.matchAll(/^>\s+(.+)$/gm)]
    .reduce((total, match) => total + wordCount(stripMarkdown(match[1])), 0);
  const listItems = [...body.matchAll(/^\s*[-*]\s+\S|^\s*\d+\.\s+\S/gm)].length;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith('#') && !block.startsWith('- ') && !/^\d+\./.test(block) && !block.startsWith('>'))
    .length;

  const errors = [];
  const warnings = [];
  if (/TODO|TBD|lorem ipsum/i.test(body)) errors.push('contains placeholder text');
  if (listItems > paragraphs * 2) warnings.push('list-heavy relative to paragraphs');

  return {
    id: entry.id,
    collection,
    words,
    headings,
    paragraphs,
    listItems,
    quoteWords,
    errors,
    warnings,
  };
}

function score(state) {
  let value = 100;
  value -= state.errors.length * 18;
  value -= state.warnings.length * 6;
  if (state.quoteWords > 0 && state.quoteWords <= 25) value += 2;
  if (state.paragraphs >= 8) value += 2;
  return { ...state, score: Math.max(0, Math.min(100, value)) };
}

function readCollection(collection) {
  const dir = path.join(root, `src/content/${collection}`);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => ({
      id: file.replace(/\.md$/, ''),
      markdown: readFileSync(path.join(dir, file), 'utf8'),
    }));
}

function matchesIds(entry) {
  return !ids || ids.includes(entry.id);
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function stripMarkdown(value) {
  return String(value)
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(value) {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function getArg(name) {
  const arg = process.argv.find((value) => value === name || value.startsWith(`${name}=`));
  if (!arg) return null;
  if (arg.includes('=')) return arg.split('=').slice(1).join('=');
  const index = process.argv.indexOf(name);
  return process.argv[index + 1] ?? null;
}
