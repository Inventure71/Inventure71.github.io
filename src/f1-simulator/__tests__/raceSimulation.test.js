import { describe, expect, test } from 'vitest';
import { PROJECT_DRIVERS } from '../drivers.js';
import { createRaceSimulation } from '../raceSimulation.js';
import { TRACK } from '../trackModel.js';
import { getCarCorners, integrateVehiclePhysics } from '../vehiclePhysics.js';

const drivers = [
  { id: 'budget', code: 'BUD', name: 'Budget Buddy', color: '#ff3860', pace: 0.94, racecraft: 0.74 },
  { id: 'noir', code: 'NOI', name: 'Neural Noir', color: '#ff9f1c', pace: 0.98, racecraft: 0.8 },
  { id: 'vinyl', code: 'HOL', name: 'HoloVinyl', color: '#06d6a0', pace: 1.02, racecraft: 0.7 },
  { id: 'clip', code: 'CLP', name: 'ClipClop', color: '#118ab2', pace: 1.05, racecraft: 0.88 },
];

function run(sim, seconds, dt = 1 / 60) {
  let contactCount = 0;
  for (let elapsed = 0; elapsed < seconds; elapsed += dt) {
    sim.step(dt);
    contactCount += sim.snapshot().events.filter((event) => event.type === 'contact').length;
  }
  return contactCount;
}

