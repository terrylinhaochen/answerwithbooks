import { readSharedBooks } from './shelf-links';
import { mountShelfSharing } from './shelf-sharing';

const root = document.querySelector<HTMLElement>('[data-shared-shelf]');
if (root) {
 const catalog: { slug: string; title: string }[] = JSON.parse(root.querySelector('[data-shared-catalog]')!.textContent!);
 const ids = readSharedBooks(location.search, new Set(catalog.map(book => book.slug)));
 root.querySelector<HTMLElement>('[data-shared-loading]')!.hidden = true;
 if (!ids) {
  root.querySelector<HTMLElement>('[data-shared-error]')!.hidden = false;
 } else {
  const list = root.querySelector<HTMLElement>('[data-shared-books]')!;
  for (const [index, slug] of ids.entries()) {
   const template = root.querySelector<HTMLTemplateElement>(`[data-shared-book-template="${slug}"]`)!;
   const card = template.content.cloneNode(true) as DocumentFragment;
   card.querySelector('[data-shared-book-number]')!.textContent = String(index + 1).padStart(2, '0');
   list.append(card);
  }
  root.querySelector('[data-shared-count]')!.textContent = `${ids.length} ${ids.length === 1 ? 'book' : 'books'}`;
  root.querySelector<HTMLElement>('[data-shared-content]')!.hidden = false;
  const sharing = mountShelfSharing(root, catalog, slug =>
   root.querySelector<HTMLTemplateElement>(`[data-shared-book-template="${slug}"]`)?.content.querySelector('.jacket')?.cloneNode(true));
  const share = root.querySelector<HTMLButtonElement>('[data-reshare-shelf]')!;
  share.addEventListener('click', () => sharing.open(ids, share));

  // Load only the selected book's public digest when a reader wants its task.
  const prompts = new Map<string, string>();
  for (const card of list.querySelectorAll<HTMLElement>('[data-shared-book]')) {
   const slug = card.dataset.sharedBook!;
   const button = card.querySelector<HTMLButtonElement>('[data-copy-shared-book]')!;
   const status = card.querySelector<HTMLElement>('[data-shared-copy-status]')!;
   const field = card.querySelector<HTMLTextAreaElement>('[data-shared-prompt]')!;
   const original = button.innerHTML;
   button.addEventListener('click', async () => {
    button.disabled = true; status.textContent = ''; field.hidden = true;
    try {
     let prompt = prompts.get(slug);
     if (!prompt) {
      button.textContent = 'Getting the task…';
      const response = await fetch(`/book-prompts/${encodeURIComponent(slug)}.json`);
      if (!response.ok) throw new Error('Task unavailable');
      const data = await response.json();
      if (data.slug !== slug || typeof data.prompt !== 'string' || !data.prompt.trim()) throw new Error('Task unavailable');
      prompt = data.prompt as string; prompts.set(slug, prompt);
     }
     field.value = prompt;
     try {
      await navigator.clipboard.writeText(prompt);
      status.textContent = 'Copied. Open your AI chat, paste the prompt, and send it.';
     } catch {
      field.hidden = false; field.focus(); field.select();
      status.textContent = 'Select and copy the prompt below.';
     }
    } catch {
     status.textContent = 'The agent task couldn’t load. Please try again.';
    } finally { button.disabled = false; button.innerHTML = original; }
   });
  }
 }
}
