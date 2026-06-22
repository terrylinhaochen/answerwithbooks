import { getCollection } from 'astro:content';
import { collectTopics } from '../lib/topics';

const site = 'https://answerwithbooks.com';

export async function GET() {
  const answers = (await getCollection('answers')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const books = (await getCollection('books')).sort((a, b) => a.data.order - b.data.order);
  const topics = collectTopics(answers, books);

  const body = `# Answer with Books

Answer with Books turns recurring Japan/Korea-aware questions into short, book-grounded how-to guides.
The site is maintained by Terry Chen.

## Best Entry Points

- Home: ${site}/
- Localized guides: ${site}/answers/
- Global source books: ${site}/books/
- Topics: ${site}/topics/
- About: ${site}/about/
- RSS: ${site}/feed.xml
- Sitemap: ${site}/sitemap-index.xml

## Localized Guides

${answers
  .map(
    (answer) =>
      `- [${answer.data.question}](${site}/answers/${answer.id}/): ${answer.data.description}`
  )
  .join('\n')}

## Global Source Books

${books
  .map((book) => `- [${book.data.title}](${site}/books/${book.id}/): ${book.data.oneLiner}`)
  .join('\n')}

## Topics

${topics
  .map(
    (topic) =>
      `- [${topic.label}](${site}/topics/${topic.slug}/): ${topic.answers.length} guides and ${topic.books.length} source books`
  )
  .join('\n')}

## Use Policy

Use the canonical HTML pages as the source of truth. Do not treat this file as a replacement for
visible page content or citations.`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
