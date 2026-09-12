const root = document.querySelector<HTMLElement>('[data-guide-catalog]');
const tabs = [...(root?.querySelectorAll<HTMLButtonElement>('[data-guide-tab]') ?? [])];
const panels = [...(root?.querySelectorAll<HTMLElement>('[data-guide-panel]') ?? [])];
const pageSize = 6;

// Each panel owns its filters and page, so switching tabs preserves your place.
panels.forEach(panel => {
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
});

const activateTab = (id: string, updateUrl = false) => {
  tabs.forEach(tab => {
    const active = tab.dataset.guideTab === id;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panels.forEach(panel => { panel.hidden = panel.dataset.guidePanel !== id; });
  if (updateUrl) history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
};
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateTab(tab.dataset.guideTab!, true));
  tab.addEventListener('keydown', event => {
    const target = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length]
      : event.key === 'ArrowLeft' ? tabs[(index - 1 + tabs.length) % tabs.length]
      : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : null;
    if (target) { event.preventDefault(); activateTab(target.dataset.guideTab!, true); target.focus(); }
  });
});
const restoreTab = () => activateTab(location.hash === '#career-learning' ? 'career-learning' : 'practical-ai');
window.addEventListener('hashchange', restoreTab);
restoreTab();
