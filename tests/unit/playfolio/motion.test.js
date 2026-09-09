import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { createCodexWallHitParticles, setupCodexAmbassadorLogo, setupPortraitCycle } from '../../../js/playfolio/motion.js';

function createClassList() {
  const classes = new Set();

  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
  };
}

function createStyle() {
  const props = new Map();

  return {
    setProperty: vi.fn((name, value) => props.set(name, value)),
    getPropertyValue: (name) => props.get(name),
    _props: props,
  };
}

function createElement(tagName) {
  const listeners = new Map();
  const children = [];
  const element = {
    tagName,
    children,
    classList: createClassList(),
    style: createStyle(),
    appendChild: vi.fn((child) => {
      children.push(child);
      child.parentNode = element;
      return child;
    }),
    remove: vi.fn(() => {
      element.wasRemoved = true;
    }),
    addEventListener: vi.fn((eventName, handler) => listeners.set(eventName, handler)),
    _listeners: listeners,
  };

  return element;
}

function createCodexLogoHarness({
  reducedMotion = false,
  stageRect = {
    left: 100,
    right: 200,
    top: 100,
    bottom: 200,
    width: 100,
    height: 100,
  },
  logoRect = {
    left: 145,
    right: 195,
    top: 145,
    bottom: 195,
    width: 50,
    height: 50,
  },
} = {}) {
  const listeners = new Map();
  const documentListeners = new Map();
  let frameCallback = null;
  const stageChildren = [];
  const ownerDocument = {
    createElement: vi.fn((tagName) => createElement(tagName)),
    addEventListener: vi.fn((eventName, handler) => documentListeners.set(eventName, handler)),
  };
  const stage = {
    ownerDocument,
    appendChild: vi.fn((child) => {
      stageChildren.push(child);
      child.parentNode = stage;
      return child;
    }),
    getBoundingClientRect: vi.fn(() => stageRect),
  };
  const logo = {
    classList: createClassList(),
    style: {},
    querySelector: vi.fn(() => null),
    closest: vi.fn((selector) => (selector === '.pf-portrait-stage' ? stage : null)),
    getBoundingClientRect: vi.fn(() => logoRect),
    addEventListener: vi.fn((eventName, handler) => listeners.set(eventName, handler)),
  };
  const root = {
    querySelector: vi.fn((selector) => (selector === '[data-codex-ambassador-logo]' ? logo : null)),
  };

  global.window = {
    matchMedia: vi.fn(() => ({ matches: reducedMotion })),
    requestAnimationFrame: vi.fn((callback) => {
      frameCallback = callback;
      return 1;
    }),
    cancelAnimationFrame: vi.fn(),
    addEventListener: vi.fn(),
  };
  ownerDocument.defaultView = global.window;
  vi.spyOn(performance, 'now').mockReturnValue(1000);

  return {
    ownerDocument,
    documentListeners,
    logo,
    listeners,
    root,
    stage,
    stageChildren,
    runFrame: (time = 2000) => frameCallback(time),
  };
}

function parseTranslate3d(transform) {
  const numberPattern = '-?\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?';
  const match = transform.match(new RegExp(`translate3d\\((${numberPattern})px, (${numberPattern})px, 0\\)`, 'i'));

  return match ? { x: Number(match[1]), y: Number(match[2]) } : null;
}

