export const jobFunctions = [
  { id: 'all', label: 'All' }, { id: 'gtm-engineer', label: 'GTM Engineer' },
  { id: 'account-executive', label: 'Account Executive' }, { id: 'product-manager', label: 'Product Manager' },
  { id: 'designer', label: 'Designer' }, { id: 'fde', label: 'FDE', description: 'Forward Deployed Engineer' },
];
export const skillTools = {
  github: 'GitHub', x: 'X', exa: 'Exa', crowdlisten: 'CrowdListen',
  'feedback-library': 'Feedback sources', 'awb-shelf': 'AWB shelf',
};
export function discoverSkills(skills, { role = 'all', query = '', page = 1, pageSize = 6 } = {}) {
  const selectedRole = jobFunctions.some(item => item.id === role) ? role : 'all';
  const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = skills.filter(skill => {
    const text = [skill.name, skill.description, skill.deliverable, skill.publisher, skill.scope, ...skill.categories, ...skill.tools.map(id => skillTools[id]), ...skill.roles.map(id => jobFunctions.find(role => role.id === id)?.label)].join(' ').toLowerCase();
    return (selectedRole === 'all' || skill.roles.includes(selectedRole)) && terms.every(term => text.includes(term));
  });
  const size = Math.min(6, Math.max(1, Number(pageSize) || 6));
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.max(1, Math.min(pages, Math.trunc(Number(page)) || 1));
  return { skills: filtered.slice((current - 1) * size, current * size), total: filtered.length, pages, page: current, role: selectedRole };
}
