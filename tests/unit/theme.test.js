import { afterEach, describe, expect, test, vi } from 'vitest';

function createIcon(initialClass, label, events) {
  const classes = new Set(initialClass.split(/\s+/).filter(Boolean));
  const log = [];

  return {
    className: initialClass,
    log,
    classList: {
      add: (...names) => {
        names.forEach((name) => {
          log.push(`add:${name}`);
          events?.push(`${label}:add:${name}`);
          classes.add(name);
        });
      },
      remove: (...names) => {
        names.forEach((name) => {
          log.push(`remove:${name}`);
          events?.push(`${label}:remove:${name}`);
          classes.delete(name);
        });
      },
      contains: (name) => classes.has(name),
    },
  };
}

function createThemeHarness({ prefersDark = false, prefersReducedMotion = false } = {}) {
  const documentListeners = new Map();
  const attributes = new Map();
  const events = [];
  const currentIcon = createIcon('bi bi-sun', 'current', events);
  const previewIcon = createIcon('bi bi-moon', 'preview', events);
  const buttonClasses = new Set();
  const button = {
    classList: {
      add: (...names) => {
        names.forEach((name) => {
          events.push(`button-class-add:${name}`);
          buttonClasses.add(name);
        });
      },
      remove: (...names) => {
        names.forEach((name) => {
          events.push(`button-class-remove:${name}`);
          buttonClasses.delete(name);
        });
      },
      contains: (name) => buttonClasses.has(name),
    },
    dataset: new Proxy({}, {
      set(target, property, value) {
        events.push(`dataset:${String(property)}:${value}`);
        target[property] = value;
        return true;
      },
    }),
    setAttribute: vi.fn((name, value) => attributes.set(name, String(value))),
    getAttribute: vi.fn((name) => attributes.get(name)),
    querySelector: vi.fn((selector) => {
      if (selector === '[data-theme-current-icon]') return currentIcon;
      if (selector === '[data-theme-preview-icon]') return previewIcon;
      return null;
    }),
  };

  globalThis.document = {
    documentElement: {
      dataset: {},
      style: {},
    },
    querySelectorAll: vi.fn((selector) => (selector === '[data-theme-toggle]' ? [button] : [])),
    addEventListener: vi.fn((eventName, handler) => documentListeners.set(eventName, handler)),
  };
  globalThis.window = {
    matchMedia: vi.fn((query) => ({
      matches: query.includes('prefers-color-scheme') ? prefersDark : prefersReducedMotion,
      addEventListener: vi.fn(),
    })),
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
  globalThis.localStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
  };

  return { attributes, button, currentIcon, documentListeners, events, previewIcon };
}

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
  vi.unstubAllGlobals();
  delete globalThis.document;
  delete globalThis.window;
  delete globalThis.localStorage;
});

describe('theme toggle', () => {
  test('does not rewrite icon classes while initializing dark mode', async () => {
    const { currentIcon, documentListeners, previewIcon } = createThemeHarness({ prefersDark: true });

    await import('../../js/theme.js');
    documentListeners.get('DOMContentLoaded')();

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(currentIcon.classList.contains('bi-sun')).toBe(true);
    expect(currentIcon.classList.contains('bi-moon')).toBe(false);
    expect(previewIcon.classList.contains('bi-moon')).toBe(true);
    expect(previewIcon.classList.contains('bi-sun')).toBe(false);
    expect(currentIcon.log).toEqual([]);
    expect(previewIcon.log).toEqual([]);
  });

  test('keeps the static icon pair while toggling the committed theme after a tap', async () => {
    vi.useFakeTimers();
    const { attributes, button, currentIcon, documentListeners, previewIcon } = createThemeHarness();

    await import('../../js/theme.js');
    documentListeners.get('DOMContentLoaded')();

    expect(document.documentElement.dataset.theme).toBe('light');
    expect(currentIcon.classList.contains('bi-sun')).toBe(true);
    expect(previewIcon.classList.contains('bi-moon')).toBe(true);

    documentListeners.get('click')({
      target: {
        closest: vi.fn((selector) => (selector === '[data-theme-toggle]' ? button : null)),
      },
    });
    vi.advanceTimersByTime(170);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button.dataset.themeCurrent).toBe('dark');
    expect(button.dataset.themePreview).toBe('light');
    expect(currentIcon.classList.contains('bi-sun')).toBe(true);
    expect(currentIcon.classList.contains('bi-moon')).toBe(false);
    expect(previewIcon.classList.contains('bi-moon')).toBe(true);
    expect(previewIcon.classList.contains('bi-sun')).toBe(false);
    expect(attributes.get('aria-label')).toBe('Switch to light mode');
  });

  test('uses the same preview animation state for click toggles before committing the theme', async () => {
    vi.useFakeTimers();
    const { button, documentListeners, events } = createThemeHarness();

    await import('../../js/theme.js');
    documentListeners.get('DOMContentLoaded')();

    documentListeners.get('click')({
      target: {
        closest: vi.fn((selector) => (selector === '[data-theme-toggle]' ? button : null)),
      },
    });

    expect(button.classList.contains('is-theme-switching')).toBe(true);
    expect(button.dataset.themeSwitchFrom).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button.dataset.themeCurrent).toBe('light');
    expect(button.dataset.themePreview).toBe('dark');

    vi.advanceTimersByTime(170);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(button.classList.contains('is-theme-switching')).toBe(false);
    expect(button.dataset.themeSwitchFrom).toBeUndefined();
    expect(events).toContain('button-class-add:is-theme-switching');
    expect(events).toContain('button-class-remove:is-theme-switching');

    vi.useRealTimers();
  });
});
