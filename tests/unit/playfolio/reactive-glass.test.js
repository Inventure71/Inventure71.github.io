import { describe, expect, test, vi } from 'vitest';
import { installReactiveGlassSurface } from '../../../js/playfolio/reactive-glass.js';

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

function createNode({
  dataset = {},
  parent = null,
  rect = { left: 80, top: 20, width: 48, height: 28 },
} = {}) {
  return {
    dataset,
    parent,
    classList: createClassList(),
    getBoundingClientRect: vi.fn(() => rect),
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
    matches: vi.fn(() => false),
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
  test('coalesces pointer layout reads into one frame using the latest position', () => {
    const surface = createSurface();
    const { item } = addItem(surface, 'blue');
    const frames = new Map();
    let nextFrame = 0;
    surface.ownerDocument = {
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => {
          frames.set(++nextFrame, callback);
          return nextFrame;
        }),
        cancelAnimationFrame: vi.fn((id) => frames.delete(id)),
      },
    };
    installReactiveGlassSurface(surface);
    frames.get(1)();
    frames.clear();
    surface.getBoundingClientRect.mockClear();
    const move = surface._listeners.get('pointermove');
    move({ target: item, clientX: 50, clientY: 30 });
    move({ target: item, clientX: 70, clientY: 40 });
    move({ target: item, clientX: 170, clientY: 45 });

    expect(item.classList.contains('is-glass-target')).toBe(true);
    expect(frames.size).toBe(1);
    expect(surface.getBoundingClientRect).not.toHaveBeenCalled();
    frames.values().next().value();
    expect(surface.getBoundingClientRect).toHaveBeenCalledOnce();
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-x', '150.00px');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-y', '35.00px');
  });

  test('cancels pending pointer work when the pointer leaves before the next frame', () => {
    const surface = createSurface();
    const { item } = addItem(surface);
    const callbacks = [];
    surface.ownerDocument = {
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => {
          callbacks.push(callback);
          return callbacks.length;
        }),
        cancelAnimationFrame: vi.fn(),
      },
    };
    installReactiveGlassSurface(surface);
    surface._listeners.get('pointermove')({ target: item, clientX: 170, clientY: 45 });
    surface._listeners.get('pointerleave')();
    callbacks[1]();

    expect(surface.ownerDocument.defaultView.cancelAnimationFrame).toHaveBeenCalledWith(2);
    expect(surface.getBoundingClientRect).not.toHaveBeenCalled();
    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);
    expect(surface.style.setProperty).toHaveBeenLastCalledWith('--pf-glass-dy', '0.00px');
  });

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

  test('resolves brand and mode preview tones through theme-aware CSS variables', () => {
    const surface = createSurface();
    const { item: brand } = addItem(surface, 'brand');
    const { item: mode } = addItem(surface, 'mode-preview');

    installReactiveGlassSurface(surface);

    surface._listeners.get('pointermove')({ target: brand, clientX: 80, clientY: 45 });
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-color', 'var(--pf-glass-tone-brand)');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-ink', 'var(--pf-glass-tone-brand-ink)');

    surface._listeners.get('pointermove')({ target: mode, clientX: 120, clientY: 45 });
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-color', 'var(--pf-glass-tone-mode-preview)');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-ink', 'var(--pf-glass-tone-mode-preview-ink)');
  });

  test('primes item hover when a page loads under an already-hovered navbar item', () => {
    let frameCallback = null;
    const surface = createSurface();
    const group = createNode({ dataset: { glassGroup: '' } });
    const item = createNode({
      dataset: { glassItem: '', glassTone: 'green' },
      parent: group,
      rect: { left: 100, top: 30, width: 60, height: 30 },
    });
    surface._children.push(item);
    surface.ownerDocument = {
      querySelectorAll: vi.fn((selector) => (selector === ':hover' ? [surface, group, item] : [])),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => {
          frameCallback = callback;
          return 1;
        }),
      },
    };

    installReactiveGlassSurface(surface);

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);

    frameCallback();

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);
    expect(item.classList.contains('is-glass-target')).toBe(true);
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-x', '110.00px');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-y', '35.00px');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-item-color', 'var(--pf-glass-tone-green)');
  });

  test('restores item hover from stored pointer coordinates after page navigation', () => {
    let frameCallback = null;
    const surface = createSurface();
    const group = createNode({ dataset: { glassGroup: '' } });
    const item = createNode({
      dataset: { glassItem: '', glassTone: 'green' },
      parent: group,
      rect: { left: 100, top: 30, width: 60, height: 30 },
    });
    surface._children.push(item);
    surface.ownerDocument = {
      querySelectorAll: vi.fn((selector) => (selector === ':hover' ? [] : [])),
      elementFromPoint: vi.fn((x, y) => (x === 130 && y === 45 ? item : null)),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => {
          frameCallback = callback;
          return 1;
        }),
        sessionStorage: {
          getItem: vi.fn(() => JSON.stringify({ x: 130, y: 45, time: Date.now() })),
          setItem: vi.fn(),
        },
      },
    };

    installReactiveGlassSurface(surface);
    frameCallback();

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);
    expect(item.classList.contains('is-glass-target')).toBe(true);
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-x', '110.00px');
    expect(surface.style.setProperty).toHaveBeenCalledWith('--pf-glass-y', '35.00px');
  });

  test('does not store hover-only pointer movement as a page-navigation handoff', () => {
    const surface = createSurface();
    const { item } = addItem(surface, 'green');
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    surface.ownerDocument = {
      querySelectorAll: vi.fn(() => []),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => callback()),
        sessionStorage: storage,
      },
    };

    installReactiveGlassSurface(surface);
    surface._listeners.get('pointermove')({ target: item, clientX: 130, clientY: 45 });

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('stores and consumes pointer coordinates only for link clicks that can navigate', () => {
    let frameCallback = null;
    let storedPointer = null;
    const surface = createSurface();
    const group = createNode({ dataset: { glassGroup: '' } });
    const link = createNode({
      dataset: { glassItem: '', glassTone: 'green' },
      parent: group,
      rect: { left: 100, top: 30, width: 60, height: 30 },
    });
    link.href = '/projects.html';
    link.closest = vi.fn((selector) => {
      if (selector === '[data-glass-item]' || selector === 'a[href]') return link;
      if (selector === '[data-glass-group]') return group;
      return null;
    });
    surface._children.push(link);
    const storage = {
      getItem: vi.fn(() => storedPointer),
      setItem: vi.fn((key, value) => {
        storedPointer = value;
      }),
      removeItem: vi.fn(() => {
        storedPointer = null;
      }),
    };
    surface.ownerDocument = {
      querySelectorAll: vi.fn((selector) => (selector === ':hover' ? [surface, group, link] : [])),
      elementFromPoint: vi.fn((x, y) => (x === 130 && y === 45 ? link : null)),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => {
          frameCallback = callback;
          return 1;
        }),
        sessionStorage: storage,
      },
    };

    installReactiveGlassSurface(surface);
    surface._listeners.get('click')({ target: link, clientX: 130, clientY: 45 });

    expect(storage.setItem).toHaveBeenCalledOnce();

    frameCallback();

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);
    expect(link.classList.contains('is-glass-target')).toBe(true);
    expect(storage.removeItem).toHaveBeenCalled();
  });

  test('clears the current hover state when a same-tab navigation click is handed off', () => {
    const surface = createSurface();
    const group = createNode({ dataset: { glassGroup: '' } });
    const link = createNode({ dataset: { glassItem: '', glassTone: 'green' }, parent: group });
    link.href = '/apps.html';
    link.closest = vi.fn((selector) => {
      if (selector === '[data-glass-item]' || selector === 'a[href]') return link;
      if (selector === '[data-glass-group]') return group;
      return null;
    });
    surface._children.push(link);
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    surface.ownerDocument = {
      querySelectorAll: vi.fn(() => []),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => callback()),
        sessionStorage: storage,
      },
    };

    installReactiveGlassSurface(surface);
    surface._listeners.get('pointermove')({ target: link, clientX: 130, clientY: 45 });

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);
    expect(link.classList.contains('is-glass-target')).toBe(true);

    surface._listeners.get('click')({ target: link, clientX: 130, clientY: 45 });

    expect(storage.setItem).toHaveBeenCalledOnce();
    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);
    expect(surface.classList.contains('is-glass-bar-hovering')).toBe(false);
    expect(link.classList.contains('is-glass-target')).toBe(false);
  });

  test('does not store pointer coordinates for modified link clicks', () => {
    const surface = createSurface();
    const group = createNode({ dataset: { glassGroup: '' } });
    const link = createNode({ dataset: { glassItem: '', glassTone: 'green' }, parent: group });
    link.closest = vi.fn((selector) => {
      if (selector === '[data-glass-item]' || selector === 'a[href]') return link;
      if (selector === '[data-glass-group]') return group;
      return null;
    });
    surface._children.push(link);
    const storage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    surface.ownerDocument = {
      querySelectorAll: vi.fn(() => []),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => callback()),
        sessionStorage: storage,
      },
    };

    installReactiveGlassSurface(surface);
    surface._listeners.get('click')({ target: link, clientX: 130, clientY: 45, metaKey: true });
    surface._listeners.get('click')({ target: link, clientX: 130, clientY: 45, ctrlKey: true });
    surface._listeners.get('click')({ target: link, clientX: 130, clientY: 45, shiftKey: true });
    surface._listeners.get('click')({ target: link, clientX: 130, clientY: 45, altKey: true });
    surface._listeners.get('click')({ target: link, clientX: 130, clientY: 45, defaultPrevented: true });

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  test('clears hover state when the window loses focus without pointerleave', () => {
    const surface = createSurface();
    const { item } = addItem(surface, 'green');
    const windowListeners = new Map();
    surface.ownerDocument = {
      querySelectorAll: vi.fn(() => []),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => callback()),
        addEventListener: vi.fn((eventName, handler) => windowListeners.set(eventName, handler)),
      },
    };

    installReactiveGlassSurface(surface);
    surface._listeners.get('pointermove')({ target: item, clientX: 130, clientY: 45 });

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);

    windowListeners.get('blur')();

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);
    expect(item.classList.contains('is-glass-target')).toBe(false);
  });

  test('clears hover state when the page becomes hidden without pointerleave', () => {
    const surface = createSurface();
    const { item } = addItem(surface, 'green');
    const documentListeners = new Map();
    surface.ownerDocument = {
      visibilityState: 'visible',
      querySelectorAll: vi.fn(() => []),
      addEventListener: vi.fn((eventName, handler) => documentListeners.set(eventName, handler)),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => callback()),
      },
    };

    installReactiveGlassSurface(surface);
    surface._listeners.get('pointermove')({ target: item, clientX: 130, clientY: 45 });

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);

    surface.ownerDocument.visibilityState = 'hidden';
    documentListeners.get('visibilitychange')();

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);
    expect(item.classList.contains('is-glass-target')).toBe(false);
  });

  test('clears hover state when pagehide fires during navigation teardown', () => {
    const surface = createSurface();
    const { item } = addItem(surface, 'green');
    const windowListeners = new Map();
    surface.ownerDocument = {
      querySelectorAll: vi.fn(() => []),
      defaultView: {
        requestAnimationFrame: vi.fn((callback) => callback()),
        addEventListener: vi.fn((eventName, handler) => windowListeners.set(eventName, handler)),
      },
    };

    installReactiveGlassSurface(surface);
    surface._listeners.get('pointermove')({ target: item, clientX: 130, clientY: 45 });

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(true);

    windowListeners.get('pagehide')();

    expect(surface.classList.contains('is-glass-item-hovering')).toBe(false);
    expect(item.classList.contains('is-glass-target')).toBe(false);
  });
});
