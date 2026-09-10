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
  if (addition.slug) {
    let saved: string[] = [];
    try { const value = JSON.parse(localStorage.getItem('awb:saved-books') || '[]'); if (Array.isArray(value)) saved = value; } catch { /* Start a clean shelf if storage was malformed. */ }
    localStorage.setItem('awb:saved-books', JSON.stringify([...new Set([...saved, addition.slug])]));
  }
  window.dispatchEvent(new CustomEvent('awb:book-added'));
}

export async function matchBooks(query: string, catalog: BookCandidate[], signal: AbortSignal): Promise<{ books: BookCandidate[]; offline?: boolean }> {
  const normalized = normalizeBook(query);
  const local = catalog.map((book) => {
    const title = normalizeBook(book.title);
    const tokens = title.split(' ').filter((word) => word.length > 2 && !['the', 'and', 'for', 'with'].includes(word));
    const ratio = tokens.length ? tokens.filter((word) => normalized.split(' ').includes(word)).length / tokens.length : 0;
    return { book, score: (title && normalized.includes(title)) ? 2 + title.length / 100 : ratio };
  }).filter((item) => item.score >= .75).sort((a, b) => b.score - a.score);
  if (local[0]?.score >= 2) return { books: local.slice(0, 3).map((item) => item.book) };
  const titleQuery = query.split(/\n/).map((line) => line.trim()).filter((line) => line.length > 0 && !/isbn|copyright|published|all rights/i.test(line)).slice(0, 3).join(' ').slice(0, 180);
  const url = new URL('https://openlibrary.org/search.json');
  url.searchParams.set('q', titleQuery);
  url.searchParams.set('fields', 'key,title,author_name,first_publish_year');
  url.searchParams.set('limit', '5');
  try {
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
    if (!response.ok) throw new Error('Book search unavailable');
    const result = await response.json();
    const external: BookCandidate[] = (Array.isArray(result.docs) ? result.docs : []).filter((item: any) => typeof item.title === 'string' && /^\/works\/OL\d+W$/.test(item.key)).map((item: any) => ({
      title: item.title.slice(0, 200), author: (Array.isArray(item.author_name) ? item.author_name.filter((name: unknown) => typeof name === 'string').join(', ') : '').slice(0, 200),
      externalId: item.key, year: item.first_publish_year,
    }));
    const combined = [...local.map((item) => item.book), ...external];
    return { books: combined.filter((book, index) => combined.findIndex((other) => sameBook(other, book)) === index).slice(0, 4) };
  } catch (error) {
    if (signal.aborted) throw error;
    return { books: local.map((item) => item.book).slice(0, 3), offline: true };
  }
}

export async function extractBookText(file: File, signal: AbortSignal, progress: (message: string) => void): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose a file under 10 MB. A cover image or the first pages of a PDF work best.');
  if (file.size === 0) throw new Error('This file is empty. Choose another file.');
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, WebP image, or a PDF.');
  const ocr = async (source: File | HTMLCanvasElement) => {
    progress('Reading the cover…');
    const [{ createWorker }, { default: workerPath }] = await Promise.all([import('tesseract.js'), import('tesseract.js/dist/worker.min.js?url')]);
    signal.throwIfAborted();
    const worker = await createWorker('eng', 1, { workerPath, logger: (event) => {
      if (!signal.aborted && event.status === 'recognizing text') progress(`Reading the cover… ${Math.round(event.progress * 100)}%`);
    } });
    const cancel = () => { void worker.terminate(); };
    signal.addEventListener('abort', cancel, { once: true });
    try { signal.throwIfAborted(); return (await worker.recognize(source)).data.text; }
    finally { signal.removeEventListener('abort', cancel); await worker.terminate().catch(() => {}); }
  };
  if (!isPdf) {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 60_000_000) { bitmap.close(); throw new Error('This image is too large. Try a smaller cover photo.'); }
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    return (await ocr(canvas)).slice(0, 2000);
  }
  progress('Reading the first pages…');
  const [pdfjs, { default: workerSrc }] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('This does not look like a valid PDF. Try another file.');
  const task = pdfjs.getDocument({ data: bytes, isEvalSupported: false, enableXfa: false });
  task.onPassword = () => { void task.destroy(); };
  const cancel = () => { void task.destroy(); };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    signal.throwIfAborted();
    const pdf = await task.promise;
    let text = '';
    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 3); pageNumber++) {
      signal.throwIfAborted();
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join('');
      text += pageText + '\n';
      if (text.trim().length > 180) break;
      if (pageNumber === 1 && pageText.trim().length < 25) {
        const viewport = page.getViewport({ scale: Math.min(2, 1800 / page.getViewport({ scale: 1 }).width) });
        const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvas, viewport }).promise;
        text += await ocr(canvas);
      }
    }
    return text.slice(0, 2000);
  } catch (error) {
    if (signal.aborted) throw error;
    throw new Error('We could not read this PDF. Try an unlocked PDF, a cover image, or type its title.');
  } finally { signal.removeEventListener('abort', cancel); await task.destroy(); }
}
