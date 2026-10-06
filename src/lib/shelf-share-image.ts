import '../styles/shelf-export.css';

export type ShelfImageContext = { title: string; date?: string };
export const shelfShareDescription = 'Your collection, ready for your next question or task.';

function cancellable<T>(promise: Promise<T>, signal: AbortSignal, ms = 20000): Promise<T> {
 return new Promise((resolve, reject) => {
  const abort = () => finish(() => reject(new DOMException('Cancelled', 'AbortError')));
  const timer = window.setTimeout(() => finish(() => reject(new Error('Image export timed out'))), ms);
  const finish = (complete: () => void) => { clearTimeout(timer); signal.removeEventListener('abort', abort); complete(); };
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) { abort(); return; }
  promise.then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
 });
}

function dataUrl(blob: Blob): Promise<string> {
 return new Promise((resolve, reject) => {
  const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = () => reject(new Error('Asset unavailable')); reader.readAsDataURL(blob);
 });
}

let fontCSS: Promise<string> | undefined;
function embeddedFonts(signal: AbortSignal): Promise<string> {
 const href = document.querySelector<HTMLLinkElement>('link[rel="stylesheet"][href^="https://fonts.googleapis.com/"]')?.href;
 if (!href) return Promise.resolve('');
 if (!fontCSS) fontCSS = (async () => {
  const response = await fetch(href, { signal, credentials: 'omit' });
  if (!response.ok) throw new Error('Fonts unavailable');
  let css = await response.text();
  const sources = [...new Set(Array.from(css.matchAll(/url\(["']?([^"')]+)["']?\)/g), match => match[1]))];
  const embedded = await Promise.all(sources.map(async source => {
   const url = new URL(source, href); if (url.origin !== 'https://fonts.gstatic.com') throw new Error('Font unavailable');
   const font = await fetch(url, { signal, credentials: 'omit' }); if (!font.ok) throw new Error('Font unavailable');
   return [source, await dataUrl(await font.blob())] as const;
  }));
  for (const [source, data] of embedded) css = css.split(source).join(data);
  return css;
 })().catch(error => { fontCSS = undefined; throw error; });
 return fontCSS;
}

async function embedCover(image: HTMLImageElement, signal: AbortSignal) {
 const url = new URL(image.getAttribute('src') || '', location.origin);
 if (url.origin !== location.origin || !url.pathname.startsWith('/covers/')) throw new Error('Cover unavailable');
 const response = await fetch(url, { signal, credentials: 'omit' });
 if (!response.ok) throw new Error('Cover unavailable');
 const blob = await response.blob();
 const source = await dataUrl(blob);
 signal.throwIfAborted(); image.loading = 'eager'; image.src = source;
 await cancellable(image.decode(), signal);
}

/** Export the actual BookJacket DOM, including its CSS geometry, type, and shadows. */
export async function createShelfShareImage(covers: HTMLElement, context: ShelfImageContext, signal: AbortSignal): Promise<Blob> {
 const jackets = Array.from(covers.querySelectorAll<HTMLElement>('.jacket'));
 if (!jackets.length || jackets.length > 5) throw new Error('Choose one to five books');
 const card = document.createElement('section');
 card.className = 'shelf-export-card'; card.setAttribute('aria-hidden', 'true'); card.dataset.exportBookCount = String(jackets.length);
 const header = document.createElement('div'); header.className = 'shelf-export-heading';
 const titleGroup = document.createElement('div'); titleGroup.className = 'shelf-export-title-group';
 const title = document.createElement('h2'); title.className = 'shelf-export-title';
 if (context.title.endsWith(' shelf')) {
  title.append(document.createTextNode(context.title.slice(0, -6) + ' '));
  const emphasis = document.createElement('em'); emphasis.textContent = 'shelf'; title.append(emphasis);
 } else title.textContent = context.title;
 titleGroup.append(title);
 if (context.date) { const date = document.createElement('p'); date.className = 'shelf-export-date'; date.textContent = context.date; titleGroup.append(date); }
 const description = document.createElement('p'); description.className = 'shelf-export-description'; description.textContent = shelfShareDescription;
 header.append(titleGroup, description);
 const row = document.createElement('div'); row.className = 'shelf-export-books';
 jackets.forEach((jacket, index) => {
  const place = document.createElement('div'); place.className = 'shelf-export-book';
  place.style.setProperty('--angle', `${[-7,4,-3,5,-5][index]}deg`);
  place.style.setProperty('--lift', `${[10,-8,-20,-5,10][index]}px`);
  place.append(jacket.cloneNode(true)); row.append(place);
 });
 const footer = document.createElement('div'); footer.className = 'shelf-export-footer';
 const label = document.createElement('span'); label.textContent = 'Agent Skills for Books';
 const site = document.createElement('span'); site.textContent = 'answerwithbooks.com'; footer.append(label, site);
 card.append(header, row, footer);
 // Keep the export under the open dialog so it shares the live page's styles.
 const host = document.createElement('div'); host.className = 'shelf-export-host'; host.setAttribute('aria-hidden', 'true'); host.append(card);
 covers.parentElement!.append(host);
 try {
  const [fontEmbedCSS, { toBlob }] = await cancellable(Promise.all([
   embeddedFonts(signal), import('html-to-image'),
   Promise.all(Array.from(card.querySelectorAll('img')).map(image => embedCover(image, signal))),
  ]), signal);
  await cancellable(document.fonts.ready, signal);
  while (title.scrollWidth > title.clientWidth && parseFloat(getComputedStyle(title).fontSize) > 34) {
   title.style.fontSize = `${parseFloat(getComputedStyle(title).fontSize) - 2}px`;
  }
  signal.throwIfAborted();
  const blob = await cancellable(toBlob(card, {
   width: 1200, height: 750, pixelRatio: 2, fontEmbedCSS,
   fetchRequestInit: { signal },
   style: { position: 'relative', left: '0', top: '0', margin: '0' },
  }), signal);
  signal.throwIfAborted();
  if (!blob) throw new Error('Image export unavailable');
  return blob;
 } finally { host.remove(); }
}
