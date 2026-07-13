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
    illustrations: check.illustrations,
    quote_words: check.quoteWords,
    applicability: check.applicability,
    errors: check.errors,
    warnings: check.warnings,
  })),
}, null, 2));

if (strict && failures.length > 0) {
  process.exit(1);
}

function auditBook(entry) {
  const state = baseAudit(entry, 'books');
  if (state.headings.length < 4) state.errors.push('needs at least 4 idea-led section headings');
  if (state.words < 1200) state.errors.push(`below self-contained digest minimum: ${state.words} words`);
  else if (state.words < 1300) state.warnings.push(`below the 1,500-word digest target: ${state.words} words`);
  if (state.words > 1900) state.warnings.push(`above the focused digest range: ${state.words} words`);
  if (state.paragraphs < 10) state.warnings.push('needs more paragraph-led explanation');
  if (state.quoteWords > 25) state.errors.push(`too many quoted source words: ${state.quoteWords}`);
  if (state.headings.some((heading) => /^A worked example/i.test(heading))) {
    state.warnings.push('generic worked-example section; use only a source-attributed example with a descriptive heading');
  }
  if (state.headings.includes('When this lens breaks')) state.warnings.push('template boundary section; integrate the qualification beside the claim');
  if (state.headings.includes('Best paired with')) state.warnings.push('template pairing section; keep catalog relationships in the product interface');
  if (state.headings.includes('Related books')) state.warnings.push('template related-books section; keep catalog relationships in the product interface');
  return score(state);
}

function auditAnswer(entry) {
  const state = baseAudit(entry, 'answers');
  const opening = state.body.split(/^##\s+/m)[0];
  state.applicability = {
    problem_frame: wordCount(stripMarkdown(opening)) >= 55,
    source_grounding: /\/books\//.test(state.body),
    mechanism: /\b(because|therefore|which means|the reason|causes?|creates?|changes?|turns?)\b/i.test(state.body),
    decision_rule: state.headings.some((heading) => /rule|checklist|sequence|workflow|script|template|test|audit|reset|summary/i.test(heading)) || /\b(if|when|unless)\b/i.test(state.body),
    next_move: state.headings.some((heading) => /try this|next|move|workflow|sequence|checklist|script|template|reset|practical|mechanics/i.test(heading)) || state.listItems >= 3,
  };
  if (state.words < 800) state.errors.push(`below self-contained answer minimum: ${state.words} words`);
  else if (state.words < 900) state.warnings.push(`below the answer target range: ${state.words} words`);
  if (state.words > 1500) state.warnings.push(`above the focused answer range: ${state.words} words`);
  if (state.headings.length < 4) state.errors.push('needs at least 4 idea-led section headings');
  if (state.paragraphs < 10) state.warnings.push('needs more paragraph-led explanation');
  if (state.quoteWords > 25) state.errors.push(`too many quoted source words: ${state.quoteWords}`);
  if (!state.applicability.problem_frame) state.warnings.push('opening does not establish a concrete reader problem');
  if (!state.applicability.source_grounding) state.errors.push('missing links to source-book lenses');
  if (!state.applicability.mechanism) state.errors.push('missing causal explanation or mechanism');
  if (!state.applicability.decision_rule) state.errors.push('missing a usable decision rule');
  if (!state.applicability.next_move) state.errors.push('missing an executable next move');
  if (state.headings.some((heading) => /^(When this lens breaks|Best paired with|Related books)$/i.test(heading))) {
    state.warnings.push('contains a generic template ending instead of an argument-led conclusion');
  }
  return score(state);
}

function baseAudit(entry, collection) {
  const body = stripFrontmatter(entry.markdown);
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const words = wordCount(stripMarkdown(body));
  const quoteWords = [...body.matchAll(/^>\s+(.+)$/gm)]
    .reduce((total, match) => total + wordCount(stripMarkdown(match[1])), 0);
  const listItems = [...body.matchAll(/^\s*[-*]\s+\S|^\s*\d+\.\s+\S/gm)].length;
  const illustrations = [...body.matchAll(/<figure\b[^>]*class=["'][^"']*awb-line-illustration/gi)].length;
  const paragraphs = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith('#') && !block.startsWith('- ') && !/^\d+\./.test(block) && !block.startsWith('>'))
    .length;

  const errors = [];
  const warnings = [];
  if (/TODO|TBD|lorem ipsum/i.test(body)) errors.push('contains placeholder text');
  if (listItems > paragraphs) warnings.push('list-heavy relative to paragraphs');
  if (/\b(this (?:book|answer) will teach|read (?:this|the) book|read on to|you(?:'|’)ll learn|the author explores)\b/i.test(body)) {
    warnings.push('contains preview language instead of directly delivering the insight');
  }

  return {
    id: entry.id,
    collection,
    words,
    headings,
    paragraphs,
    listItems,
    illustrations,
    quoteWords,
    errors,
    warnings,
    body,
    applicability: null,
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
    .replace(/<[^>]+>/g, ' ')
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
