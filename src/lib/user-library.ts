export const SAVED_BOOKS_KEY = 'awb:saved-books';
export const SAVED_ANSWERS_KEY = 'awb:saved-answers';
export const LIKED_ANSWERS_KEY = 'awb:liked-answers';
export const USER_MAPS_KEY = 'awb:user-content-maps';
export const COLLECTED_MAPS_KEY = 'awb:collected-content-maps';

export interface ContentMap {
  id: string;
  title: string;
  problem: string;
  sourceNote: string;
  topics: string[];
  books: string[];
  answers: string[];
  visibility: 'private' | 'public';
  author: string;
  createdAt: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  description: string;
  tags: string[];
  books?: string[];
  author?: string;
}

export const communityMaps: ContentMap[] = [
  {
    id: 'community-career-pivot',
    title: 'Career pivot without restarting from zero',
    problem:
      'I want to move into a more strategic role, but I do not know whether to build new skills, negotiate scope, or leave.',
    sourceNote:
      'Repeated concern from readers who feel under-leveraged at work and want a practical path before making a dramatic move.',
    topics: ['career', 'business', 'decisions'],
    books: ['so-good-they-cant-ignore-you', 'designing-your-life', 'the-effective-executive'],
    answers: [
      'how-to-decide-what-to-do-with-your-career-next',
      'how-to-negotiate-salary-without-guessing-your-worth',
    ],
    visibility: 'public',
    author: 'Answer with Books',
    createdAt: '2026-07-01T12:00:00.000Z',
  },
  {
    id: 'community-startup-validation',
    title: 'Startup idea validation without fooling yourself',
    problem:
      'People say the product sounds useful, but the team still cannot tell whether anyone will change behavior.',
    sourceNote:
      'A common founder pattern: positive calls, weak commitments, and no clear evidence that the idea survives real constraints.',
    topics: ['business', 'technology', 'decisions'],
    books: ['the-mom-test', 'the-lean-startup', 'good-strategy-bad-strategy'],
    answers: [
      'how-to-fix-user-interviews-that-are-not-teaching-you-anything',
      'how-to-validate-an-idea-without-fooling-yourself',
      'how-to-test-a-risky-idea-before-you-build-too-much',
    ],
    visibility: 'public',
    author: 'Answer with Books',
    createdAt: '2026-07-01T12:00:00.000Z',
  },
  {
    id: 'community-hard-conversation',
    title: 'Hard conversation before resentment builds',
    problem:
      'The issue keeps coming back, but every attempt to talk about it turns defensive or vague.',
    sourceNote:
      'A relationship and management concern where people need a safer sequence before the conversation becomes a blame loop.',
    topics: ['relationships', 'career', 'decisions'],
    books: ['crucial-conversations', 'thinking-fast-and-slow', 'high-output-management'],
    answers: [
      'how-to-have-a-hard-conversation-without-making-it-worse',
      'how-to-delegate-without-losing-control',
    ],
    visibility: 'public',
    author: 'Answer with Books',
    createdAt: '2026-07-01T12:00:00.000Z',
  },
];

export const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
};

export const writeJson = <T>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const toggleId = (key: string, id: string) => {
  const current = readJson<string[]>(key, []);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
  writeJson(key, next);
  return next;
};

export const makeContentMapId = () =>
  `map-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);

export const scoreLibraryItems = (query: string, items: LibraryItem[], limit = 4) => {
  const tokens = tokenize(query);
  return items
    .map((item) => {
      const haystack = `${item.title} ${item.description} ${item.tags.join(' ')} ${item.author ?? ''}`.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit)
    .map(({ item }) => item);
};

export const inferTopics = (
  query: string,
  topicDefinitions: Array<{ slug: string; label: string; description: string }>,
  fallback = ['business']
) => {
  const tokens = tokenize(query);
  const matches = topicDefinitions
    .map((topic) => {
      const haystack = `${topic.slug} ${topic.label} ${topic.description}`.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      return { topic, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ topic }) => topic.slug);
  return matches.length > 0 ? matches : fallback;
};
