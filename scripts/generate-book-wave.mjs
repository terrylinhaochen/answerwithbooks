import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const phase = getArg('--phase') ?? 'all';
const requestedIds = getArg('--ids')?.split(',').map((id) => id.trim()).filter(Boolean) ?? null;
const concurrency = Number(getArg('--concurrency') ?? 2);
const researchModel = getArg('--research-model') ?? process.env.BOOK_RESEARCH_MODEL ?? 'gpt-5.5';
const draftModel = getArg('--draft-model') ?? process.env.BOOK_DRAFT_MODEL ?? 'gpt-5.5';
const manifestPath = path.join(root, 'content-engine/approved-book-wave-1.json');
const sourceBriefDir = path.join(root, 'content-engine/source-briefs');
const rawResearchDir = path.join(sourceBriefDir, 'raw');
const generationDir = path.join(root, 'content-engine/generation-runs/wave-1/books');
const publicBookDir = path.join(root, 'src/content/books');
const spec = fs.readFileSync(path.join(root, 'content-engine/CONTENT_GENERATION_SPEC.md'), 'utf8');
const style = fs.readFileSync(path.join(root, 'docs/EDITORIAL_STYLE.md'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const apiKey = openAiApiKey();

if (!['research', 'draft', 'all'].includes(phase)) {
  throw new Error('Use --phase=research, --phase=draft, or --phase=all.');
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 6) {
  throw new Error('--concurrency must be an integer from 1 to 6.');
}
if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY in the environment or the configured CrowdListen agent env file.');
}

const selectedBooks = manifest.books.filter((book) => !requestedIds || requestedIds.includes(book.id));
if (requestedIds) {
  const missing = requestedIds.filter((id) => !selectedBooks.some((book) => book.id === id));
  if (missing.length) throw new Error(`Unknown approved book ids: ${missing.join(', ')}`);
}

for (const directory of [sourceBriefDir, rawResearchDir, generationDir, publicBookDir]) {
  fs.mkdirSync(directory, { recursive: true });
}

if (phase === 'research' || phase === 'all') {
  await runPool(selectedBooks, concurrency, researchBook);
}
if (phase === 'draft' || phase === 'all') {
  await runPool(selectedBooks, concurrency, draftBook);
}

console.log(JSON.stringify({
  phase,
  books: selectedBooks.length,
  research_model: researchModel,
  draft_model: draftModel,
  source_briefs: path.relative(root, sourceBriefDir),
  generation_output: path.relative(root, generationDir),
  published_output: path.relative(root, publicBookDir),
}, null, 2));

async function researchBook(book) {
  const outputPath = path.join(sourceBriefDir, `${book.id}.md`);
  const rawPath = path.join(rawResearchDir, `${book.id}.json`);
  if (fs.existsSync(outputPath) && !process.argv.includes('--force')) {
    console.log(`[research] ${book.id}: keeping existing source brief`);
    return;
  }

  console.log(`[research] ${book.id}: searching official and primary sources`);
  const response = await createResponse({
    model: researchModel,
    reasoning: { effort: 'medium' },
    tools: [{
      type: 'web_search',
      search_context_size: 'high',
      filters: { blocked_domains: ['reddit.com', 'quora.com', 'wikipedia.org', 'blinkist.com', 'headwayapp.co'] },
    }],
    tool_choice: 'required',
    include: ['web_search_call.action.sources'],
    max_output_tokens: 16000,
    input: researchPrompt(book),
  });

  const text = extractOutputText(response).trim();
  const sources = collectSources(response);
  if (wordCount(text) < 500) throw new Error(`${book.id}: source brief is too thin (${wordCount(text)} words)`);
  if (sources.length < 2) throw new Error(`${book.id}: source brief used fewer than two inspectable web sources`);

  fs.writeFileSync(rawPath, `${JSON.stringify(response, null, 2)}\n`);
  fs.writeFileSync(outputPath, `${text}\n\n## Retrieved source record\n\n${sources.map((source) => `- [${source.title || source.url}](${source.url})`).join('\n')}\n`);
  console.log(`[research] ${book.id}: wrote ${wordCount(text)} words from ${sources.length} sources`);
}

async function draftBook(book) {
  const briefPath = path.join(sourceBriefDir, `${book.id}.md`);
  if (!fs.existsSync(briefPath)) throw new Error(`${book.id}: missing source brief; run --phase=research first`);
  const sourceBrief = fs.readFileSync(briefPath, 'utf8');
  const outputPath = path.join(generationDir, `${book.id}.md`);
  const publicPath = path.join(publicBookDir, `${book.id}.md`);
  if (fs.existsSync(publicPath) && !process.argv.includes('--force')) {
    console.log(`[draft] ${book.id}: keeping existing public digest`);
    return;
  }

  console.log(`[draft] ${book.id}: drafting publication Markdown`);
  let response = await createResponse({
    model: draftModel,
    reasoning: { effort: 'medium' },
    max_output_tokens: 16000,
    input: draftPrompt(book, sourceBrief),
  });
  let markdown = normalizeFrontmatter(cleanMarkdown(extractOutputText(response)));
  let issues = validateDraft(book, markdown);

  for (let repairAttempt = 1; issues.length && repairAttempt <= 3; repairAttempt += 1) {
    console.log(`[draft] ${book.id}: repair ${repairAttempt}/3 for ${issues.join('; ')}`);
    response = await createResponse({
      model: draftModel,
      reasoning: { effort: 'medium' },
      max_output_tokens: 16000,
      input: repairPrompt(book, sourceBrief, markdown, issues, repairAttempt),
    });
    markdown = normalizeFrontmatter(cleanMarkdown(extractOutputText(response)));
    issues = validateDraft(book, markdown);
  }

  if (issues.length) throw new Error(`${book.id}: draft failed local publication checks: ${issues.join('; ')}`);
  fs.writeFileSync(outputPath, `${markdown.trim()}\n`);
  fs.writeFileSync(publicPath, `${markdown.trim()}\n`);
  console.log(`[draft] ${book.id}: published ${wordCount(stripFrontmatter(markdown))} words`);
}

function researchPrompt(book) {
  return `Research a source brief for a self-contained digest of ${book.title} by ${book.author} (${book.year}).

This is source acquisition, not the public article. Search the web and inspect multiple pages. Prioritize the author's official site, publisher pages, research institutions connected to the authors, official excerpts or reader guides, and credible interviews in which the author explains the framework. Avoid summary-app pages, affiliate summaries, scraped PDFs, anonymous notes, Reddit, Quora, and Wikipedia.

The finished public digest must accurately explain these expected concepts:
${book.required_concepts.map((concept) => `- ${concept}`).join('\n')}

Produce a detailed Markdown source brief with these sections:

## Central argument
State the book's actual thesis and the tension it resolves.

## Mechanisms and frameworks
Explain every expected concept in enough detail for an editor to write from it. Preserve causal relationships and distinguish concepts that are often collapsed together.

## Book-grounded examples
Record only examples you can verify are in the book or official material about it. Explain what each example demonstrates. If an example cannot be verified, omit it.

## Qualifications and common misreadings
Record limitations, scope conditions, research caveats, later revisions, or ways readers commonly turn the idea into a slogan the book does not support.

## Metadata check
Confirm title, authorship, and original publication year, noting edition differences that materially affect the digest.

## Sources
Give a descriptive Markdown link for every source used and one sentence about what it supports.

Rules:
- Paraphrase. Do not copy long passages or reconstruct the book.
- Use no more than 25 quoted words from any source, and normally use no quotations.
- Do not fill gaps from generic model memory; explicitly mark anything that remains uncertain.
- The brief should be roughly 800–1,500 words and detailed enough to support a 1,200–1,800 word public digest.`;
}

function draftPrompt(book, sourceBrief) {
  return `Write the final public Answer with Books digest for ${book.title}. Return only the complete Markdown file with YAML frontmatter. Do not wrap it in a code fence and do not add commentary before or after it.

Exact frontmatter facts:
- title: ${book.title}
- author: ${book.author}
- year: ${book.year}
- tags: ${JSON.stringify(book.tags)}
- featured: false
- order: ${book.order}

The oneLiner must state the distinctive mechanism in one specific sentence. The readIf must name one concrete situation. Target a 1,500-word body and keep it between 1,300 and 1,650 words. It must be paragraph-led, with four to six idea-led H2 sections. Open by delivering the central argument. Include a compact procedure or decision rule only when it follows from the source. Integrate qualifications beside the claims they change. End naturally when the argument is complete.

Hard constraints:
- The page is the useful reading experience, not a preview or recommendation to read the book later.
- Do not invent a worked example, anecdote, case, number, quotation, or author intention.
- Use only examples verified in the source brief and attribute them to the book or named research.
- Use no external source links or citation markers in the public body.
- Use no generic sections named Core lessons, A worked example, When this lens breaks, Best paired with, Related books, Key takeaways, or Conclusion.
- Do not mention this source brief, web research, the generation process, or Answer with Books in the body.
- Use lists sparingly; paragraphs must substantially outnumber list items.
- Do not include unverified quotations. Prefer no direct quotations.

CANONICAL CONTENT SPEC:
${spec}

EDITORIAL STYLE:
${style}

SOURCE BRIEF:
${sourceBrief}`;
}

function repairPrompt(book, sourceBrief, markdown, issues, repairAttempt) {
  return `${draftPrompt(book, sourceBrief)}

The first draft below failed these publication checks:
${issues.map((issue) => `- ${issue}`).join('\n')}

Rewrite the complete file and fix every issue while preserving accurate material. This is repair attempt ${repairAttempt} of 3. If the draft is too long, cut repetition, secondary examples, throat-clearing, and restated conclusions aggressively; do not merely paraphrase them. Target 1,550 words on a length repair and keep the body at or below 1,750 words. Return only the corrected Markdown.

FIRST DRAFT:
${markdown}`;
}

async function createResponse(body, attempt = 1) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ store: false, ...body }),
  });
  if (response.ok) return response.json();

  const errorText = await response.text();
  if (attempt < 4 && [408, 409, 429, 500, 502, 503, 504].includes(response.status)) {
    const delay = 1500 * 2 ** (attempt - 1);
    console.warn(`[api] retry ${attempt} after ${response.status} in ${delay}ms`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return createResponse(body, attempt + 1);
  }
  throw new Error(`OpenAI Responses API failed: ${response.status} ${errorText}`);
}

