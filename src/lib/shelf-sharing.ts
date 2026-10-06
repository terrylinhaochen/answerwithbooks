import { sharedShelfUrl, validSharedBooks } from './shelf-links';
import { createShelfShareImage, shelfShareDescription, type ShelfImageContext } from './shelf-share-image';

type SharedBook = { slug: string; title: string };
export function mountShelfSharing(root: HTMLElement, catalog: SharedBook[], coverFor: (slug: string) => Node | undefined) {
 const dialog = root.querySelector<HTMLDialogElement>('[data-shelf-share-dialog]')!;
 const covers = dialog.querySelector<HTMLElement>('[data-shelf-share-covers]')!;
 const field = dialog.querySelector<HTMLInputElement>('[data-shelf-share-url]')!;
 const copy = dialog.querySelector<HTMLButtonElement>('[data-copy-shelf-link]')!;
 const status = dialog.querySelector<HTMLElement>('[data-shelf-share-status]')!;
 const preview = dialog.querySelector<HTMLAnchorElement>('[data-shelf-share-preview]')!;
 const createImage = dialog.querySelector<HTMLButtonElement>('[data-create-shelf-image]')!;
 const imagePreview = dialog.querySelector<HTMLImageElement>('[data-shelf-image-preview]')!;
 const shareImage = dialog.querySelector<HTMLButtonElement>('[data-share-shelf-image]')!;
 const downloadImage = dialog.querySelector<HTMLAnchorElement>('[data-download-shelf-image]')!;
 const imageStatus = dialog.querySelector<HTMLElement>('[data-shelf-image-status]')!;
 let imageContext: ShelfImageContext = { title: 'A shared shelf' };
 let imageUrl = '', imageFile: File | null = null, imageAbort: AbortController | null = null;
 const books = new Map(catalog.map(book => [book.slug, book]));
 const allowed = new Set(books.keys());
 let previousOverflow = '', returnFocus: HTMLElement | null = null, revision = 0;
 dialog.querySelector('[data-close-shelf-share]')!.addEventListener('click', () => dialog.close());
 dialog.addEventListener('close', () => {
  revision++; resetImage();
  document.body.style.overflow = previousOverflow;
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
 });
 function resetImage() {
  imageAbort?.abort(); imageAbort = null;
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = ''; imageFile = null;
  imagePreview.hidden = true; imagePreview.removeAttribute('src'); covers.hidden = false;
  createImage.hidden = false; createImage.disabled = false;
  createImage.innerHTML = 'Create share image <span aria-hidden="true">↗</span>';
  downloadImage.hidden = true; downloadImage.removeAttribute('href');
  downloadImage.classList.remove('shelf-image-secondary'); shareImage.hidden = true; shareImage.disabled = false;
  imageStatus.textContent = '';
 }
 createImage.addEventListener('click', async () => {
  const current = revision;
  imageAbort?.abort(); const controller = new AbortController(); imageAbort = controller;
  createImage.disabled = true; createImage.textContent = 'Creating image…'; imageStatus.textContent = '';
  try {
   const blob = await createShelfShareImage(covers, imageContext, controller.signal);
   if (current !== revision || !dialog.open) return;
   imageFile = new File([blob], 'answer-with-books-shelf.png', { type: 'image/png' });
   imageUrl = URL.createObjectURL(blob); imagePreview.src = imageUrl; imagePreview.hidden = false; covers.hidden = true;
   downloadImage.href = imageUrl; downloadImage.hidden = false; createImage.hidden = true;
   let canShare = false;
   try { canShare = !!navigator.share && !!navigator.canShare?.({ files: [imageFile] }); } catch { /* Download remains available. */ }
   shareImage.hidden = !canShare; downloadImage.classList.toggle('shelf-image-secondary', canShare);
   (canShare ? shareImage : downloadImage).focus({ preventScroll: true });
  } catch (error) {
   if (current === revision && !controller.signal.aborted) imageStatus.textContent = 'Couldn’t create the image. Please try again.';
  } finally {
   if (current === revision) { createImage.disabled = false; createImage.innerHTML = 'Create share image <span aria-hidden="true">↗</span>'; }
  }
 });
 shareImage.addEventListener('click', async () => {
  if (!imageFile || !navigator.share) return;
  const current = revision; shareImage.disabled = true; imageStatus.textContent = '';
  try {
   await navigator.share({ files: [imageFile], title: imageContext.title, text: shelfShareDescription, url: field.value });
  } catch (error) {
   if (current === revision && (error as DOMException)?.name !== 'AbortError') imageStatus.textContent = 'Sharing couldn’t open. Download the image or copy the link instead.';
  } finally { if (current === revision) shareImage.disabled = false; }
 });
 field.addEventListener('click', () => field.select());
 copy.addEventListener('click', async () => {
  const current = revision;
  copy.disabled = true;
  try {
   await navigator.clipboard.writeText(field.value);
   if (current === revision) status.textContent = 'Link copied. Ready to pass along.';
  } catch {
   if (current === revision) {
    status.textContent = 'Select and copy the link above.';
    field.focus(); field.select();
   }
  } finally { if (current === revision) copy.disabled = false; }
 });
 return {
  close() { if (dialog.open) dialog.close(); },
  open(ids: string[], trigger: HTMLElement, context: ShelfImageContext = { title: 'A shared shelf' }) {
   if (!validSharedBooks(ids, allowed) || dialog.open) return;
   revision++; resetImage(); imageContext = { ...context };
   dialog.querySelector('#shelf-share-title')!.textContent = context.title;
   dialog.querySelector('.shelf-share-intro')!.textContent = shelfShareDescription;
   imagePreview.alt = `${context.title}: ${ids.map(id => books.get(id)!.title).join(', ')}`;
   returnFocus = trigger; copy.disabled = false; status.textContent = '';
   const url = sharedShelfUrl(ids, location.origin);
   field.value = url; preview.href = url;
   covers.replaceChildren(...ids.map(slug => {
    const cover = document.createElement('div');
    cover.className = 'shelf-share-cover'; cover.setAttribute('role', 'img');
    cover.setAttribute('aria-label', books.get(slug)!.title);
    const jacket = coverFor(slug); if (jacket) cover.append(jacket);
    return cover;
   }));
   previousOverflow = document.body.style.overflow;
   document.body.style.overflow = 'hidden'; dialog.showModal(); copy.focus();
  }
 };
}
