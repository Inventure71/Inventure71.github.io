import { describe, expect, test } from 'vitest';
import { createDriverInput, decideDriverControls } from '../driverController.js';
import { createRaceSimulation } from '../raceSimulation.js';
import { VEHICLE_LIMITS } from '../vehiclePhysics.js';

const drivers = [
  { id: 'leader', code: 'LED', name: 'Leader', color: '#ff3860', pace: 1, racecraft: 0.78 },
  { id: 'chaser', code: 'CHS', name: 'Chaser', color: '#118ab2', pace: 1, racecraft: 0.86 },
];

describe('driver controller', () => {
  test('exposes real driving inputs as clamped vehicle controls', () => {
    const input = createDriverInput();

    input.steer(VEHICLE_LIMITS.maxSteer * 2);
    input.accelerate(1.4);
    input.brake(-0.2);

    expect(input.controls()).toEqual({
      steering: VEHICLE_LIMITS.maxSteer,
      throttle: 1,
      brake: 0,
    });
  });

  test('decides how to drive without integrating the car physics state', () => {
    const sim = createRaceSimulation({
      seed: 12,
      drivers,
      totalLaps: 3,
      rules: { standingStart: false },
    });
    const chaser = sim.cars.find((car) => car.id === 'chaser');
    const before = {
      x: chaser.x,
      y: chaser.y,
      heading: chaser.heading,
      speed: chaser.speed,
      tireEnergy: chaser.tireEnergy,
    };

    const controls = decideDriverControls({
      car: chaser,
      orderIndex: 1,
      race: sim.driverRaceContext(),
    });

    expect(controls.steering).toBeGreaterThanOrEqual(-VEHICLE_LIMITS.maxSteer);
    expect(controls.steering).toBeLessThanOrEqual(VEHICLE_LIMITS.maxSteer);
    expect(controls.throttle).toBeGreaterThanOrEqual(0);
    expect(controls.throttle).toBeLessThanOrEqual(1);
    expect(controls.brake).toBeGreaterThanOrEqual(0);
    expect(controls.brake).toBeLessThanOrEqual(1);
    expect({
      x: chaser.x,
      y: chaser.y,
      heading: chaser.heading,
      speed: chaser.speed,
      tireEnergy: chaser.tireEnergy,
    }).toEqual(before);
  });
});
