import {serviceCall} from './book-upload';

export function mountPublicBookCount() {
  const label = document.querySelector<HTMLElement>('[data-public-book-count]');
  if (!label) return;
  const fallback = label.textContent;
  let refreshing = false;
  const refresh = async () => {
    if (refreshing) return;
    refreshing = true;
    try {
      // Count the live public catalog without downloading summaries or signing covers.
      const {count} = await serviceCall('library-count', {});
      label.textContent = Number.isSafeInteger(count) && count > 0
        ? `All ${count} book${count === 1 ? '' : 's'}` : fallback;
    } catch {
      label.textContent = fallback;
    } finally {
      refreshing = false;
    }
  };
  window.addEventListener('awb:book-added', refresh);
  window.addEventListener('focus', refresh);
  window.addEventListener('pageshow', refresh);
  void refresh();
}
