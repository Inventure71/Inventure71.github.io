import { escapeHtml } from './dom.js';
import { footerLinks, navItems } from './catalog.js';
import { installReactiveGlassSurface } from './reactive-glass.js';

export { installReactiveGlassSurface } from './reactive-glass.js';

// Shared navbar source of truth. After changing navbar markup, run
// `npm run sync:chrome`; `npm run check` verifies all static pages are synced.

const NAV_TONES = {
  home: 'blue',
  projects: 'green',
  apps: 'blue',
  resume: 'amber',
  contact: 'coral',
};

export function currentNavKey(pathname = window.location.pathname) {
  if (pathname.includes('/project_details/') || pathname.endsWith('/projects.html') || pathname.endsWith('/tags.html')) {
    return 'projects';
  }

  const match = pathname.match(/\/([^/]+)\.html$/);
  return match ? match[1].replace('index', 'home') : 'home';
}

export function buildSharedNavbarMarkup(activeKey = 'home') {
  return `
      <div class="container">
        <div class="pf-brand-group" data-glass-group>
          <a class="navbar-brand" href="/index.html" data-glass-item data-glass-tone="brand">MG</a>
          <button class="pf-nav-ai-button" type="button" data-ai-guide-copy data-glass-item data-glass-tone="green">Ask AI</button>
        </div>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent"
          aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <div class="ms-auto d-flex align-items-center flex-column flex-lg-row gap-2">
            <ul class="navbar-nav mb-2 mb-lg-0 text-center text-lg-start" data-glass-group>
              ${navItems.map((item) => `
                <li class="nav-item">
                  <a class="nav-link${item.key === activeKey ? ' active' : ''}" href="${escapeHtml(item.href)}" data-glass-item data-glass-tone="${NAV_TONES[item.key] || 'green'}">${escapeHtml(item.label)}</a>
                </li>
              `).join('')}
            </ul>
            <div class="d-flex gap-2" data-glass-group>
              <button class="pf-icon-button" type="button" data-command-open data-glass-item data-glass-tone="blue" aria-label="Open command menu">
                <i class="bi bi-command"></i>
              </button>
              <button class="theme-toggle-btn" type="button" data-theme-toggle data-glass-item data-glass-tone="mode-preview" aria-label="Toggle color scheme">
                <span class="theme-toggle-icon theme-toggle-icon--current" aria-hidden="true">
                  <i class="bi bi-sun" data-theme-current-icon></i>
                </span>
                <span class="theme-toggle-icon theme-toggle-icon--preview" aria-hidden="true">
                  <i class="bi bi-moon" data-theme-preview-icon></i>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
}

export function buildSharedFooterMarkup() {
  return `
      <div class="pf-shell d-flex flex-column flex-sm-row justify-content-between gap-2">
        <div class="small">Copyright &copy; inventure71.github.io 2026</div>
        <div class="small d-flex gap-3">
          ${footerLinks.map((link) => {
            const rel = link.external ? ' target="_blank" rel="noopener"' : '';
            return `<a href="${escapeHtml(link.href)}"${rel}>${escapeHtml(link.label)}</a>`;
          }).join('')}
        </div>
      </div>
    `;
}

export function renderSharedNavbar(root = document) {
  const navbar = root.querySelector('.playfolio-page .navbar');
  if (!navbar) return;

  const activeKey = navbar.dataset.activePage || currentNavKey(root.defaultView?.location?.pathname);
  navbar.className = 'navbar navbar-expand-lg pf-reactive-glass pf-reactive-glass--site-bloom';

  if (!navbar.querySelector('[data-glass-item]')) {
    navbar.innerHTML = buildSharedNavbarMarkup(activeKey);
  } else {
    navbar.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === `/${activeKey === 'home' ? 'index' : activeKey}.html`);
    });
  }

  installReactiveGlassSurface(navbar);

  if (window.MGTheme) {
    window.MGTheme.sync();
  }
}

export function renderSharedFooter(root = document) {
  const footer = root.querySelector('.playfolio-page .pf-footer');
  if (!footer) return;

  footer.innerHTML = buildSharedFooterMarkup();
}
