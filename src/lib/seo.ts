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

export function compactList(items: string[], fallback: string) {
  if (items.length === 0) return fallback;
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

export function compactDescription(primary: string, suffix = '', maxLength = 200) {
  const cleanPrimary = primary.trim().replace(/\s+/g, ' ');
  const cleanSuffix = suffix.trim().replace(/\s+/g, ' ');
  const combined = [cleanPrimary.replace(/\.$/, ''), cleanSuffix].filter(Boolean).join('. ').replace(/\.{2,}/g, '.');
  if (combined.length <= maxLength) return combined;
  if (cleanPrimary.length <= maxLength) return cleanPrimary;

  const slice = cleanPrimary.slice(0, maxLength - 1);
  const boundary = slice.lastIndexOf(' ');
  return `${slice.slice(0, boundary > maxLength * 0.7 ? boundary : slice.length).replace(/[,:;\s]+$/, '')}.`;
}
