import { escapeHtml } from './dom.js';

const ICON_PATHS = {
  command: '<path d="M8 8V5.5A2.5 2.5 0 1 0 5.5 8H18.5A2.5 2.5 0 1 0 16 5.5v13a2.5 2.5 0 1 0 2.5-2.5h-13A2.5 2.5 0 1 0 8 18.5V8Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42"/>',
  moon: '<path d="M20.5 13.1A8.6 8.6 0 0 1 10.9 3.5a8.6 8.6 0 1 0 9.6 9.6Z"/>',
  'file-text': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Zm0 0v6h6M8 13h8m-8 4h6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  'arrow-right': '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  'arrow-up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  'clipboard-check': '<rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="m8 13 3 3 5-6"/>',
  envelope: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  'grid-3x3-gap': '<path d="M3 3h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 10h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4ZM3 17h4v4H3Zm7 0h4v4h-4Zm7 0h4v4h-4Z"/>',
  send: '<path d="m21 3-7 18-4-7-7-4L21 3ZM10 14 21 3"/>',
  flag: '<path d="M5 22V3c5-4 9 4 15 0v11c-6 4-10-4-15 0"/>',
  'flag-fill': '<path d="M5 22V3"/><path d="M5 3c5-4 9 4 15 0v11c-6 4-10-4-15 0Z" fill="currentColor"/>',
  'diagram-3': '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="2" y="16" width="6" height="5" rx="1"/><rect x="16" y="16" width="6" height="5" rx="1"/><path d="M12 8v4H5v4m7-4h7v4"/>',
  'x-lg': '<path d="m5 5 14 14M19 5 5 19"/>',
};

// Brand silhouettes from Bootstrap Icons v1.8.1, MIT licensed.
// https://github.com/twbs/icons/tree/v1.8.1/icons — see bootstrap-icons-LICENSE.txt.
const BRAND_PATHS = {
  github: '<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>',
  linkedin: '<path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>',
};

// Icons are decorative; their containing link or button supplies the label.
export function iconMarkup(name, attributes = {}) {
  const isBrand = Object.hasOwn(BRAND_PATHS, name);
  if (!isBrand && !Object.hasOwn(ICON_PATHS, name)) throw new TypeError(`Unknown icon: ${name}`);

  const extraAttributes = Object.entries(attributes)
    .filter(([key, value]) => /^data-[\w-]+$/.test(key) && value != null && value !== false)
    .map(([key, value]) => ` ${escapeHtml(key)}="${escapeHtml(value === true ? '' : value)}"`)
    .join('');
  const className = attributes.class ? `pf-icon ${attributes.class}` : 'pf-icon';

  const drawing = isBrand
    ? 'viewBox="0 0 16 16" fill="currentColor" stroke="none"'
    : 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="${escapeHtml(className)}" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" ${drawing} aria-hidden="true" focusable="false"${extraAttributes}>${isBrand ? BRAND_PATHS[name] : ICON_PATHS[name]}</svg>`;
}