describe('playfolio motion behavior', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    delete global.window;
  });

  test('pauses an offscreen Codex flight and resumes its position without a time jump', () => {
    const harness = createCodexLogoHarness();
    let observe;
    window.IntersectionObserver = class {
      constructor(callback) { observe = callback; }
      observe() {}
    };
    const setVisible = (isIntersecting) => observe([{ target: harness.stage, isIntersecting }]);

    setupCodexAmbassadorLogo(harness.root);
    setVisible(true);
    harness.listeners.get('pointerenter')();
    harness.runFrame(1016);
    const position = harness.logo.style.transform;
    const scheduled = window.requestAnimationFrame.mock.calls.length;

    setVisible(false);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    harness.runFrame(5000);
    expect(harness.logo.style.transform).toBe(position);
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(scheduled);
    expect(harness.logo.classList.contains('is-flying')).toBe(true);

    vi.mocked(performance.now).mockReturnValue(6000);
    setVisible(true);
    harness.runFrame(6000);
    expect(harness.logo.style.transform).toBe(position);
    expect(window.requestAnimationFrame.mock.calls.length).toBeGreaterThan(scheduled);
  });

  test('defers Codex video download until visible and pauses playback in hidden tabs', () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', {});
    const harness = createCodexLogoHarness();
    Object.assign(window, { setTimeout, clearTimeout });
    const source = { dataset: { src: '/codex.webm' } };
    const video = {
      dataset: { loadDelayMs: '10' },
      querySelector: () => source,
      load: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
    };
    harness.logo.querySelector.mockReturnValue(video);
    let observe;
    window.IntersectionObserver = class {
      constructor(callback) { observe = callback; }
      observe() {}
    };
    setupCodexAmbassadorLogo(harness.root);
    vi.advanceTimersByTime(10);
    expect(video.load).not.toHaveBeenCalled();

    observe([{ target: harness.stage, isIntersecting: true }]);
    expect(source.src).toBe('/codex.webm');
    expect(video.load).toHaveBeenCalledOnce();
    expect(video.play).toHaveBeenCalledOnce();

    video.pause.mockClear();
    harness.ownerDocument.visibilityState = 'hidden';
    harness.documentListeners.get('visibilitychange')();
    expect(video.pause).toHaveBeenCalledOnce();
    harness.ownerDocument.visibilityState = 'visible';
    harness.documentListeners.get('visibilitychange')();
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(video.load).toHaveBeenCalledOnce();
  });

  test('cancels a pending portrait change while offscreen and resumes one timer on return', () => {
    vi.useFakeTimers();
    const harness = createCodexLogoHarness();
    Object.assign(window, { setTimeout, clearTimeout, setInterval, clearInterval });
    vi.stubGlobal('Image', class {});
    const image = {
      ownerDocument: harness.ownerDocument,
      dataset: { cycleImages: 'one.webp,two.webp' },
      src: 'one.webp',
      getAttribute: () => 'one.webp',
      classList: createClassList(),
      addEventListener: vi.fn(),
    };
    let observe;
    window.IntersectionObserver = class {
      constructor(callback) { observe = callback; }
      observe() {}
    };
    setupPortraitCycle({ querySelector: () => image });
    observe([{ target: image, isIntersecting: true }]);
    vi.advanceTimersByTime(2400);
    expect(image.classList.contains('is-switching')).toBe(true);
    observe([{ target: image, isIntersecting: false }]);
    vi.advanceTimersByTime(6000);
    expect(image.src).toBe('one.webp');
    expect(image.classList.contains('is-switching')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);

    observe([{ target: image, isIntersecting: true }]);
    observe([{ target: image, isIntersecting: true }]);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2580);
    expect(image.src).toBe('two.webp');
  });

  test('does not draw an internal portrait-stage wall', () => {
    const css = readFileSync(path.join(process.cwd(), 'css/playfolio/motion.css'), 'utf8');

    expect(css).not.toContain('.pf-portrait-stage::before');
    expect(css).toContain('.pf-portrait-stage.is-inner-wall-enabled::before');
  });

  test('lets the Codex logo hit the portrait-stage wall without a collision margin', () => {
    const harness = createCodexLogoHarness();
    vi.spyOn(Math, 'random').mockReturnValue(0.85);

    setupCodexAmbassadorLogo(harness.root);
    harness.listeners.get('pointerenter')();
    harness.runFrame();

    expect(parseTranslate3d(harness.logo.style.transform)).toEqual({
      x: 5,
      y: expect.any(Number),
    });
    expect(parseTranslate3d(harness.logo.style.transform).y).toBeLessThan(0);
  });

  test('creates directional speed-scaled Codex particles when the logo hits a wall', () => {
    const harness = createCodexLogoHarness();
    vi.spyOn(Math, 'random').mockReturnValue(0.85);

    setupCodexAmbassadorLogo(harness.root);
    harness.listeners.get('pointerenter')();
    harness.runFrame();

    expect(harness.stageChildren.length).toBeGreaterThanOrEqual(1);
    const burst = harness.stageChildren[0];
    expect(burst.classList.contains('pf-codex-wall-burst')).toBe(true);
    expect(burst.style.getPropertyValue('--burst-x')).toBe('100.00%');
    expect(Number(burst.style.getPropertyValue('--burst-y').replace('%', ''))).toBeLessThan(60);
    expect(Number(burst.style.getPropertyValue('--burst-intensity'))).toBeGreaterThan(0.7);
    expect(burst.children).toHaveLength(7);

    const firstParticle = burst.children[0];
    expect(firstParticle.classList.contains('pf-codex-wall-particle')).toBe(true);
    expect(Number(firstParticle.style.getPropertyValue('--particle-dx'))).toBeLessThan(0);
    expect(Math.abs(Number(firstParticle.style.getPropertyValue('--particle-dy')))).toBeGreaterThan(0);
    expect(Number(firstParticle.style.getPropertyValue('--particle-distance').replace('px', ''))).toBeGreaterThan(30);
    expect(Number(firstParticle.style.getPropertyValue('--particle-tx').replace('px', ''))).toBeLessThan(0);
    expect(Number(firstParticle.style.getPropertyValue('--particle-glow').replace('px', ''))).toBeGreaterThan(5);

    burst._listeners.get('animationend')();
    expect(burst.remove).toHaveBeenCalled();
  });

  test('accelerates the Codex logo within a flying run until it resets', () => {
    const harness = createCodexLogoHarness({
      stageRect: {
        left: 100,
        right: 1100,
        top: 100,
        bottom: 1100,
        width: 1000,
        height: 1000,
      },
      logoRect: {
        left: 200,
        right: 250,
        top: 200,
        bottom: 250,
        width: 50,
        height: 50,
      },
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.85);

    setupCodexAmbassadorLogo(harness.root);
    harness.listeners.get('pointerenter')();

    harness.runFrame(1016);
    const firstPosition = parseTranslate3d(harness.logo.style.transform);
    harness.runFrame(1032);
    const secondPosition = parseTranslate3d(harness.logo.style.transform);

    expect(secondPosition.x - firstPosition.x).toBeGreaterThan(firstPosition.x);
  });

  test('does not stop a Codex flight solely because wall-clock time elapsed', () => {
    const harness = createCodexLogoHarness({
      stageRect: {
        left: 100,
        right: 1100,
        top: 100,
        bottom: 1100,
        width: 1000,
        height: 1000,
      },
      logoRect: {
        left: 200,
        right: 250,
        top: 200,
        bottom: 250,
        width: 50,
        height: 50,
      },
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    setupCodexAmbassadorLogo(harness.root);
    harness.listeners.get('pointerenter')();
    harness.runFrame(1016);
    expect(harness.logo.classList.contains('is-flying')).toBe(true);

    harness.runFrame(10050);

    expect(harness.logo.classList.contains('is-flying')).toBe(true);
    expect(harness.logo.style.transform).toContain('translate3d(');
  });

  test('uses the mouse approach direction when pointer coordinates are available', () => {
    const harness = createCodexLogoHarness({
      stageRect: {
        left: 100,
        right: 1100,
        top: 100,
        bottom: 1100,
        width: 1000,
        height: 1000,
      },
      logoRect: {
        left: 200,
        right: 250,
        top: 200,
        bottom: 250,
        width: 50,
        height: 50,
      },
    });
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);

    setupCodexAmbassadorLogo(harness.root);
    harness.listeners.get('pointerenter')({ clientX: 200, clientY: 225 });
    harness.runFrame(1016);
    const firstDirection = parseTranslate3d(harness.logo.style.transform);

    expect(firstDirection.x).toBeGreaterThan(0);
    expect(Math.abs(firstDirection.y)).toBeLessThan(0.0001);
    expect(randomSpy).not.toHaveBeenCalled();
  });

  test('starts each Codex logo flight with a randomized direction while preserving launch speed', () => {
    const baseHarness = createCodexLogoHarness({
      stageRect: {
        left: 100,
        right: 1100,
        top: 100,
        bottom: 1100,
        width: 1000,
        height: 1000,
      },
      logoRect: {
        left: 200,
        right: 250,
        top: 200,
        bottom: 250,
        width: 50,
        height: 50,
      },
    });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    setupCodexAmbassadorLogo(baseHarness.root);
    baseHarness.listeners.get('pointerenter')();
    baseHarness.runFrame(1016);
    const firstDirection = parseTranslate3d(baseHarness.logo.style.transform);

    vi.restoreAllMocks();

    const alternateHarness = createCodexLogoHarness({
      stageRect: {
        left: 100,
        right: 1100,
        top: 100,
        bottom: 1100,
        width: 1000,
        height: 1000,
      },
      logoRect: {
        left: 200,
        right: 250,
        top: 200,
        bottom: 250,
        width: 50,
        height: 50,
      },
    });
    vi.spyOn(Math, 'random').mockReturnValue(0.25);

    setupCodexAmbassadorLogo(alternateHarness.root);
    alternateHarness.listeners.get('pointerenter')();
    alternateHarness.runFrame(1016);
    const secondDirection = parseTranslate3d(alternateHarness.logo.style.transform);

    expect(secondDirection).not.toEqual(firstDirection);
    expect(Math.hypot(secondDirection.x, secondDirection.y)).toBeCloseTo(Math.hypot(firstDirection.x, firstDirection.y), 6);
  });

  test('does not create wall particles when reduced motion is enabled', () => {
    const stage = {
      ownerDocument: { createElement: vi.fn() },
      appendChild: vi.fn(),
    };

    createCodexWallHitParticles(stage, {
      x: 100,
      y: 50,
      normalX: -1,
      normalY: 0,
      speed: 900,
      skipMotion: true,
    });

    expect(stage.appendChild).not.toHaveBeenCalled();
  });

  test('bounds active wall bursts so fast runs cannot accumulate stale DOM', () => {
    const existingBursts = Array.from({ length: 6 }, () => ({ remove: vi.fn() }));
    const stage = {
      ownerDocument: { createElement: vi.fn((tagName) => createElement(tagName)) },
      appendChild: vi.fn(),
      querySelectorAll: vi.fn(() => existingBursts),
    };

    createCodexWallHitParticles(stage, {
      x: 100,
      y: 50,
      normalX: -1,
      normalY: 0,
      speed: 900,
    });

    expect(existingBursts[0].remove).toHaveBeenCalled();
    expect(existingBursts[1].remove).toHaveBeenCalled();
    expect(existingBursts[2].remove).toHaveBeenCalled();
    expect(existingBursts[3].remove).not.toHaveBeenCalled();
    expect(stage.appendChild).toHaveBeenCalled();
  });
});
