import { ROLE_OPTIONS } from './playfolio/project-catalog.js';

export function installResumeFilter(root = document, browser = window) {
  const filter = root.querySelector('[data-resume-filter]');
  if (!filter || filter.dataset.bound === 'true') return;
  const buttons = [...filter.querySelectorAll('[data-resume-role]')];
  const entries = [...root.querySelectorAll('[data-resume-entry]')];
  const sections = [...root.querySelectorAll('[data-resume-section]')];
  const status = filter.querySelector('[data-resume-filter-status]');
  const validRoles = new Set(ROLE_OPTIONS.map(({ id }) => id));

  function applyRole(requestedRole, updateHistory = false) {
    const role = validRoles.has(requestedRole) ? requestedRole : 'all';
    buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.resumeRole === role)));
    entries.forEach((entry) => {
      entry.hidden = role !== 'all' && !entry.hasAttribute('data-resume-essential') && !entry.dataset.resumeRoles.split(' ').includes(role);
    });
    sections.forEach((section) => {
      section.hidden = !section.querySelector('[data-resume-entry]:not([hidden])');
      const link = root.querySelector(`[data-resume-section-link="${section.id}"]`);
      if (link) link.hidden = section.hidden;
    });
    const label = ROLE_OPTIONS.find((option) => option.id === role).label;
    if (status) status.textContent = role === 'all' ? 'Showing all resume entries.' : `Showing entries relevant to ${label}.`;
    filter.dataset.currentRole = role;
    if (updateHistory) {
      const url = new URL(browser.location.href);
      if (role === 'all') url.searchParams.delete('role');
      else url.searchParams.set('role', role);
      browser.history.pushState(null, '', url);
    }
    return role;
  }

  const readRole = () => new URL(browser.location.href).searchParams.get('role') || 'all';
  buttons.forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.resumeRole !== filter.dataset.currentRole) applyRole(button.dataset.resumeRole, true);
  }));
  browser.addEventListener('popstate', () => applyRole(readRole()));
  applyRole(readRole());
  filter.hidden = false;
  filter.dataset.bound = 'true';
  return { applyRole };
}

if (typeof document !== 'undefined') installResumeFilter();
