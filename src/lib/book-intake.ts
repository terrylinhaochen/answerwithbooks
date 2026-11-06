export type BookCandidate = { title: string; author: string; slug?: string; externalId?: string; year?: number; digestUrl?: string };
export type BookAddition = BookCandidate & { id: string; status: string; createdAt: string };
export const additionsKey = (userId?: string) => `awb:book-additions:${userId || 'guest'}`;
export const normalizeBook = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const sameBook = (a: BookCandidate, b: BookCandidate) => (a.slug && b.slug ? a.slug === b.slug : a.externalId && b.externalId ? a.externalId === b.externalId : normalizeBook(a.title) === normalizeBook(b.title) && normalizeBook(a.author) === normalizeBook(b.author));
export function readAdditions(userId?: string): BookAddition[] {
  try { const result = JSON.parse(localStorage.getItem(additionsKey(userId)) || '[]'); return Array.isArray(result) ? result.filter((item) => typeof item.title === 'string' && typeof item.author === 'string').slice(0, 100) : []; } catch { return []; }
}
export function rememberAddition(addition: BookAddition, userId?: string) {
  const records = readAdditions(userId).filter((item) => !sameBook(item, addition));
  localStorage.setItem(additionsKey(userId), JSON.stringify([addition, ...records].slice(0, 100)));
  window.dispatchEvent(new CustomEvent('awb:book-added'));
}
