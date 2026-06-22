import { getCollection } from 'astro:content';

const site = 'https://answerwithbooks.com';

export async function GET() {
  const answers = (await getCollection('answers')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  const items = answers
    .map((answer) => {
      const url = `${site}/answers/${answer.id}/`;
      return `
        <item>
          <title>${xml(answer.data.question)}</title>
          <link>${url}</link>
          <guid>${url}</guid>
          <pubDate>${answer.data.date.toUTCString()}</pubDate>
          <description>${xml(answer.data.description)}</description>
          ${answer.data.tags.map((tag) => `<category>${xml(tag)}</category>`).join('')}
        </item>`;
    })
    .join('');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <title>Answer with Books</title>
        <link>${site}/</link>
        <description>Practical questions answered with books.</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        ${items}
      </channel>
    </rss>`;

  return new Response(body.trim(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
}

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
