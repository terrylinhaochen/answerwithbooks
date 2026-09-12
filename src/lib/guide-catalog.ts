const root = document.querySelector<HTMLElement>('[data-guide-catalog]');
const pageSize = 6;

// One shared search, category filter, and page across every guide.
if (root) {
  const panel = root;
  const search = panel.querySelector<HTMLInputElement>('[data-filter-search]')!;
  const buttons = [...panel.querySelectorAll<HTMLButtonElement>('[data-filter-category]')];
  const items = [...panel.querySelectorAll<HTMLElement>('[data-filter-item]')];
  const pagination = panel.querySelector<HTMLElement>('[data-pagination]')!;
  const previous = panel.querySelector<HTMLButtonElement>('[data-pagination-prev]')!;
  const next = panel.querySelector<HTMLButtonElement>('[data-pagination-next]')!;
  let category = 'all';
  let currentPage = 1;

  const render = () => {
    const query = search.value.trim().toLowerCase();
    const matches = items.filter(item => {
      const categories = JSON.parse(item.dataset.categories ?? '[]') as string[];
      return (category === 'all' || categories.includes(category)) && (!query || item.dataset.search?.includes(query));
    });
    const total = matches.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    currentPage = Math.max(1, Math.min(currentPage, pages));
    const start = (currentPage - 1) * pageSize;
    const visible = new Set(matches.slice(start, start + pageSize));
    items.forEach(item => { item.hidden = !visible.has(item); });
    panel.querySelector<HTMLElement>('[data-filter-count]')!.textContent = `${total} guide${total === 1 ? '' : 's'}`;
    panel.querySelector<HTMLElement>('[data-filter-empty]')!.hidden = total > 0;
    pagination.hidden = total <= pageSize;
    panel.querySelector<HTMLElement>('[data-pagination-summary]')!.textContent = total === 0 ? 'No guides found' : `Showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total} guides`;
    panel.querySelector<HTMLElement>('[data-pagination-page]')!.textContent = `Page ${currentPage} of ${pages}`;
    previous.disabled = currentPage === 1;
    next.disabled = currentPage === pages;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filterCategory === category)));
  };
  const reset = () => { currentPage = 1; render(); };
  search.addEventListener('input', reset);
  buttons.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filterCategory === category ? 'all' : button.dataset.filterCategory!;
    reset();
  }));
  const turnPage = (delta: number) => {
    currentPage += delta;
    render();
    panel.querySelector<HTMLElement>('[data-filter-list]')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  previous.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));
  render();
}
