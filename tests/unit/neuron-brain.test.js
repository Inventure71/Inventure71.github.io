import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, test, vi } from 'vitest';
import { projectMapItems } from '../../js/project-map-data.js';

const source = readFileSync(new URL('../../js/neuron-brain.js', import.meta.url), 'utf8')
  .replace(/^import .*;\n/gm, '');

function mapHarness({ reducedMotion = true } = {}) {
  function element() {
    const events = new Map();
    return {
      children: [], style: { setProperty() {} }, offsetWidth: 144,
      append(child) { this.children.push(child); },
      setAttribute() {},
      addEventListener: (name, callback) => events.set(name, callback),
      events,
    };
  }
  let top = 80;
  let activity;
  let nextFrame = 0;
  const frames = new Map();
  const windowEvents = new Map();
  const intro = { offsetTop: 20, offsetHeight: 150 };
  const overlay = element();
  const close = element();
  const container = Object.assign(element(), {
    clientWidth: 390,
    querySelector: () => intro,
    insertBefore(child) { this.children.push(child); },
    getBoundingClientRect() { return { top, left: 0, width: 390, height: parseFloat(this.style.height) }; },
  });
  const context = Object.fromEntries(['clearRect', 'setTransform', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'fill'].map(name => [name, vi.fn()]));
  const canvas = Object.assign(element(), { width: 300, height: 150, closest: () => container, getContext: () => context });
  const document = {
    getElementById: id => ({ 'neuron-canvas': canvas, 'neuron-overlay': overlay, 'overlay-title': element(), 'overlay-count': element(), 'overlay-list': element() })[id],
    querySelector: () => close,
    createElement: element,
  };
  const window = {
    innerHeight: 844, devicePixelRatio: 3,
    matchMedia: () => ({ matches: reducedMotion, addEventListener() {} }),
    addEventListener: (name, callback) => windowEvents.set(name, callback),
  };
  runInNewContext(source, {
    document, window, projectMapItems,
    ResizeObserver: class { observe() {} },
    observeElementActivity(_element, callback) { activity = callback; callback(true); },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); },
  });
  function frame(time = 0) {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(time));
  }
  return {
    canvas, context, container, topics: container.children[0].children, frame,
    pendingFrames: () => frames.size,
    scrollTo(nextTop) { top = nextTop; windowEvents.get('scroll')(); },
    setActive: value => activity(value),
  };
}

describe('project map viewport rendering', () => {
  test('retains every topic and the full scrolling graph while bounding high-DPI canvas allocation', () => {
    const map = mapHarness();
    map.frame();
    expect(map.topics).toHaveLength(62);
    expect(parseFloat(map.container.style.height)).toBeGreaterThan(3800);
    expect(map.canvas.width).toBe(390 * 2);
    expect(map.canvas.height).toBe(844 * 2);
    expect(map.topics.every(topic => topic.style.transform.startsWith('translate('))).toBe(true);
    expect(map.topics.every(topic => topic.style.left === undefined && topic.style.top === undefined)).toBe(true);
    // Only the viewport's nodes are painted; all 62 hit targets remain present.
    expect(map.context.arc.mock.calls.length).toBeGreaterThan(0);
    expect(map.context.arc.mock.calls.length).toBeLessThan(20);
  });

  test('redraws a translated slice on scroll in reduced motion without restarting an animation loop', () => {
    const map = mapHarness();
    map.frame();
    expect(map.pendingFrames()).toBe(0);
    const targets = map.topics.map(topic => topic.style.transform);
    map.context.arc.mockClear();
    map.scrollTo(-1700);
    map.frame(100);
    expect(map.canvas.style.transform).toBe('translateY(1700px)');
    expect(map.context.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, -3400);
    expect(map.context.clearRect).toHaveBeenLastCalledWith(0, 1700, 390, 844);
    expect(map.context.arc.mock.calls.every(([, y, radius]) => y + radius + 30 >= 1700 && y - radius - 30 <= 2544)).toBe(true);
    expect(map.topics.map(topic => topic.style.transform)).toEqual(targets);
    expect(map.pendingFrames()).toBe(0);
    map.scrollTo(-10000);
    map.frame(200);
    expect(map.context.clearRect.mock.lastCall[1]).toBe(parseFloat(map.container.style.height) - 844);
    expect(map.canvas.height).toBe(844 * 2);
  });

  test('keeps ambient floating bounded near 30Hz and suspends rendering when inactive', () => {
    const map = mapHarness({ reducedMotion: false });
    map.frame(0);
    const first = map.topics[0].style.transform;
    map.frame(16);
    expect(map.context.clearRect).toHaveBeenCalledTimes(1);
    map.frame(34);
    expect(map.context.clearRect).toHaveBeenCalledTimes(2);
    expect(map.topics[0].style.transform).not.toBe(first);
    map.setActive(false);
    map.scrollTo(-1700);
    expect(map.pendingFrames()).toBe(0);
    map.setActive(true);
    map.frame(100);
    expect(map.context.clearRect).toHaveBeenCalledTimes(3);
    expect(map.context.clearRect).toHaveBeenLastCalledWith(0, 1700, 390, 844);
  });
});
