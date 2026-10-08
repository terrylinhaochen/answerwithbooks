// A lease owns this bounded window. Reviewed results survive a failed sibling.
export function sectionConcurrency(value = '1') {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > 3) throw new Error('BOOK_SECTION_CONCURRENCY must be 1, 2, or 3.');
  return count;
}
export async function distillSectionBatch({chunks, notes = [], cursor = 0, concurrency = 1, distill}) {
  const count = sectionConcurrency(concurrency);
  const idFor = index => `ch${String(index + 1).padStart(2, '0')}`;
  const accepted = new Map(notes.map(note => [note.id, note]));
  const indices = [];
  for (let index = cursor; index < Math.min(chunks.length, cursor + count); index++) {
    if (!accepted.has(idFor(index))) indices.push(index);
  }
  const results = await Promise.allSettled(indices.map(async index => ({index, ...await distill(chunks[index], index)})));
  const errors = [];
  /** @type {{title?: unknown, author?: unknown}} */
  const metadata = {};
  for (const result of results) {
    if (result.status === 'rejected') { errors.push(result.reason); continue; }
    const {index, note, title, author} = result.value;
    if (note?.id !== idFor(index)) { errors.push(new Error('Section identity does not match its source.')); continue; }
    accepted.set(note.id, note);
    if (index === 0) Object.assign(metadata, {title, author});
  }
  let next = 0;
  while (next < chunks.length && accepted.has(idFor(next))) next++;
  return {notes: chunks.flatMap((_, index) => accepted.has(idFor(index)) ? [accepted.get(idFor(index))] : []), cursor: next, errors, ...metadata};
}
