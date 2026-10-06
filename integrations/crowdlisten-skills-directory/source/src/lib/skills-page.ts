import { availableTools } from './tool-catalog.mjs';
import { discoverSkills } from './skill-discovery.mjs';
const search = document.querySelector<HTMLInputElement>('[data-skill-search]')!;
const filters = [...document.querySelectorAll<HTMLButtonElement>('[data-skill-role]')];
let role = 'all'; let page = 1;
function render(updateUrl = true) {
  const result = discoverSkills(availableTools, { role, query: search.value, page });
  role = result.role; page = result.page;
  const visible = new Set(result.skills.map(skill => skill.id));
  document.querySelectorAll<HTMLElement>('[data-capability]').forEach(card => { card.hidden = !visible.has(card.dataset.capability); });
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.skillRole === role)));
  document.querySelector<HTMLElement>('[data-skill-count]')!.textContent = `${result.total} ${result.total === 1 ? 'skill' : 'skills'}`;
  document.querySelector<HTMLElement>('[data-skill-empty]')!.hidden = result.total !== 0;
  document.querySelector<HTMLElement>('[data-skill-pagination]')!.hidden = result.pages < 2;
  document.querySelector<HTMLElement>('[data-skill-page]')!.textContent = `Page ${page} of ${result.pages}`;
  document.querySelector<HTMLButtonElement>('[data-skill-prev]')!.disabled = page === 1;
  document.querySelector<HTMLButtonElement>('[data-skill-next]')!.disabled = page === result.pages;
  if (updateUrl) {
    const url = new URL(location.href);
    for (const [key, value] of [['role', role === 'all' ? '' : role], ['q', search.value.trim()], ['page', page === 1 ? '' : String(page)]]) value ? url.searchParams.set(key, value) : url.searchParams.delete(key);
    history.replaceState(null, '', url.pathname + url.search + url.hash);
  }
}
function readUrl() { const params = new URLSearchParams(location.search); role = params.get('role') || 'all'; page = Number(params.get('page')) || 1; search.value = params.get('q') || ''; render(false); }
filters.forEach(button => button.addEventListener('click', () => { role = button.dataset.skillRole!; page = 1; render(); }));
search.addEventListener('input', () => { page = 1; render(); });
document.querySelector('[data-skill-reset]')!.addEventListener('click', () => { role = 'all'; search.value = ''; page = 1; render(); search.focus(); });
for (const [selector, delta] of [['[data-skill-prev]', -1], ['[data-skill-next]', 1]] as const) document.querySelector(selector)!.addEventListener('click', () => { page += delta; render(); });
window.addEventListener('popstate', readUrl); readUrl();
