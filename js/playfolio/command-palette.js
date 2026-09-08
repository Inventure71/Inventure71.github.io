import { commandItems } from './catalog.js';
import { escapeHtml, isTypingTarget } from './dom.js';

export function buildCommandPaletteMarkup(items = commandItems) {
  return `
      <div class="pf-command" role="dialog" aria-modal="true" aria-label="Command menu">
        <input class="pf-command-input" type="search" aria-label="Search pages and projects" placeholder="Jump to..." data-command-input />
        <div class="pf-command-list">
          ${items.map((item) => `
            <button class="pf-command-item" type="button" data-command-item
              data-href="${escapeHtml(item.href)}"
              data-keywords="${escapeHtml(item.keywords || '')}">
              <strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.description)}</span>
            </button>
          `).join('')}
        </div>
        <p class="pf-command-empty" data-command-empty role="status" hidden>No results. Try another project name or topic.</p>
      </div>
    `;
}

export function setupCommandPalette(root = document) {
  let overlay = root.querySelector('[data-command-palette]');
  if (!overlay) {
    overlay = root.createElement('div');
    overlay.className = 'pf-command-overlay';
    overlay.dataset.commandPalette = '';
    overlay.hidden = true;
    root.body.appendChild(overlay);
  }

  overlay.innerHTML = buildCommandPaletteMarkup();

  const openers = root.querySelectorAll('[data-command-open]');
  const input = overlay.querySelector('[data-command-input]');
  const items = Array.from(overlay.querySelectorAll('[data-command-item]'));
  const emptyState = overlay.querySelector('[data-command-empty]');
  let previousFocus = null;

  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    root.documentElement.classList.remove('pf-command-open');
    root.documentElement.style.removeProperty('--pf-command-body-padding');
    root.documentElement.style.removeProperty('--pf-command-scrollbar-gap');
    input.value = '';
    emptyState.hidden = true;
    items.forEach((item) => {
      item.hidden = false;
      item.classList.remove('is-selected');
    });
    if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    previousFocus = null;
  };

  const open = (event) => {
    if (!overlay.hidden) {
      input.focus();
      return;
    }
    previousFocus = event?.currentTarget || root.activeElement;
    const bodyWidth = root.body.getBoundingClientRect().width;
    const bodyPadding = window.getComputedStyle(root.body).paddingInlineEnd;
    root.documentElement.style.setProperty('--pf-command-body-padding', bodyPadding);
    overlay.hidden = false;
    root.documentElement.classList.add('pf-command-open');
    // Measure the actual width change: an already reserved scrollbar gutter needs no compensation.
    const scrollbarGap = Math.max(0, root.body.getBoundingClientRect().width - bodyWidth);
    root.documentElement.style.setProperty('--pf-command-scrollbar-gap', `${scrollbarGap}px`);
    input.value = '';
    emptyState.hidden = true;
    items.forEach((item) => {
      item.hidden = false;
      item.classList.remove('is-selected');
    });
    if (items[0]) items[0].classList.add('is-selected');
    input.focus();
    input.select();
  };

  const runItem = (item) => {
    const href = item.dataset.href;
    if (href) window.location.href = href;
  };

  const visibleItems = () => items.filter((item) => !item.hidden);

  const selectItem = (item) => {
    if (!item) return;
    items.forEach((candidate) => candidate.classList.toggle('is-selected', candidate === item));
    item.scrollIntoView({ block: 'nearest' });
  };

  openers.forEach((button) => button.addEventListener('click', open));

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  items.forEach((item) => {
    item.addEventListener('click', () => runItem(item));
  });

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    items.forEach((item) => {
      const haystack = `${item.textContent} ${item.dataset.keywords || ''}`.toLowerCase();
      item.hidden = Boolean(query) && !haystack.includes(query);
    });
    const candidates = visibleItems();
    emptyState.hidden = candidates.length > 0;
    items.forEach((item) => item.classList.remove('is-selected'));
    selectItem(candidates[0]);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const candidates = visibleItems();
      const selectedIndex = candidates.findIndex((item) => item.classList.contains('is-selected'));
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = selectedIndex < 0
        ? 0
        : (selectedIndex + offset + candidates.length) % candidates.length;
      selectItem(candidates[nextIndex]);
    }

    if (event.key === 'Enter') {
      const selected = visibleItems().find((item) => item.classList.contains('is-selected')) || visibleItems()[0];
      if (selected) runItem(selected);
    }
  });

  root.addEventListener('focusin', (event) => {
    if (!overlay.hidden && !overlay.contains(event.target)) input.focus();
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'Tab' && !overlay.hidden) {
      const focusable = [input, ...visibleItems()];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && root.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && root.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    const slashShortcut = (event.key === '/' || event.code === 'Slash') && !isTypingTarget(root.activeElement);
    if (commandShortcut || slashShortcut) {
      event.preventDefault();
      open();
    }
  });
}
