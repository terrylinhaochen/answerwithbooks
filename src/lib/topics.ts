import type { CollectionEntry } from 'astro:content';

export const CANONICAL_TOPICS = [
  {
    slug: 'career',
    label: 'Career',
    description: 'Career direction, skill building, management, work choices, and the next professional step.',
    body:
      'Career questions are rarely solved by one inspirational rule. They usually need evidence about the work itself: what skills you are building, what options you can prototype cheaply, what constraints are real, and what tradeoffs you keep avoiding. The career shelf brings together books about life design, career capital, management, and focused work so the next move can be smaller than a life overhaul but more useful than generic advice.',
    tags: ['career', 'work', 'skill-building', 'life-design'],
  },
  {
    slug: 'relationships',
    label: 'Relationships',
    description: 'Communication, conflict, trust, feedback, leadership, and the conversations that shape work and life.',
    body:
      'This topic is for moments where the work is technically clear but socially hard: giving feedback, repairing trust, handling conflict, making team decisions, or saying the thing everyone is avoiding. The books here are useful because they turn vague communication advice into observable moves: restore safety, separate facts from stories, preserve independent judgment, and make the next conversation less performative.',
    tags: ['communication', 'conflict', 'teams', 'leadership', 'management'],
  },
  {
    slug: 'health',
    label: 'Health',
    description: 'Habits, burnout, attention, energy, and behavior change.',
    body:
      'The health shelf is intentionally practical rather than medical. It focuses on behavior change, attention, burnout, and the daily systems that make good intentions survive a real week. The strongest answers here use books to reduce the dependence on motivation: make the desired action smaller, change the cue, design the environment, and decide what does not deserve active attention right now.',
    tags: ['health', 'habits', 'behavior-change', 'burnout'],
  },
  {
    slug: 'technology',
    label: 'Technology',
    description: 'Systems, design, usability, operations, quality, and how technical choices affect people.',
    body:
      'Technology questions on this site are about how systems behave once people use them. That includes interface clarity, planning failures, quality checks, estimation, legibility, and the local work that dashboards often erase. The source books help translate technical friction into better design questions: what is the user trying to understand, what does the system hide, and where does the plan stop matching reality?',
    tags: ['technology', 'systems', 'operations', 'quality', 'design', 'usability', 'web', 'science', 'epistemology', 'paradigms', 'institutions', 'psychology'],
  },
  {
    slug: 'business',
    label: 'Business',
    description: 'Startups, product, strategy, validation, customer research, metrics, and growth decisions.',
    body:
      'Business is the densest part of the shelf because the recurring questions are concrete: is this a real customer signal, should we pivot, are our metrics lying, what strategy is actually coherent, and how do we turn feedback into a product bet? The books here are used as operating lenses for founders, product teams, marketers, and managers who need a better next move rather than a motivational summary.',
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
    body:
      'Negotiation is treated here as a search for constraints, not a contest of confidence. The useful questions are: what can move, what is fixed, what does the other side need to protect, and what evidence changes the conversation? Books on negotiation and judgment help keep the reader from anchoring too low, overexplaining, or mistaking discomfort for a bad deal. The category is small for now, but it gives the shelf a clear place for salary, pricing, sales, partnership, and tradeoff questions as more demand appears.',
    tags: ['negotiation', 'salary'],
  },
  {
    slug: 'productivity',
    label: 'Productivity',
    description: 'Focus, overwhelm, time, priorities, execution, and getting meaningful work done.',
    body:
      'Productivity pages focus on reducing cognitive load, not collecting tactics. The recurring problems are open loops, shallow work, impossible schedules, and too many tasks treated as equally active. The books here help decide what deserves attention, what should be captured and parked, and what environment makes the right action easier to repeat.',
    tags: ['productivity', 'focus', 'time', 'overwhelm', 'execution', 'priorities'],
  },
  {
    slug: 'decisions',
    label: 'Decisions',
    description: 'Judgment, intuition, collective intelligence, uncertainty, and choosing under pressure.',
    body:
      'Decision questions need source lenses because confidence is a poor proxy for truth. This topic connects books about intuition, bias, group judgment, forecasting, and uncertainty. The goal is not to remove ambiguity; it is to choose a better procedure: use the outside view, preserve independent information, separate signal from noise, and know when intuition has earned trust.',
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
  body: string;
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
        body: topic.body,
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
