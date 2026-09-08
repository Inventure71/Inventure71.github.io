import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, test, vi } from 'vitest';

const source = readFileSync(new URL('../../js/navbar.js', import.meta.url), 'utf8');

function harness({ expanded = false, desktop = false, reducedMotion = false, missingPanel = false } = {}) {
  vi.useFakeTimers();
  const classes = new Set(['collapse', ...(expanded ? ['show'] : [])]);
  const panelEvents = new Map();
  const toggleEvents = new Map();
  const attributes = new Map([['aria-controls', 'navbarSupportedContent']]);
  const media = [desktop, reducedMotion].map((matches) => ({
    matches,
    addEventListener(type, callback) { this.callback = callback; },
    change(matches) { this.matches = matches; this.callback(); },
  }));
  const panel = {
    classList: {
      contains: (name) => classes.has(name),
      add: (...names) => names.forEach((name) => classes.add(name)),
      remove: (...names) => names.forEach((name) => classes.delete(name)),
      toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
    },
    style: { removeProperty(name) { delete this[name]; } },
    scrollHeight: 280,
    offsetHeight: 0,
    visualHeight: expanded ? 280 : 0,
    getBoundingClientRect() { return { height: this.visualHeight }; },
    addEventListener: (type, callback) => panelEvents.set(type, callback),
  };
  const toggle = {
    getAttribute: (name) => attributes.get(name),
    setAttribute: (name, value) => attributes.set(name, value),
    addEventListener: (type, callback) => toggleEvents.set(type, callback),
  };
  runInNewContext(source, {
    window: {
      matchMedia: (query) => media[query.includes('992px') ? 0 : 1],
      setTimeout,
      clearTimeout,
    },
    document: {
      querySelectorAll: () => [toggle],
      getElementById: () => missingPanel ? null : panel,
    },
  });
  return {
    panel, classes, attributes, media,
    click: () => toggleEvents.get('click')(),
    end: (target = panel, propertyName = 'height') => panelEvents.get('transitionend')({ target, propertyName }),
  };
}

afterEach(() => vi.useRealTimers());

describe('local navbar collapse', () => {
  test('opens and closes the mobile panel, synchronizing accessibility and cleanup', () => {
    const nav = harness();
    nav.click();
    expect(nav.attributes.get('aria-expanded')).toBe('true');
    expect(nav.classes.has('collapsing')).toBe(true);
    expect(nav.panel.style.height).toBe('280px');
    nav.end();
    expect(nav.classes).toEqual(new Set(['collapse', 'show']));
    expect(nav.panel.style.height).toBeUndefined();
    nav.panel.visualHeight = 280;
    nav.click();
    expect(nav.attributes.get('aria-expanded')).toBe('false');
    expect(nav.panel.style.height).toBe('0px');
    nav.end();
    expect(nav.classes).toEqual(new Set(['collapse']));
  });

  test('reverses repeated clicks and settles the latest requested state', () => {
    const nav = harness();
    nav.click();
    vi.advanceTimersByTime(100);
    nav.panel.visualHeight = 110;
    nav.click();
    vi.advanceTimersByTime(100);
    nav.panel.visualHeight = 40;
    nav.click();
    vi.advanceTimersByTime(200);
    expect(nav.classes.has('collapsing')).toBe(true);
    vi.advanceTimersByTime(100);
    expect(nav.classes).toEqual(new Set(['collapse', 'show']));
    expect(nav.attributes.get('aria-expanded')).toBe('true');
  });

  test('ignores bubbled and unrelated transitions, then recovers without transitionend', () => {
    const nav = harness();
    nav.click();
    nav.end({}, 'height');
    nav.end(nav.panel, 'opacity');
    expect(nav.classes.has('collapsing')).toBe(true);
    vi.advanceTimersByTime(300);
    expect(nav.classes).toEqual(new Set(['collapse', 'show']));
    expect(nav.panel.style.height).toBeUndefined();
  });

  test.each([{ reducedMotion: true }, { desktop: true }])('settles immediately with %j', (options) => {
    const nav = harness(options);
    nav.click();
    expect(nav.classes).toEqual(new Set(['collapse', 'show']));
    expect(vi.getTimerCount()).toBe(0);
  });

  test('clears in-flight height on desktop resize and preserves state when returning to mobile', () => {
    const nav = harness();
    nav.click();
    nav.media[0].change(true);
    expect(nav.panel.style.height).toBeUndefined();
    expect(nav.classes).toEqual(new Set(['collapse', 'show']));
    nav.media[0].change(false);
    expect(nav.attributes.get('aria-expanded')).toBe('true');
    nav.click();
    nav.media[1].change(true);
    expect(nav.classes).toEqual(new Set(['collapse']));
    expect(vi.getTimerCount()).toBe(0);
  });

  test('initializes existing expanded markup and tolerates a missing target', () => {
    expect(harness({ expanded: true }).attributes.get('aria-expanded')).toBe('true');
    expect(() => harness({ missingPanel: true })).not.toThrow();
  });

  test('every Playfolio page loads the local controller without the Bootstrap bundle', () => {
    const root = new URL('../../', import.meta.url);
    const pages = ['', 'project_details/'].flatMap((directory) =>
      readdirSync(new URL(directory, root)).filter((file) => file.endsWith('.html'))
        .map((file) => readFileSync(new URL(directory + file, root), 'utf8')),
    ).filter((html) => html.includes('playfolio-page'));
    expect(pages.length).toBeGreaterThan(20);
    for (const html of pages) {
      expect(html).toContain('<script defer src="/js/navbar.js"></script>');
      expect(html).not.toContain('bootstrap.bundle');
    }
  });
});
