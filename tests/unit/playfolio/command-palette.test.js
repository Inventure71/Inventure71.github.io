import { afterEach, describe, expect, test, vi } from 'vitest';
import { buildCommandPaletteMarkup, setupCommandPalette } from '../../../js/playfolio/command-palette.js';

describe('playfolio command palette markup', () => {
  test('escapes labels, hrefs, and keywords before rendering', () => {
    const markup = buildCommandPaletteMarkup([
      {
        label: 'A&B',
        description: '<desc>',
        href: '/path?a=1&b=2',
        keywords: 'alpha < beta',
      },
    ]);

    expect(markup).toContain('A&amp;B');
    expect(markup).toContain('&lt;desc&gt;');
    expect(markup).toContain('/path?a=1&amp;b=2');
    expect(markup).toContain('alpha &lt; beta');
  });

  test('names the search field and provides an accessible empty-result message', () => {
    const markup = buildCommandPaletteMarkup([]);
    expect(markup).toContain('aria-label="Search pages and projects"');
    expect(markup).toContain('data-command-empty role="status"');
    expect(markup).toContain('No results.');
  });
});

function createHarness({ scrollbarGap = 0, bodyPadding = '0px' } = {}) {
  const root = {};
  const node = (tagName = 'DIV') => {
    const listeners = new Map();
    const classes = new Set();
    const styles = new Map();
    const element = {
      tagName,
      hidden: false,
      isConnected: true,
      value: '',
      dataset: {},
      textContent: '',
      style: {
        setProperty: (name, value) => styles.set(name, value),
        removeProperty: (name) => styles.delete(name),
        getPropertyValue: (name) => styles.get(name) || '',
      },
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
        toggle: (name, on) => on ? classes.add(name) : classes.delete(name),
      },
      addEventListener: (name, callback) => listeners.set(name, callback),
      dispatch(name, details = {}) {
        const event = { target: element, currentTarget: element, preventDefault: vi.fn(), ...details };
        listeners.get(name)?.(event);
        return event;
      },
      focus: vi.fn(() => { root.activeElement = element; }),
      select: vi.fn(),
      scrollIntoView: vi.fn(),
    };
    return element;
  };
  const input = node('INPUT');
  const opener = node('BUTTON');
  const outside = node('A');
  const empty = node('P');
  const items = ['Noty', 'Ghoststroke', 'Projects'].map((label) => {
    const item = node('BUTTON');
    item.textContent = label;
    item.dataset = { href: `/${label.toLowerCase()}.html`, keywords: label === 'Noty' ? 'notes macos' : '' };
    return item;
  });
  const overlay = node();
  overlay.hidden = true;
  overlay.querySelector = (selector) => selector === '[data-command-input]' ? input : empty;
  overlay.querySelectorAll = () => items;
  overlay.contains = (target) => [overlay, input, empty, ...items].includes(target);
  Object.assign(root, node(), {
    activeElement: opener,
    documentElement: node('HTML'),
    body: node('BODY'),
    querySelector: () => overlay,
    querySelectorAll: () => [opener],
  });
  root.body.getBoundingClientRect = () => ({
    width: 1000 + (root.documentElement.classList.contains('pf-command-open') ? scrollbarGap : 0),
  });
  vi.stubGlobal('window', {
    location: { href: '' },
    getComputedStyle: () => ({ paddingInlineEnd: bodyPadding }),
  });
  setupCommandPalette(root);
  return { root, input, opener, outside, empty, items, overlay };
}

describe('playfolio command palette interaction', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('filters by keywords, reports no matches, and keeps Tab inside an empty dialog', () => {
    const h = createHarness();
    h.opener.dispatch('click');
    h.input.value = 'macos';
    h.input.dispatch('input');
    expect(h.items.map((item) => item.hidden)).toEqual([false, true, true]);
    expect(h.empty.hidden).toBe(true);

    h.input.value = 'no-such-project';
    h.input.dispatch('input');
    expect(h.items.every((item) => item.hidden)).toBe(true);
    expect(h.empty.hidden).toBe(false);
    expect(h.root.dispatch('keydown', { key: 'Tab' }).preventDefault).toHaveBeenCalled();
    expect(h.root.activeElement).toBe(h.input);
    h.input.dispatch('keydown', { key: 'Enter' });
    expect(window.location.href).toBe('');

    h.input.value = '';
    h.input.dispatch('input');
    expect(h.empty.hidden).toBe(true);
    expect(h.items[0].classList.contains('is-selected')).toBe(true);
  });

  test('cycles focus through visible results and redirects focus from outside the modal', () => {
    const h = createHarness();
    h.opener.dispatch('click');
    h.root.dispatch('keydown', { key: 'Tab', shiftKey: true });
    expect(h.root.activeElement).toBe(h.items[2]);
    h.root.dispatch('keydown', { key: 'Tab' });
    expect(h.root.activeElement).toBe(h.input);

    h.input.value = 'noty';
    h.input.dispatch('input');
    h.root.dispatch('keydown', { key: 'Tab', shiftKey: true });
    expect(h.root.activeElement).toBe(h.items[0]);
    h.outside.focus();
    h.root.dispatch('focusin', { target: h.outside });
    expect(h.root.activeElement).toBe(h.input);
  });

  test.each(['escape', 'outside'])('restores the clicked opener and page scrolling after %s close', (method) => {
    const h = createHarness();
    h.outside.focus();
    h.opener.dispatch('click');
    expect(h.overlay.hidden).toBe(false);
    expect(h.root.activeElement).toBe(h.input);
    expect(h.root.documentElement.classList.contains('pf-command-open')).toBe(true);

    h.items[1].focus();
    if (method === 'escape') h.root.dispatch('keydown', { key: 'Escape' });
    else h.overlay.dispatch('click');
    expect(h.overlay.hidden).toBe(true);
    expect(h.root.activeElement).toBe(h.opener);
    expect(h.root.documentElement.classList.contains('pf-command-open')).toBe(false);
  });

  test('preserves the shortcut opener across repeated shortcuts and retains arrow/Enter navigation', () => {
    const h = createHarness();
    h.outside.focus();
    h.root.dispatch('keydown', { key: '/', code: 'Slash' });
    expect(h.root.activeElement).toBe(h.input);
    h.root.dispatch('keydown', { key: 'k', metaKey: true });
    h.input.dispatch('keydown', { key: 'ArrowDown' });
    h.input.dispatch('keydown', { key: 'Enter' });
    expect(window.location.href).toBe('/ghoststroke.html');
    h.root.dispatch('keydown', { key: 'Escape' });
    expect(h.root.activeElement).toBe(h.outside);
  });

  test('leaves slash typing alone when a text field already has focus', () => {
    const h = createHarness();
    h.input.focus();
    h.root.dispatch('keydown', { key: '/', code: 'Slash' });
    expect(h.overlay.hidden).toBe(true);
  });

  test.each([0, 6])('compensates only for a measured %ipx scrollbar shift and restores padding on close', (scrollbarGap) => {
    const h = createHarness({ scrollbarGap, bodyPadding: '12px' });
    h.opener.dispatch('click');
    expect(h.root.documentElement.style.getPropertyValue('--pf-command-body-padding')).toBe('12px');
    expect(h.root.documentElement.style.getPropertyValue('--pf-command-scrollbar-gap')).toBe(`${scrollbarGap}px`);
    h.root.dispatch('keydown', { key: 'Escape' });
    expect(h.root.documentElement.style.getPropertyValue('--pf-command-body-padding')).toBe('');
    expect(h.root.documentElement.style.getPropertyValue('--pf-command-scrollbar-gap')).toBe('');
  });
});
