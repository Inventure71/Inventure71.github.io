import { describe, expect, test } from 'vitest';
import { PROJECT_DRIVERS } from '../drivers.js';
import { createRaceSimulation } from '../raceSimulation.js';
import { buildTrackModel, offsetTrackPoint, pointAt, TRACK } from '../trackModel.js';
import { getCarCorners, integrateVehiclePhysics, VEHICLE_LIMITS } from '../vehiclePhysics.js';

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

function trackSignature(track) {
  return track.centerlineControls.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join('|');
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

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsIntersect(a, b, c, d) {
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

describe('vehicle physics race simulation', () => {
  test('generates a non-self-intersecting circuit centerline', () => {
    const track = buildTrackModel(TRACK);
    const points = track.samples.filter((_, index) => index % 6 === 0);
    const intersections = [];

    for (let first = 0; first < points.length - 1; first += 1) {
      for (let second = first + 2; second < points.length - 1; second += 1) {
        const sharesLoopClosure = first === 0 && second >= points.length - 3;
        if (sharesLoopClosure) continue;
        if (segmentsIntersect(points[first], points[first + 1], points[second], points[second + 1])) {
          intersections.push([first, second]);
        }
      }
    }

    expect(intersections).toEqual([]);
  });

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

  test('runs deterministically on generated track seeds while changing circuit geometry', () => {
    const first = createRaceSimulation({ seed: 71, trackSeed: 10101, drivers, totalLaps: 4 });
    const repeated = createRaceSimulation({ seed: 71, trackSeed: 10101, drivers, totalLaps: 4 });
    const differentTrack = createRaceSimulation({ seed: 71, trackSeed: 20202, drivers, totalLaps: 4 });

    expect(trackSignature(first.snapshot().track)).toBe(trackSignature(repeated.snapshot().track));
    expect(trackSignature(first.snapshot().track)).not.toBe(trackSignature(differentTrack.snapshot().track));

    run(first, 4);
    run(repeated, 4);

    const compactState = (snapshot) => snapshot.cars.map((car) => ({
      id: car.id,
      x: Number(car.x.toFixed(2)),
      y: Number(car.y.toFixed(2)),
      raceDistance: Number(car.raceDistance.toFixed(2)),
      surface: car.surface,
    }));

    expect(first.snapshot().track.drsZones).toHaveLength(3);
    expect(compactState(first.snapshot())).toEqual(compactState(repeated.snapshot()));
    expect(first.snapshot().cars.every((car) => car.surface === 'track')).toBe(true);
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

  test('resolves nose-to-tail contact across the full rendered car length', () => {
    const sim = createRaceSimulation({ seed: 8, drivers: drivers.slice(0, 2), totalLaps: 3 });
    const trackPoint = pointAt(sim.snapshot().track, 960);
    sim.setCarState('budget', { x: trackPoint.x, y: trackPoint.y, heading: trackPoint.heading, speed: 26 });
    sim.setCarState('noir', {
      x: trackPoint.x + Math.cos(trackPoint.heading) * 44,
      y: trackPoint.y + Math.sin(trackPoint.heading) * 44,
      heading: trackPoint.heading,
      speed: 22,
    });

    sim.step(1 / 60);

    const snapshot = sim.snapshot();
    const first = snapshot.cars.find((car) => car.id === 'budget');
    const second = snapshot.cars.find((car) => car.id === 'noir');

    expect(polygonsOverlap(getCarCorners(first), getCarCorners(second))).toBe(false);
    expect(snapshot.events.some((event) => event.type === 'contact')).toBe(true);
  });

  test('protects the nose and rear collision envelope before visible overlap', () => {
    const sim = createRaceSimulation({ seed: 11, drivers: drivers.slice(0, 2), totalLaps: 3 });
    const trackPoint = pointAt(sim.snapshot().track, 1320);
    const gap = VEHICLE_LIMITS.carLength * 0.93;
    sim.setCarState('budget', { x: trackPoint.x, y: trackPoint.y, heading: trackPoint.heading, speed: 48 });
    sim.setCarState('noir', {
      x: trackPoint.x + Math.cos(trackPoint.heading) * gap,
      y: trackPoint.y + Math.sin(trackPoint.heading) * gap,
      heading: trackPoint.heading,
      speed: 42,
    });

    sim.step(1 / 60);

    const snapshot = sim.snapshot();
    const first = snapshot.cars.find((car) => car.id === 'budget');
    const second = snapshot.cars.find((car) => car.id === 'noir');
    const physicalGap = Math.hypot(second.x - first.x, second.y - first.y);

    expect(second.raceDistance - first.raceDistance).toBeGreaterThanOrEqual(VEHICLE_LIMITS.carLength * 0.9);
    expect(physicalGap).toBeLessThan(VEHICLE_LIMITS.carLength * 1.08);
    expect(polygonsOverlap(getCarCorners(first), getCarCorners(second))).toBe(false);
    expect(snapshot.events.some((event) => event.type === 'contact')).toBe(true);
  });

  test('DRS creates a measurable straight-line speed advantage', () => {
    const baseCar = {
      x: 0,
      y: 0,
      heading: 0,
      steeringAngle: 0,
      speed: 100,
      mass: 798,
      powerNewtons: 43000,
      brakeNewtons: 59000,
      dragCoefficient: 0.33,
      downforceCoefficient: 6.1,
      tireGrip: 2.4,
      trackState: { surface: 'track' },
      tireEnergy: 100,
    };
    const normal = { ...baseCar, drsActive: false };
    const drs = { ...baseCar, drsActive: true };

    for (let elapsed = 0; elapsed < 1.5; elapsed += 1 / 60) {
      integrateVehiclePhysics(normal, { steering: 0, throttle: 1, brake: 0 }, 1 / 60);
      integrateVehiclePhysics(drs, { steering: 0, throttle: 1, brake: 0 }, 1 / 60);
    }

    expect(drs.speedKph ?? drs.speed * 3.6).toBeGreaterThan((normal.speedKph ?? normal.speed * 3.6) + 8);
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

  test('safety car forms a single-file queue in the frozen race order', () => {
    const sim = createRaceSimulation({ seed: 1971, drivers: PROJECT_DRIVERS, totalLaps: 8 });
    run(sim, 8);
    const frozenOrder = sim.snapshot().cars.map((car) => car.id);

    sim.setSafetyCar(true);
    run(sim, 14);
    const snapshot = sim.snapshot();
    const queueGaps = snapshot.cars.slice(1).map((car, index) => snapshot.cars[index].raceDistance - car.raceDistance);

    expect(snapshot.cars.map((car) => car.id)).toEqual(frozenOrder);
    expect(snapshot.cars.every((car) => car.drsActive === false)).toBe(true);
    expect(Math.max(...snapshot.cars.map((car) => Math.abs(car.signedOffset)))).toBeLessThan(TRACK.width * 0.18);
    expect(snapshot.safetyCar.progress - snapshot.cars[0].raceDistance).toBeGreaterThan(95);
    expect(Math.min(...queueGaps)).toBeGreaterThan(72);
    expect(Math.max(...queueGaps)).toBeLessThan(190);
    expect(Math.max(...snapshot.cars.map((car) => car.speedKph))).toBeLessThan(255);
  });

  test('gravel slows an off-track car while controls rejoin the racing surface', () => {
    const sim = createRaceSimulation({ seed: 9, drivers: drivers.slice(0, 2), totalLaps: 3 });
    const trackPoint = pointAt(sim.snapshot().track, 720);
    const gravelPoint = offsetTrackPoint(trackPoint, TRACK.width / 2 + 120);

    sim.setCarState('budget', {
      x: gravelPoint.x,
      y: gravelPoint.y,
      heading: trackPoint.heading + 0.7,
      speed: 78,
    });

    const before = sim.snapshot().cars.find((car) => car.id === 'budget');
    run(sim, 4);
    const slowed = sim.snapshot().cars.find((car) => car.id === 'budget');
    run(sim, 12);
    const after = sim.snapshot().cars.find((car) => car.id === 'budget');

    expect(before.surface).toBe('gravel');
    expect(slowed.surface).toBe('gravel');
    expect(slowed.speedKph).toBeLessThan(before.speedKph * 0.45);
    expect(after.surface).toBe('track');
    expect(after.speedKph).toBeGreaterThan(slowed.speedKph);
    expect(Math.abs(after.signedOffset)).toBeLessThan(TRACK.width / 2);
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

    const contactCount = run(sim, 12);
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