function polygonsOverlap(a, b) {
  const axes = [a, b].flatMap((corners) => [
    normalize({ x: corners[1].x - corners[0].x, y: corners[1].y - corners[0].y }),
    normalize({ x: corners[3].x - corners[0].x, y: corners[3].y - corners[0].y }),
  ]);

  return axes.every((axis) => {
    const first = project(a, axis);
    const second = project(b, axis);
    return Math.min(first.max, second.max) - Math.max(first.min, second.min) > 0;
  });
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function project(points, axis) {
  const values = points.map((point) => point.x * axis.x + point.y * axis.y);
  return { min: Math.min(...values), max: Math.max(...values) };
}

describe('vehicle physics race simulation', () => {
  test('turns by steering angle and turn radius instead of lateral snapping', () => {
    const car = {
      x: 0,
      y: 0,
      heading: 0,
      steeringAngle: 0,
      speed: 48,
      mass: 798,
      powerNewtons: 15000,
      brakeNewtons: 36000,
      dragCoefficient: 0.72,
      downforceCoefficient: 3.2,
      tireGrip: 2.1,
      trackState: { onTrack: true },
      drsActive: false,
    };

    integrateVehiclePhysics(car, { steering: 0.38, throttle: 0.2, brake: 0 }, 0.5);

    expect(car.x).toBeGreaterThan(10);
    expect(car.y).toBeGreaterThan(0);
    expect(car.heading).toBeGreaterThan(0);
    expect(car.turnRadius).toBeGreaterThan(20);
    expect(car.steeringAngle).toBeLessThanOrEqual(0.38);
  });

  test('advances deterministically for the same seed and driver grid', () => {
    const first = createRaceSimulation({ seed: 71, drivers, totalLaps: 4 });
    const second = createRaceSimulation({ seed: 71, drivers, totalLaps: 4 });

    run(first, 12);
    run(second, 12);

    const signature = (snapshot) => snapshot.cars.map((car) => ({
      id: car.id,
      x: Number(car.x.toFixed(2)),
      y: Number(car.y.toFixed(2)),
      heading: Number(car.heading.toFixed(3)),
      speed: Number(car.speed.toFixed(3)),
      steeringAngle: Number(car.steeringAngle.toFixed(3)),
      raceDistance: Number(car.raceDistance.toFixed(2)),
      tireEnergy: Number(car.tireEnergy.toFixed(2)),
      positionSource: car.positionSource,
    }));

    expect(first.snapshot().cars).toHaveLength(drivers.length);
    expect(signature(first.snapshot())).toEqual(signature(second.snapshot()));
  });

  test('resolves oriented car collisions so bodies cannot phase through each other', () => {
    const sim = createRaceSimulation({ seed: 8, drivers: drivers.slice(0, 2), totalLaps: 3 });
    sim.setCarState('budget', { x: 520, y: 360, heading: 0, speed: 18 });
    sim.setCarState('noir', { x: 535, y: 360, heading: 0, speed: 36 });

    sim.step(1 / 60);

    const snapshot = sim.snapshot();
    const first = snapshot.cars.find((car) => car.id === 'budget');
    const second = snapshot.cars.find((car) => car.id === 'noir');

    expect(polygonsOverlap(getCarCorners(first), getCarCorners(second))).toBe(false);
    expect(snapshot.events.some((event) => event.type === 'contact')).toBe(true);
  });

  test('safety car neutralizes racing, disables DRS, and reduces speed through vehicle controls', () => {
    const sim = createRaceSimulation({ seed: 21, drivers, totalLaps: 5 });
    run(sim, 5);
    const beforeOrder = sim.snapshot().cars.map((car) => car.id);

    sim.setSafetyCar(true);
    run(sim, 8);
    const snapshot = sim.snapshot();

    expect(snapshot.raceControl.mode).toBe('safety-car');
    expect(snapshot.safetyCar.deployed).toBe(true);
    expect(snapshot.cars.map((car) => car.id)).toEqual(beforeOrder);
    expect(snapshot.cars.every((car) => car.drsActive === false)).toBe(true);
    expect(snapshot.cars.every((car) => car.canAttack === false)).toBe(true);
    expect(snapshot.cars[0].speed).toBeLessThanOrEqual(snapshot.rules.safetyCarSpeed + 12);
  });

  test('publishes finite race timing and tyre state for the browser UI', () => {
    const sim = createRaceSimulation({ seed: 31, drivers, totalLaps: 5 });

    expect(sim.snapshot().cars.map((car) => car.id)).toEqual(drivers.map((driver) => driver.id));

    run(sim, 3);
    const snapshot = sim.snapshot();

    snapshot.cars.forEach((car) => {
      expect(Number.isFinite(car.x)).toBe(true);
      expect(Number.isFinite(car.y)).toBe(true);
      expect(Number.isFinite(car.heading)).toBe(true);
      expect(Number.isFinite(car.raceDistance)).toBe(true);
      expect(Number.isFinite(car.tireEnergy)).toBe(true);
      expect(car.tireEnergy).toBeGreaterThan(0);
    });
    snapshot.cars.slice(1).forEach((car) => {
      expect(Number.isFinite(car.gapAheadSeconds)).toBe(true);
      expect(car.gapAheadSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  test('keeps a crowded field racing instead of collapsing into a stationary pile-up', () => {
    const sim = createRaceSimulation({ seed: 1971, drivers: PROJECT_DRIVERS, totalLaps: 6 });

    const contactCount = run(sim, 45);
    const snapshot = sim.snapshot();
    const averageSpeedKph = snapshot.cars.reduce((total, car) => total + car.speedKph, 0) / snapshot.cars.length;
    const laneBuckets = new Set(snapshot.cars.map((car) => Math.round(car.signedOffset / 18))).size;

    expect(snapshot.cars.every((car) => car.positionSource === 'integrated-vehicle')).toBe(true);
    expect(averageSpeedKph).toBeGreaterThan(285);
    expect(Math.min(...snapshot.cars.map((car) => car.speedKph))).toBeGreaterThan(240);
    expect(laneBuckets).toBeGreaterThanOrEqual(5);
    expect(Math.max(...snapshot.cars.map((car) => car.crossTrackError))).toBeLessThan(TRACK.width / 2);
    expect(Math.max(...snapshot.cars.slice(1).map((car) => car.gapAheadSeconds))).toBeLessThan(8);
    expect(contactCount).toBeLessThan(12);
  });
});
