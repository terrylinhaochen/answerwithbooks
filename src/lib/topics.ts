import type { CollectionEntry } from 'astro:content';

export const CANONICAL_TOPICS = [
  {
    slug: 'career',
    label: 'Career',
    description: 'Career direction, skill building, management, work choices, and the next professional step.',
    tags: ['career', 'work', 'skill-building', 'life-design'],
  },
  {
    slug: 'relationships',
    label: 'Relationships',
    description: 'Communication, conflict, trust, feedback, leadership, and the conversations that shape work and life.',
    tags: ['communication', 'conflict', 'teams', 'leadership', 'management'],
  },
  {
    slug: 'health',
    label: 'Health',
    description: 'Habits, burnout, attention, energy, and behavior change.',
    tags: ['health', 'habits', 'behavior-change', 'burnout'],
  },
  {
    slug: 'technology',
    label: 'Technology',
    description: 'Systems, design, usability, operations, quality, and how technical choices affect people.',
    tags: ['technology', 'systems', 'operations', 'quality', 'design', 'usability', 'web', 'science', 'epistemology', 'paradigms', 'institutions', 'psychology'],
  },
  {
    slug: 'business',
    label: 'Business',
    description: 'Startups, product, strategy, validation, customer research, metrics, and growth decisions.',
    tags: [
      'business',
      'startups',
      'product',
      'strategy',
      'planning',
      'customer-research',
      'customer research',
      'validation',
      'experiments',
      'metrics',
      'analytics',
      'feedback',
      'marketing',
      'positioning',
      'conversion',
      'pivots',
      'prioritization',
      'estimation',
      'project-management',
    ],
  },
  {
    slug: 'negotiation',
    label: 'Negotiation',
    description: 'Salary, leverage, persuasion, tradeoffs, and difficult back-and-forth decisions.',
    tags: ['negotiation', 'salary'],
  },
  {
    slug: 'productivity',
    label: 'Productivity',
    description: 'Focus, overwhelm, time, priorities, execution, and getting meaningful work done.',
    tags: ['productivity', 'focus', 'time', 'overwhelm', 'execution', 'priorities'],
  },
  {
    slug: 'decisions',
    label: 'Decisions',
    description: 'Judgment, intuition, collective intelligence, uncertainty, and choosing under pressure.',
    tags: ['decision-making', 'judgment', 'intuition', 'collective intelligence', 'markets', 'ideas'],
  },
] as const;

export type CanonicalTopic = (typeof CANONICAL_TOPICS)[number];

const topicBySlug = new Map(CANONICAL_TOPICS.map((topic) => [topic.slug, topic]));
const topicByTag = new Map<string, CanonicalTopic>();

for (const topic of CANONICAL_TOPICS) {
  topicByTag.set(slugifyTag(topic.label), topic);
  topicByTag.set(topic.slug, topic);
  for (const tag of topic.tags) {
    topicByTag.set(slugifyTag(tag), topic);
  }
}

export function slugifyTag(tag: string) {
  return tag
    .toLowerCase()
    .replaceAll('&', 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function titleizeTag(tag: string) {
  return tag
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function getTopicBySlug(slug: string) {
  return topicBySlug.get(slug);
}

export function topicForTag(tag: string) {
  return topicByTag.get(slugifyTag(tag)) ?? topicBySlug.get('business')!;
}

export function topicsForTags(tags: string[]) {
  const seen = new Set<string>();
  return tags
    .map(topicForTag)
    .filter((topic) => {
      if (seen.has(topic.slug)) return false;
      seen.add(topic.slug);
      return true;
    });
}

type TopicGroup = {
  slug: string;
  label: string;
  description: string;
  answers: CollectionEntry<'answers'>[];
  books: CollectionEntry<'books'>[];
};

export function collectTopics(
  answers: CollectionEntry<'answers'>[],
  books: CollectionEntry<'books'>[],
  options: { includeEmpty?: boolean } = {}
) {
  const topics = new Map<string, TopicGroup>();

  const ensure = (topic: CanonicalTopic) => {
    const slug = topic.slug;
    if (!topics.has(slug)) {
      topics.set(slug, {
        slug,
        label: topic.label,
        description: topic.description,
        answers: [],
        books: [],
      });
    }
    return topics.get(slug)!;
  };

  if (options.includeEmpty) {
    for (const topic of CANONICAL_TOPICS) ensure(topic);
  }

  for (const answer of answers) {
    for (const topic of topicsForTags(answer.data.tags)) {
      const group = ensure(topic);
      if (!group.answers.some((existing) => existing.id === answer.id)) group.answers.push(answer);
    }
  }

  for (const book of books) {
    for (const topic of topicsForTags(book.data.tags)) {
      const group = ensure(topic);
      if (!group.books.some((existing) => existing.id === book.id)) group.books.push(book);
    }
  }

  return [...topics.values()].sort(
    (a, b) =>
      CANONICAL_TOPICS.findIndex((topic) => topic.slug === a.slug) -
      CANONICAL_TOPICS.findIndex((topic) => topic.slug === b.slug)
  );
}
