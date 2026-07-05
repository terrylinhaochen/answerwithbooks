import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const defaultQueuePath = path.resolve(root, '../core/research/crowdlisten-handoff-queue.json');
const queuePath = getArg('--queue') ?? defaultQueuePath;
const candidatesPath = getArg('--candidates') ?? path.join(root, 'content-engine/book-supply-candidates.json');
const outputPath = getArg('--output') ?? path.join(root, 'content-engine/content-engine-report.json');

const queue = readJson(queuePath);
const candidates = existsSync(candidatesPath) ? readJson(candidatesPath).candidates ?? [] : [];
const books = readContentCollection('books');
const answers = readContentCollection('answers');
const bookIds = new Set(books.map((book) => book.id));
const answerSlugs = new Set(answers.map((answer) => answer.id));

const assetCoverage = books.map((book) => {
  const jpg = existsSync(path.join(root, `public/covers/${book.id}.jpg`));
  const jpeg = existsSync(path.join(root, `public/covers/${book.id}.jpeg`));
  const png = existsSync(path.join(root, `public/covers/${book.id}.png`));
  const svg = existsSync(path.join(root, `public/covers/${book.id}.svg`));
  return {
    book_id: book.id,
    preferred_asset: jpg ? 'jpg' : jpeg ? 'jpeg' : png ? 'png' : svg ? 'svg' : null,
    has_model_cover: jpg || jpeg || png,
    has_fallback_cover: svg,
  };
});

const topSignals = queue.signal_opportunity?.top_signals ?? [];
const sourceRecords = queue.signal_opportunity?.source_records ?? [];
const supplyEntries = queue.signal_opportunity?.supply_ledger?.top_entries ?? [];
const answerBriefs = queue.answer_brief_candidates ?? [];
const nextRecommendations = queue.next_recommendations ?? [];
const publishedAnswerByQuestion = new Map(
  answers.map((answer) => [normalizeTitle(answer.data.question), answer])
);

const demandCoverage = topSignals.map((signal) => {
  const slug = `how-to-${signal.id}`;
  const exactPublished = publishedAnswerByQuestion.get(normalizeTitle(signal.title));
  const slugPublished = answers.find((answer) => answer.id.includes(signal.id) || answer.id === slug);
  const supply = supplyEntries.find((entry) => entry.concern_id === signal.id);
  return {
    signal_id: signal.id,
    title: signal.title,
    evidence_count: signal.evidence_count ?? 0,
    source_record_count: signal.source_record_count ?? 0,
    matched_books: supply?.matched_books ?? [],
    published_answer: exactPublished?.id ?? slugPublished?.id ?? null,
    status: exactPublished || slugPublished ? 'published' : supply ? 'ready_to_draft' : 'needs_book_match',
  };
});

const actionQueue = answerBriefs.map((brief) => {
  const expectedSlug = slugify(brief.title);
  const published = answerSlugs.has(expectedSlug)
    ? expectedSlug
    : answers.find((answer) => normalizeTitle(answer.data.question) === normalizeTitle(brief.title))?.id ?? null;
  const missingBooks = (brief.books ?? []).filter((book) => !bookIds.has(book));
  return {
    action_id: brief.id,
    title: brief.title,
    concern_id: brief.concern_id,
    format: brief.format,
    books: brief.books ?? [],
    missing_books: missingBooks,
    published_answer: published,
    status: published ? 'published' : missingBooks.length ? 'blocked_missing_books' : 'ready_to_publish',
    next_step: published
      ? 'write_back_performance_and_follow_up_questions'
      : missingBooks.length
        ? 'ingest_missing_books'
        : 'draft_or_materialize_answer',
  };
});

const bookExpansionQueue = candidates.map((candidate) => {
  const existing = bookIds.has(candidate.id);
  return {
    ...candidate,
    exists_in_shelf: existing,
    next_step: existing ? 'refresh_distillation_and_assets' : 'acquire_or_upload_source_then_ingest',
  };
});

const report = {
  generated_at: new Date().toISOString(),
  engine: 'answer-with-books-crowdlisten-loop',
  source_queue: path.relative(root, queuePath),
  context_pack_id: queue.context_pack_id,
  metrics: {
    source_records: sourceRecords.length,
    top_demand_signals: topSignals.length,
    answer_brief_candidates: answerBriefs.length,
    published_answers: answers.length,
    shelf_books: books.length,
    candidate_books: candidates.length,
    model_cover_assets: assetCoverage.filter((asset) => asset.has_model_cover).length,
    fallback_cover_assets: assetCoverage.filter((asset) => asset.has_fallback_cover).length,
  },
  loop_readiness: {
    demand_layer: sourceRecords.length > 0 ? 'ready' : 'missing_source_records',
    matching_layer: supplyEntries.length > 0 ? 'ready' : 'missing_book_matches',
    publishing_layer: answers.length > 0 ? 'ready' : 'missing_answers',
    asset_layer: assetCoverage.every((asset) => asset.has_model_cover || asset.has_fallback_cover) ? 'ready' : 'missing_covers',
    writeback_layer: 'needs_live_analytics_and_follow_up_questions',
  },
  demand_coverage: demandCoverage,
  action_queue: actionQueue,
  book_expansion_queue: bookExpansionQueue,
  next_recommendations: nextRecommendations.map((recommendation) => ({
    id: recommendation.id,
    title: recommendation.title,
    target_action_type: recommendation.target_action_type,
    required_context: recommendation.required_context ?? [],
  })),
  asset_coverage: assetCoverage,
};

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  output: path.relative(root, outputPath),
  metrics: report.metrics,
  ready_actions: actionQueue.filter((action) => action.status === 'ready_to_publish').length,
  blocked_actions: actionQueue.filter((action) => action.status.startsWith('blocked')).length,
  candidate_books: bookExpansionQueue.length,
}, null, 2));

function readContentCollection(collection) {
  const dir = path.join(root, `src/content/${collection}`);
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const id = file.replace(/\.md$/, '');
      const markdown = readFileSync(path.join(dir, file), 'utf8');
      return { id, data: parseFrontmatter(markdown) };
    });
}

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
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
  return data;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function normalizeTitle(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/^how do i /, 'how to ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(value) {
  return String(value ?? 'untitled')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 96) || 'untitled';
}

function getArg(name) {
  const arg = process.argv.find((value) => value === name || value.startsWith(`${name}=`));
  if (!arg) return null;
  if (arg.includes('=')) return arg.split('=').slice(1).join('=');
  const index = process.argv.indexOf(name);
  return process.argv[index + 1] ?? null;
}
