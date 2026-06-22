export type FaqItem = {
  question: string;
  answer: string;
};

export function faqJsonLd(url: string, items: FaqItem[]) {
  if (items.length === 0) return undefined;

  return {
    '@type': 'FAQPage',
    '@id': `${url}#faq`,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function audienceJsonLd() {
  return {
    '@type': 'Audience',
    audienceType: 'Japanese and Korean readers',
    geographicArea: [
      { '@type': 'Country', name: 'Japan' },
      { '@type': 'Country', name: 'South Korea' },
    ],
  };
}

export function compactList(items: string[], fallback: string) {
  if (items.length === 0) return fallback;
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}
