import { escapeHtml } from './dom.js';

const ICON_PATHS = {
  command: '<path d="M8 8V5.5A2.5 2.5 0 1 0 5.5 8H18.5A2.5 2.5 0 1 0 16 5.5v13a2.5 2.5 0 1 0 2.5-2.5h-13A2.5 2.5 0 1 0 8 18.5V8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42"/>',
  moon: '<path d="M20.5 13.1A8.6 8.6 0 0 1 10.9 3.5a8.6 8.6 0 1 0 9.6 9.6Z"/>',
  'file-text': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
};

// Icons are decorative; their containing link or button supplies the label.
export function iconMarkup(name, attributes = {}) {
  if (!Object.hasOwn(ICON_PATHS, name)) throw new TypeError(`Unknown icon: ${name}`);

  const extraAttributes = Object.entries(attributes)
    .filter(([key, value]) => /^data-[\w-]+$/.test(key) && value != null && value !== false)
    .map(([key, value]) => ` ${escapeHtml(key)}="${escapeHtml(value === true ? '' : value)}"`)
    .join('');
  const className = attributes.class ? `pf-icon ${attributes.class}` : 'pf-icon';

  return `<svg class="${escapeHtml(className)}" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"${extraAttributes}>${ICON_PATHS[name]}</svg>`;
}
