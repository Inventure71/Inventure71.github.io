import { afterEach, describe, expect, test, vi } from 'vitest';
import { setupReveals } from '../../../js/playfolio/reveal.js';

describe('playfolio reveal behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.window;
    delete global.IntersectionObserver;
  });

  test('reveals a section once and leaves it visible when it leaves the viewport', () => {
    const item = {
      classList: {
        add: vi.fn(),
      },
    };
    const root = {
      querySelectorAll: vi.fn(() => [item]),
    };
    const observe = vi.fn();
    const unobserve = vi.fn();
    let observerCallback;

    global.window = { IntersectionObserver: true };
    global.IntersectionObserver = vi.fn(function intersectionObserver(callback) {
      observerCallback = callback;
      return { observe, unobserve };
    });

    setupReveals(root);

    expect(observe).toHaveBeenCalledWith(item);
    observerCallback([
      { target: item, isIntersecting: true },
      { target: item, isIntersecting: false },
    ]);

    expect(item.classList.add).toHaveBeenCalledWith('is-reveal-ready');
    expect(item.classList.add).toHaveBeenCalledWith('is-visible');
    expect(unobserve).toHaveBeenCalledOnce();
    expect(unobserve).toHaveBeenCalledWith(item);
  });

  test.each([false, true])('shows content immediately when reduced motion is %s and observation is unavailable', (reduce) => {
    const item = { classList: { add: vi.fn() } };
    global.window = { matchMedia: () => ({ matches: reduce }) };
    setupReveals({ querySelectorAll: () => [item] });
    expect(item.classList.add).toHaveBeenCalledWith('is-visible');
    expect(item.classList.add).not.toHaveBeenCalledWith('is-reveal-ready');
  });

  test('does not create an observer when reduced motion is requested', () => {
    const item = { classList: { add: vi.fn() } };
    global.window = { IntersectionObserver: true, matchMedia: () => ({ matches: true }) };
    global.IntersectionObserver = vi.fn();
    setupReveals({ querySelectorAll: () => [item] });
    expect(item.classList.add).toHaveBeenCalledWith('is-visible');
    expect(global.IntersectionObserver).not.toHaveBeenCalled();
  });
});
