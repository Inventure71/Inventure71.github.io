import { commandItems } from './catalog.js';
import { escapeHtml, isTypingTarget } from './dom.js';

export function buildCommandPaletteMarkup(items = commandItems) {
  return `
      <div class="pf-command" role="dialog" aria-modal="true" aria-label="Command menu">
        <input class="pf-command-input" type="search" placeholder="Jump to..." data-command-input />
        <div class="pf-command-list">
          ${items.map((item) => `
            <button class="pf-command-item" type="button" data-command-item
              data-href="${escapeHtml(item.href)}"
              data-keywords="${escapeHtml(item.keywords || '')}">
              <strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.description)}</span>
            </button>
          `).join('')}
        </div>
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

  const close = () => {
    overlay.hidden = true;
    input.value = '';
    items.forEach((item) => {
      item.hidden = false;
      item.classList.remove('is-selected');
    });
  };

  const open = () => {
    overlay.hidden = false;
    items.forEach((item) => {
      item.hidden = false;
      item.classList.remove('is-selected');
    });
    if (items[0]) items[0].classList.add('is-selected');
    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
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
    selectItem(visibleItems()[0]);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }

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

  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) {
      close();
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
