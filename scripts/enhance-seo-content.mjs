import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const booksDir = path.join(root, 'src/content/books');
const answersDir = path.join(root, 'src/content/answers');

const books = readCollection(booksDir);
const answers = readCollection(answersDir);
const bookById = new Map(books.map((book) => [book.id, book]));
const answersByBook = new Map();
for (const answer of answers) {
  for (const book of answer.data.books ?? []) {
    const list = answersByBook.get(book) ?? [];
    list.push(answer);
    answersByBook.set(book, list);
  }
}

let changed = 0;
for (const book of books) {
  const body = cleanLongQuotes(book.body, book);
  const enhanced = enhanceBook(book, body);
  if (enhanced !== book.body) {
    writeEntry(book, enhanced);
    changed += 1;
  }
}

for (const answer of answers) {
  const enhanced = enhanceAnswer(answer, answer.body);
  if (enhanced !== answer.body) {
    writeEntry(answer, enhanced);
    changed += 1;
  }
}

console.log(`Enhanced ${changed} content files.`);

function enhanceBook(book, originalBody) {
  let body = originalBody.trim();
  const relatedAnswers = answersByBook.get(book.id) ?? [];
  const paired = books
    .filter((candidate) => candidate.id !== book.id)
    .map((candidate) => ({
      book: candidate,
      score: (candidate.data.tags ?? []).filter((tag) => (book.data.tags ?? []).includes(tag)).length,
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.book.data.order - b.book.data.order)
    .slice(0, 2)
    .map((item) => item.book);

  if (!hasHeading(body, 'What the book is about')) {
    body = [
      `## What the book is about`,
      '',
      `${book.data.title} is useful on Answer with Books because it turns a broad area of ${topicPhrase(book)} into a concrete way to think. ${book.data.oneLiner}`,
      '',
      `The public page should not work like a compressed chapter summary. Its job is to preserve the usable judgment: when the book helps, what kind of problem it clarifies, and what mistake it prevents a reader from making. In this case, the book is most relevant when ${lowerFirst(book.data.readIf)}`,
      '',
      `${book.data.author}'s contribution is treated here as a source lens. A reader does not need to remember every argument in the book to use it; they need a few stable moves they can recognize when a real decision, conversation, plan, or workflow starts to wobble.`,
      '',
      body,
    ].join('\n');
  }

  if (!hasHeading(body, 'How to use it')) {
    body = [
      body,
      '',
      `## How to use it`,
      '',
      `Start with the situation, not the book title. Ask what is actually hard right now: a decision, a habit, a conversation, a plan, a metric, or a product question. Then use ${book.data.title} as a lens for the part of the situation that keeps repeating.`,
      '',
      `A practical use of this book has three steps. First, name the current pattern in plain language. Second, choose the idea from the book that explains why the pattern persists. Third, make the next move small enough that reality can answer back. The value is not that the book sounds wise; the value is that it changes what you do next.`,
      '',
      relatedAnswers.length
        ? `On this site, the book is connected to questions such as ${relatedAnswers.slice(0, 3).map((answer) => `"${answer.data.question}"`).join(', ')}. Those links are the best way to see the lens in use: the book becomes practical when it is attached to a real problem.`
        : `On this site, the book remains available as source material for future questions. When a reader asks something close to ${topicPhrase(book)}, this page gives the agent and the reader a clean place to start.`,
    ].join('\n');
  }

  if (!hasHeading(body, 'When this lens breaks')) {
    body = [
      body,
      '',
      `## When this lens breaks`,
      '',
      `The lens breaks when it is treated as a universal rule. ${book.data.title} is strongest for ${topicPhrase(book)}, but it should not replace direct evidence from the situation in front of you. A book can sharpen judgment; it cannot remove the need to inspect the actual constraints.`,
      '',
      `It also breaks when the reader uses the language of the book as decoration. If the idea does not change the next question, the next test, or the next conversation, it has become vocabulary rather than judgment. The standard for this shelf is practical transfer: can the idea help someone make a better move today?`,
    ].join('\n');
  }

  if (!hasHeading(body, 'Best paired with')) {
    const pairText = paired.length
      ? paired
          .map((pair) => `[*${pair.data.title}*](/books/${pair.id}/)`)
          .join(' and ')
      : 'another source book that challenges the same problem from a different angle';
    body = [
      body,
      '',
      `## Best paired with`,
      '',
      `Pair ${book.data.title} with ${pairText} when the question needs more than one lens. One book can name the central pattern; a second book can supply the counterweight, the operating detail, or the human constraint that keeps the answer from becoming too neat.`,
      '',
      `That pairing is also useful for AI and agent workflows. A single book can overfit the answer to one worldview. A small shelf of related books gives the agent enough contrast to explain the tradeoff, cite the source lens, and still return a practical next step.`,
    ].join('\n');
  }

  return `${body.trim()}\n`;
}

function enhanceAnswer(answer, originalBody) {
  const words = wordCount(stripMarkdown(originalBody));
  if (words >= 480) return originalBody;
  const sourceBooks = (answer.data.books ?? []).map((id) => bookById.get(id)).filter(Boolean);
  const sourceNames = sourceBooks.map((book) => `[*${book.data.title}*](/books/${book.id}/)`);
  const body = originalBody.trim();
  if (hasHeading(body, 'Why this matters now')) return originalBody;

  return `${body}

## Why this matters now

This question is worth answering because it names a live situation, not a reading assignment. The reader is trying to make a better move while the facts are still incomplete, so the answer should begin with the practical tension and only then bring in source books.

The useful move is to make the question operational. ${answer.data.description} ${sourceNames.length ? sourceNames.join(' and ') : 'The source shelf'} supplies durable judgment, but the answer still has to end in a next step the reader can try in the real world.

## How to use this answer

Read the guide once for the main idea, then translate it into a current decision. Ask what evidence would change your mind, which part of the situation is a people problem, which part is a system problem, and what small test would make the problem less vague this week.

The point is not to agree with every sentence. The point is to leave with a sharper question, a better source lens, and one move that makes the situation less vague.
`;
}

function cleanLongQuotes(body, book) {
  const quoteLines = body.match(/^>\s+.+$/gm) ?? [];
  if (!quoteLines.length) return body;
  return body.replace(
    /^>\s+.+$/gm,
    `The useful public-facing version of this idea is the paraphrase: use ${book.data.title} as a practical lens for ${topicPhrase(book)}, then return to the situation and decide what should change next.`
  );
}

function readCollection(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .sort()
    .map((file) => {
      const markdown = readFileSync(path.join(dir, file), 'utf8');
      const match = markdown.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      const frontmatter = match?.[1] ?? '';
      const body = (match?.[2] ?? markdown).trim();
      return {
        id: file.replace(/\.md$/, ''),
        file: path.join(dir, file),
        frontmatter,
        data: parseFrontmatter(frontmatter),
        body,
      };
    });
}

function writeEntry(entry, body) {
  writeFileSync(entry.file, `---\n${entry.frontmatter.trim()}\n---\n\n${body.trim()}\n`);
}

function parseFrontmatter(source) {
  const data = {};
  for (const line of source.split('\n')) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    data[match[1]] = parseValue(match[2]);
  }
  return data;
}

function parseValue(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed
      .slice(1, -1)
      .split(',')
      .map((item) => cleanScalar(item))
      .filter(Boolean);
  }
  return cleanScalar(trimmed);
}

function cleanScalar(value) {
  return value.trim().replace(/^["']|["']$/g, '');
}

function hasHeading(body, heading) {
  return new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, 'm').test(body);
}

function topicPhrase(entry) {
  const tags = entry.data.tags ?? [];
  if (!tags.length) return 'the problem it addresses';
  if (tags.length === 1) return tags[0].replace(/-/g, ' ');
  return `${tags.slice(0, -1).map((tag) => tag.replace(/-/g, ' ')).join(', ')}, and ${tags.at(-1).replace(/-/g, ' ')}`;
}

function lowerFirst(value) {
  const text = String(value ?? '').trim();
  return text ? `${text[0].toLowerCase()}${text.slice(1)}` : 'the situation calls for it';
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
