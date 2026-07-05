import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const type = getArg('--type') ?? 'all';
const ids = getArg('--ids')?.split(',').map((id) => id.trim()).filter(Boolean) ?? null;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(root, getArg('--out-dir') ?? `content-engine/generation-runs/${stamp}`);
const specPath = path.join(root, 'content-engine/CONTENT_GENERATION_SPEC.md');
const spec = readFileSync(specPath, 'utf8');

const books = readCollection('books');
const answers = readCollection('answers');
const packets = readContentPackets();
const bookById = new Map(books.map((book) => [book.id, book]));

const selectedBooks = shouldInclude('books')
  ? books.filter((book) => !ids || ids.includes(book.id))
  : [];
const selectedAnswers = shouldInclude('answers')
  ? answers.filter((answer) => !ids || ids.includes(answer.id))
  : [];

const bookPromptDir = path.join(outDir, 'books');
const answerPromptDir = path.join(outDir, 'answers');
mkdirSync(bookPromptDir, { recursive: true });
mkdirSync(answerPromptDir, { recursive: true });

const manifest = {
  generated_at: new Date().toISOString(),
  spec: path.relative(root, specPath),
  mode: 'prompt_plan',
  counts: {
    books: selectedBooks.length,
    answers: selectedAnswers.length,
  },
  outputs: {
    books: [],
    answers: [],
  },
};

for (const book of selectedBooks) {
  const promptPath = path.join(bookPromptDir, `${book.id}.md`);
  writeFileSync(promptPath, renderBookPrompt(book));
  manifest.outputs.books.push({
    id: book.id,
    title: book.data.title,
    prompt: path.relative(root, promptPath),
  });
}

for (const answer of selectedAnswers) {
  const promptPath = path.join(answerPromptDir, `${answer.id}.md`);
  writeFileSync(promptPath, renderAnswerPrompt(answer));
  manifest.outputs.answers.push({
    id: answer.id,
    question: answer.data.question,
    prompt: path.relative(root, promptPath),
  });
}

const manifestPath = path.join(outDir, 'manifest.json');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  output: path.relative(root, outDir),
  books: selectedBooks.length,
  answers: selectedAnswers.length,
  manifest: path.relative(root, manifestPath),
}, null, 2));

function renderBookPrompt(book) {
  return [
    '# Regenerate Book Distillation',
    '',
    'Use the content spec below to regenerate this book page as a complete Astro content Markdown file.',
    'Return only the final Markdown file with YAML frontmatter. Preserve the slug and core metadata unless the current copy is clearly weaker.',
    'Use paraphrase by default. Do not invent quotations.',
    '',
    '## Content Spec',
    '',
    spec,
    '',
    '## Current Book Record',
    '',
    fenced('json', JSON.stringify({
      id: book.id,
      frontmatter: book.data,
      headings: extractHeadings(book.body),
    }, null, 2)),
    '',
    '## Current Markdown Body',
    '',
    book.body.trim(),
    '',
  ].join('\n');
}

function renderAnswerPrompt(answer) {
  const sourceBooks = (answer.data.books ?? [])
    .map((bookId) => bookById.get(bookId))
    .filter(Boolean);
  const packet = packets.find((item) => item.published_output?.answer_id === answer.id) ?? null;

  return [
    '# Regenerate Answer',
    '',
    'Use the content spec below to regenerate this answer as a complete Astro content Markdown file.',
    'Return only the final Markdown file with YAML frontmatter. Preserve the slug and book links. Keep the answer practical and grounded.',
    'Use paragraphs as the default. Use lists only for scripts, checks, or steps. Do not invent quotations.',
    '',
    '## Content Spec',
    '',
    spec,
    '',
    '## Current Answer Record',
    '',
    fenced('json', JSON.stringify({
      id: answer.id,
      frontmatter: answer.data,
      headings: extractHeadings(answer.body),
      content_packet: packet,
    }, null, 2)),
    '',
    '## Source Book Context',
    '',
    sourceBooks.map((book) => [
      `### ${book.data.title}`,
      '',
      fenced('json', JSON.stringify({
        id: book.id,
        title: book.data.title,
        author: book.data.author,
        year: book.data.year,
        oneLiner: book.data.oneLiner,
        readIf: book.data.readIf,
        tags: book.data.tags,
        headings: extractHeadings(book.body),
      }, null, 2)),
      '',
      excerpt(book.body, 2400),
    ].join('\n')).join('\n\n'),
    '',
    '## Current Markdown Body',
    '',
    answer.body.trim(),
    '',
  ].join('\n');
}

function readCollection(collection) {
  const dir = path.join(root, `src/content/${collection}`);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const id = file.replace(/\.md$/, '');
      const markdown = readFileSync(path.join(dir, file), 'utf8');
      const { data, body } = parseFrontmatter(markdown);
      return { id, data, body, file: path.join(dir, file) };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function readContentPackets() {
  const dir = path.join(root, 'content-engine/content-packets');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(path.join(dir, file), 'utf8')));
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: markdown };
  const data = {};
  for (const line of match[1].split('\n')) {
    const [rawKey, ...rest] = line.split(':');
    if (!rawKey || rest.length === 0) continue;
    const key = rawKey.trim();
    const value = rest.join(':').trim();
    if (value.startsWith('[')) {
      data[key] = [...value.matchAll(/"([^"]+)"/g)].map((item) => item[1]);
    } else if (value === 'true' || value === 'false') {
      data[key] = value === 'true';
    } else if (/^\d+$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = value.replace(/^"|"$/g, '');
    }
  }
  return { data, body: match[2] };
}

function extractHeadings(body) {
  return [...String(body).matchAll(/^#{2,3}\s+(.+)$/gm)].map((match) => match[1].trim());
}

function excerpt(value, maxLength) {
  const text = String(value).trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}\n\n[Excerpt truncated for prompt budget.]`;
}

function fenced(language, value) {
  return `\`\`\`${language}\n${value}\n\`\`\``;
}

function shouldInclude(collection) {
  return type === 'all' || type === collection || type === collection.replace(/s$/, '');
}

function getArg(name) {
  const arg = process.argv.find((value) => value === name || value.startsWith(`${name}=`));
  if (!arg) return null;
  if (arg.includes('=')) return arg.split('=').slice(1).join('=');
  const index = process.argv.indexOf(name);
  return process.argv[index + 1] ?? null;
}
