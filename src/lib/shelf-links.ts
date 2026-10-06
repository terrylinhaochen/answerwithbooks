/** Shared shelves are snapshots of public catalog IDs, with no account data. */
export function validSharedBooks(ids: unknown, catalog: ReadonlySet<string>): ids is string[] {
 return Array.isArray(ids) && ids.length > 0 && ids.length <= 5 &&
  new Set(ids).size === ids.length && ids.every(id => typeof id === 'string' && catalog.has(id));
}

export function readSharedBooks(search: string, catalog: ReadonlySet<string>): string[] | null {
 const values = new URLSearchParams(search).getAll('books');
 if (values.length !== 1 || values[0].length > 1000) return null;
 const ids = values[0].split(',');
 return validSharedBooks(ids, catalog) ? ids : null;
}

export function sharedShelfUrl(ids: string[], origin: string): string {
 const url = new URL('/shelf/', origin);
 // Encode each slug individually so separators stay readable when copying a link.
 url.search = `?books=${ids.map(encodeURIComponent).join(',')}`;
 return url.href;
}
