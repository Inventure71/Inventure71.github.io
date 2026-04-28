import { describe, expect, test } from 'vitest';
import { createRenderSnapshot } from '../renderSnapshot.js';

describe('render snapshot interpolation', () => {
  test('interpolates positions and headings without mutating the simulation snapshot', () => {
    const snapshot = {
      time: 1,
      cars: [
        {
          id: 'leader',
          previousX: 10,
          previousY: 20,
          previousHeading: Math.PI - 0.1,
          x: 30,
          y: 60,
          heading: -Math.PI + 0.1,
        },
      ],
      safetyCar: {
        previousX: 100,
        previousY: 200,
        previousHeading: 0,
        x: 120,
        y: 240,
        heading: 0.4,
      },
    };

    const interpolated = createRenderSnapshot(snapshot, 0.5);

    expect(interpolated).not.toBe(snapshot);
    expect(interpolated.cars[0]).not.toBe(snapshot.cars[0]);
    expect(interpolated.cars[0].x).toBe(20);
    expect(interpolated.cars[0].y).toBe(40);
    expect(interpolated.cars[0].heading).toBeCloseTo(Math.PI);
    expect(interpolated.safetyCar.x).toBe(110);
    expect(interpolated.safetyCar.y).toBe(220);
    expect(interpolated.safetyCar.heading).toBeCloseTo(0.2);
    expect(snapshot.cars[0].x).toBe(30);
  });
});
