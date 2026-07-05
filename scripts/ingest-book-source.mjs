import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const candidateId = getArg('--candidate') ?? getArg('--book-id');
const sourcePath = getArg('--source');
const titleArg = getArg('--title');
const authorArg = getArg('--author');

if (!candidateId || !sourcePath) {
  console.error('usage: npm run engine:ingest -- --candidate book-id --source /path/to/source.pdf [--title "Title" --author "Author"]');
  process.exit(1);
}

const sourceAbsolute = path.resolve(sourcePath);
if (!existsSync(sourceAbsolute)) {
  console.error(`source file not found: ${sourceAbsolute}`);
  process.exit(1);
}

const candidatesPath = path.join(root, 'content-engine/book-supply-candidates.json');
const candidates = existsSync(candidatesPath) ? readJson(candidatesPath).candidates ?? [] : [];
const candidate = candidates.find((item) => item.id === candidateId) ?? {};
const book = {
  id: candidateId,
  title: titleArg ?? candidate.title ?? candidateId,
  author: authorArg ?? candidate.author ?? 'Unknown author',
  reason: candidate.reason ?? 'Manual ingestion request.',
  demand_links: candidate.demand_links ?? [],
};

const sourceBuffer = readFileSync(sourceAbsolute);
const sourceHash = createHash('sha256').update(sourceBuffer).digest('hex');
const extension = path.extname(sourceAbsolute).toLowerCase();
const coreTextDir = path.resolve(root, '../core/research/book-text');
const textOutputPath = path.join(coreTextDir, `${book.id}.txt`);

const extraction = extractText(sourceAbsolute, extension, textOutputPath);
const extractedText = readFileSync(textOutputPath, 'utf8');
const wordCount = extractedText.trim().split(/\s+/).filter(Boolean).length;

const job = {
  id: `ingest-${book.id}`,
  created_at: new Date().toISOString(),
  status: 'text_extracted',
  book,
  source: {
    path: sourceAbsolute,
    sha256: sourceHash,
    extension: extension.replace('.', ''),
    bytes: sourceBuffer.byteLength,
  },
  extraction: {
    text_path: path.relative(root, textOutputPath),
    word_count: wordCount,
    pages: extraction.pages ?? null,
    extractor: extraction.extractor,
  },
  next_steps: [
    'distill_public_book_page',
    'extract_frameworks_and_memorable_ideas',
    'match_against_crowdlisten_demand',
    'run_cover_generation',
    'create_answer_candidates',
    'write_back_ingestion_status',
  ],
};

const jobPath = path.join(root, `content-engine/ingestion-jobs/${book.id}.json`);
const draftPath = path.join(root, `content-engine/book-drafts/${book.id}.md`);
mkdirSync(path.dirname(jobPath), { recursive: true });
mkdirSync(path.dirname(draftPath), { recursive: true });
writeFileSync(jobPath, `${JSON.stringify(job, null, 2)}\n`);
writeFileSync(draftPath, renderBookDraft(book, job));

console.log(JSON.stringify({
  job: path.relative(root, jobPath),
  text: path.relative(root, textOutputPath),
  draft: path.relative(root, draftPath),
  word_count: wordCount,
  pages: extraction.pages ?? null,
}, null, 2));

function extractText(source, extension, output) {
  mkdirSync(path.dirname(output), { recursive: true });
  if (extension === '.txt' || extension === '.md') {
    writeFileSync(output, readFileSync(source, 'utf8'));
    return { extractor: 'direct_text_copy' };
  }
  if (extension === '.pdf') {
    const python = bundledPython();
    const result = spawnSync(python, [path.join(root, 'scripts/extract-pdf-text.py'), source, output], {
      encoding: 'utf8',
    });
    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
      process.exit(result.status ?? 1);
    }
    const parsed = JSON.parse(result.stdout.trim());
    return { extractor: 'pypdf', pages: parsed.pages };
  }
  console.error(`unsupported source extension "${extension}". Use .pdf, .txt, or .md.`);
  process.exit(1);
}

function bundledPython() {
  const bundled = '/Users/terry/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
  return existsSync(bundled) ? bundled : 'python3';
}

function renderBookDraft(book, job) {
  const tags = inferTags(book).map((tag) => `"${tag}"`).join(', ');
  return `---
title: "${escapeYaml(book.title)}"
author: "${escapeYaml(book.author)}"
year: 0
oneLiner: "TODO: Distill the main promise of this book in one sentence."
readIf: "TODO: Describe the demand situation where this book should be used."
tags: [${tags}]
featured: false
order: 99
---

## Engine Context

Ingestion job: \`${job.id}\`
Source text: \`${job.extraction.text_path}\`
Demand links: ${book.demand_links.length ? book.demand_links.map((link) => `\`${link}\``).join(', ') : 'TODO'}

Why this book is in the queue: ${book.reason}

## Core lessons

TODO: Extract the 3-6 ideas that become reusable lenses.

## Key frameworks

TODO: Extract practical frameworks, checklists, decision rules, and failure modes.

## When to reach for this book

TODO: Connect this book to concrete CrowdListen demand situations.

## Memorable ideas and lines

TODO: Add verified notes or short excerpts only after source review.
`;
}

function inferTags(book) {
  const text = `${book.title} ${book.reason} ${book.demand_links.join(' ')}`.toLowerCase();
  const tags = [];
  if (/position|gtm|market|strategy|growth|business|channel|buying/.test(text)) tags.push('business');
  if (/user|customer|product|jobs/.test(text)) tags.push('product');
  if (/career|skill/.test(text)) tags.push('career');
  if (/decision|judgment|intent/.test(text)) tags.push('decision-making');
  return tags.length ? tags : ['business'];
}

function escapeYaml(value) {
  return String(value ?? '').replaceAll('"', '\\"');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function getArg(name) {
  const arg = process.argv.find((value) => value === name || value.startsWith(`${name}=`));
  if (!arg) return null;
  if (arg.includes('=')) return arg.split('=').slice(1).join('=');
  const index = process.argv.indexOf(name);
  return process.argv[index + 1] ?? null;
}
