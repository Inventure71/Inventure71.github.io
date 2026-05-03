import { describe, expect, test } from 'vitest';
import { createFreshTrackSeed } from './paddockjs-track-seed.js';

describe('createFreshTrackSeed', () => {
  test('uses browser crypto when available', () => {
    const seed = createFreshTrackSeed({
      cryptoSource: {
        getRandomValues(values) {
          values[0] = 123456789;
          return values;
        },
      },
    });

    expect(seed).toBe(123456789);
  });

  test('falls back to time and Math.random when crypto is unavailable', () => {
    const seed = createFreshTrackSeed({
      cryptoSource: null,
      now: () => 1777650000000,
      random: () => 0.5,
    });

    expect(seed).toBeGreaterThan(0);
    expect(Number.isInteger(seed)).toBe(true);
  });
});
