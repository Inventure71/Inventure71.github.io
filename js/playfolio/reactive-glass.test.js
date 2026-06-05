import { describe, expect, test, vi } from 'vitest';
import { installReactiveGlassSurface } from './reactive-glass.js';

function createClassList(initial = []) {
  const classes = new Set(initial);

  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    toggle: (name, force) => {
      if (force === undefined ? !classes.has(name) : force) {
        classes.add(name);
        return true;
      }

      classes.delete(name);
      return false;
    },
    contains: (name) => classes.has(name),
  };
}

function createNode({ dataset = {}, parent = null } = {}) {
  return {
    dataset,
    parent,
    classList: createClassList(),
    closest(selector) {
      if (selector === '[data-glass-item]' && Object.hasOwn(dataset, 'glassItem')) return this;
      if (selector === '[data-glass-group]') {
        if (Object.hasOwn(dataset, 'glassGroup')) return this;
        return parent?.dataset?.glassGroup !== undefined ? parent : null;
      }
      return null;
    },
  };
}

function createSurface() {
  const listeners = new Map();
  const children = [];
  const surface = {
    dataset: {},
    classList: createClassList(),
    style: {
      setProperty: vi.fn(),
      removeProperty: vi.fn(),
    },
    addEventListener: vi.fn((eventName, handler) => listeners.set(eventName, handler)),
    getBoundingClientRect: vi.fn(() => ({
      left: 20,
      top: 10,
      width: 200,
      height: 100,
    })),
    contains: (node) => children.includes(node),
    querySelector: (selector) => {
      if (selector !== '.is-glass-target') return null;
      return children.find((child) => child.classList.contains('is-glass-target')) || null;
    },
    _children: children,
    _listeners: listeners,
  };

  return surface;
}

function addItem(surface, tone = 'green') {
  const group = createNode({ dataset: { glassGroup: '' } });
  const item = createNode({ dataset: { glassItem: '', glassTone: tone }, parent: group });
  surface._children.push(item);

  return { group, item };
}

describe('reactive glass surface', () => {
  test('tracks pointer position and item hover state', () => {
    const surface = createSurface();
    const { item } = addItem(surface, 'blue');

    installReactiveGlassSurface(surface);

    expect(surface.dataset.reactiveGlassBound).toBe('true');
    expect(surface.addEventListener).toHaveBeenCalledWith('pointermove', expect.any(Function));

    surface._listeners.get('pointermove')({ target: item, clientX: 170, clientY: 35 });

    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-x', '150.00px');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-y', '25.00px');
    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);
    expect(item.classList.contains('is-glass-target')).toBe(true);
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-color', 'var(--pf-glass-tone-blue)');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-ink', 'var(--pf-ink)');

    surface._listeners.get('pointerleave')();

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);
    expect(item.classList.contains('is-glass-target')).toBe(false);
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-x', '50%');
  });

  test('bridges gaps inside control groups but clears immediately on empty bar space', () => {
    vi.useFakeTimers();

    const surface = createSurface();
    const { group, item: home } = addItem(surface, 'blue');
    const { item: projects } = addItem(surface, 'green');
    projects.parent = group;
    const emptyBar = createNode();

    installReactiveGlassSurface(surface);

    surface._listeners.get('pointermove')({ target: home, clientX: 80, clientY: 45 });
    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);
    expect(home.classList.contains('is-glass-target')).toBe(true);

    surface._listeners.get('pointermove')({ target: group, clientX: 100, clientY: 45 });
    vi.advanceTimersByTime(30);
    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);
    expect(home.classList.contains('is-glass-target')).toBe(true);

    surface._listeners.get('pointermove')({ target: projects, clientX: 120, clientY: 45 });
    expect(projects.classList.contains('is-glass-target')).toBe(true);
    expect(home.classList.contains('is-glass-target')).toBe(false);

    surface._listeners.get('pointermove')({ target: emptyBar, clientX: 120, clientY: 15 });
    expect(surface.classList.contains('is-glass-bar-hovering')).toBe(true);
    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);
    expect(projects.classList.contains('is-glass-target')).toBe(false);

    vi.useRealTimers();
  });

  test('resolves brand and mode tones through theme-aware CSS variables', () => {
    const surface = createSurface();
    const { item: brand } = addItem(surface, 'brand');
    const { item: mode } = addItem(surface, 'mode');

    installReactiveGlassSurface(surface);

    surface._listeners.get('pointermove')({ target: brand, clientX: 80, clientY: 45 });
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-color', 'var(--pf-glass-tone-brand)');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-ink', 'var(--pf-glass-tone-brand-ink)');

    surface._listeners.get('pointermove')({ target: mode, clientX: 120, clientY: 45 });
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-color', 'var(--pf-glass-tone-mode)');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-ink', 'var(--pf-glass-tone-mode-ink)');
  });
});