function extractOutputText(response) {
  return (response.output ?? [])
    .filter((item) => item.type === 'message')
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text)
    .join('\n');
}

function collectSources(response) {
  const seen = new Set();
  const sources = [];
  for (const item of response.output ?? []) {
    const candidates = item.action?.sources ?? item.sources ?? [];
    for (const source of candidates) {
      const url = source.url ?? source.link;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ url, title: source.title ?? source.name ?? '' });
    }
    for (const content of item.content ?? []) {
      for (const annotation of content.annotations ?? []) {
        if (annotation.type !== 'url_citation' || !annotation.url || seen.has(annotation.url)) continue;
        seen.add(annotation.url);
        sources.push({ url: annotation.url, title: annotation.title ?? '' });
      }
    }
  }
  return sources;
}

function validateDraft(book, markdown) {
  const issues = [];
  const body = stripFrontmatter(markdown);
  const words = wordCount(body.replace(/<[^>]+>/g, ' '));
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1].trim());
  const listItems = [...body.matchAll(/^\s*(?:[-*]|\d+\.)\s+\S/gm)].length;
  const paragraphs = body.split(/\n{2,}/).filter((block) => block.trim() && !/^(?:#|[-*]\s|\d+\.)/.test(block.trim())).length;
  if (!markdown.startsWith('---\n')) issues.push('missing YAML frontmatter');
  if (!new RegExp(`title:\\s*["']?${escapeRegex(book.title)}`, 'i').test(markdown)) issues.push('title does not match manifest');
  if (!new RegExp(`year:\\s*${book.year}\\b`).test(markdown)) issues.push('year does not match manifest');
  if (words < 1200) issues.push(`only ${words} body words; minimum is 1,200`);
  if (words > 1850) issues.push(`${words} body words; maximum is 1,850`);
  if (headings.length < 4 || headings.length > 7) issues.push(`${headings.length} H2 sections; expected four to six`);
  if (listItems > paragraphs) issues.push('list items outnumber explanatory paragraphs');
  if (/TODO|TBD|lorem ipsum/i.test(markdown)) issues.push('contains placeholder text');
  if (/^##\s+(?:Core lessons|A worked example|When this lens breaks|Best paired with|Related books|Key takeaways|Conclusion)\s*$/gim.test(body)) issues.push('contains a prohibited template heading');
  if (/\b(this book will teach|read this book|read on to|you(?:'|’)ll learn|the author explores)\b/i.test(body)) issues.push('contains preview language');
  return issues;
}

async function runPool(items, size, worker) {
  let index = 0;
  const failures = [];
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++];
      try {
        await worker(item);
      } catch (error) {
        failures.push({ id: item.id, error });
        console.error(`[failed] ${item.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  await Promise.all(workers);
  if (failures.length) {
    throw new Error(`${failures.length} book${failures.length === 1 ? '' : 's'} failed: ${failures.map(({ id }) => id).join(', ')}`);
  }
}

function cleanMarkdown(value) {
  return String(value)
    .trim()
    .replace(/^```(?:markdown)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function normalizeFrontmatter(markdown) {
  let normalized = String(markdown);
  for (const key of ['oneLiner', 'readIf']) {
    normalized = normalized.replace(new RegExp(`^${key}:\\s*(.+)$`, 'm'), (_match, rawValue) => {
      let value = rawValue.trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        try {
          value = JSON.parse(value);
        } catch {
          value = value.slice(1, -1);
        }
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1).replaceAll("''", "'");
      }
      return `${key}: ${JSON.stringify(value)}`;
    });
  }
  return normalized;
}

function stripFrontmatter(markdown) {
  return String(markdown).replace(/^---\n[\s\S]*?\n---\n?/, '');
}

function wordCount(value) {
  return String(value).trim().split(/\s+/).filter(Boolean).length;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function openAiApiKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const envPaths = [
    '/Users/terry/Desktop/crowdlisten_files/platform/crowdlisten_agent/crowdlisten-agent/.env',
    '/Users/terry/Desktop/crowdlisten_files/platform/crowdlisten_deployed/frontend/.env.local',
    '/Users/terry/Desktop/crowdlisten_files/.env',
  ];
  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) continue;
    const value = fs.readFileSync(envPath, 'utf8')
      .split('\n')
      .find((line) => line.trim().startsWith('OPENAI_API_KEY='))
      ?.split('=')
      .slice(1)
      .join('=')
      .trim()
      .replace(/^["']|["']$/g, '');
    if (value) return value;
  }
  return null;
}

function getArg(name) {
  const direct = process.argv.find((value) => value.startsWith(`${name}=`));
  if (direct) return direct.split('=').slice(1).join('=');
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}
