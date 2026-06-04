import { afterEach, describe, expect, test, vi } from 'vitest';
import { setupReveals } from './reveal.js';

describe('playfolio reveal behavior', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete global.window;
    delete global.IntersectionObserver;
  });

  test('toggles reveal visibility in both scroll directions', () => {
    const item = {
      classList: {
        toggle: vi.fn(),
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

    expect(item.classList.toggle).toHaveBeenNthCalledWith(1, 'is-visible', true);
    expect(item.classList.toggle).toHaveBeenNthCalledWith(2, 'is-visible', false);
    expect(unobserve).not.toHaveBeenCalled();
  });
});
