import { describe, expect, test } from 'vitest';
import { planRacingLine } from '../driverController.js';
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

function placeCarAtDistance(sim, id, distance, speed = 80, offset = 0) {
  const track = sim.snapshot().track;
  const point = pointAt(track, distance);
  const positioned = offsetTrackPoint(point, offset);
  sim.setCarState(id, {
    x: positioned.x,
    y: positioned.y,
    heading: point.heading,
    speed,
    raceDistance: distance,
    progress: point.distance,
  });
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

  test('holds cars in staggered grid boxes until the start lights go out', () => {
    const sim = createRaceSimulation({
      seed: 17,
      drivers,
      totalLaps: 4,
      rules: {
        startLightInterval: 0.1,
        startLightsOutHold: 0.1,
      },
    });
    const initial = sim.snapshot();

    expect(initial.raceControl.mode).toBe('pre-start');
    expect(initial.raceControl.start.lightsLit).toBe(0);
    expect(initial.cars.every((car) => car.speed === 0)).toBe(true);
    expect(initial.cars.map((car) => Math.sign(car.signedOffset))).toEqual([-1, 1, -1, 1]);
    expect(initial.cars.map((car) => Math.round(car.raceDistance))).toEqual([-42, -124, -206, -288]);

    run(sim, 0.35);
    const staged = sim.snapshot();
    expect(staged.raceControl.mode).toBe('pre-start');
    expect(staged.raceControl.start.lightsLit).toBeGreaterThan(0);
    expect(staged.cars.map((car) => Number(car.raceDistance.toFixed(2))))
      .toEqual(initial.cars.map((car) => Number(car.raceDistance.toFixed(2))));

    run(sim, 1.1);
    const launched = sim.snapshot();
    expect(launched.raceControl.mode).toBe('green');
    expect(launched.raceControl.start.lightsLit).toBe(0);
    expect(launched.cars.some((car) => car.speed > 0)).toBe(true);
    expect(launched.cars[0].raceDistance).toBeGreaterThan(initial.cars[0].raceDistance);
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

  test('raises live aggression as race position gets worse', () => {
    const personalityDrivers = [
      { id: 'front', code: 'FRO', name: 'Front Runner', color: '#ff3860', pace: 1, racecraft: 0.78, personality: { aggression: 0.34 } },
      { id: 'middle', code: 'MID', name: 'Mid Pack', color: '#ff9f1c', pace: 1, racecraft: 0.78, personality: { aggression: 0.34 } },
      { id: 'back', code: 'BAK', name: 'Back Marker', color: '#06d6a0', pace: 1, racecraft: 0.78, personality: { aggression: 0.34 } },
    ];
    const sim = createRaceSimulation({ seed: 91, drivers: personalityDrivers, totalLaps: 3 });

    placeCarAtDistance(sim, 'front', 1100, 82);
    placeCarAtDistance(sim, 'middle', 1000, 82);
    placeCarAtDistance(sim, 'back', 900, 82);

    const [front, middle, back] = sim.snapshot().cars;

    expect(front.id).toBe('front');
    expect(middle.id).toBe('middle');
    expect(back.id).toBe('back');
    expect(front.personality.baseAggression).toBeCloseTo(0.34);
    expect(Number.isFinite(front.aggression)).toBe(true);
    expect(middle.aggression).toBeGreaterThan(front.aggression);
    expect(back.aggression).toBeGreaterThan(middle.aggression);
    expect(back.aggression).toBeGreaterThan(back.personality.baseAggression + 0.2);
  });

  test('aggressive trailing drivers commit harder to passing lanes', () => {
    const sim = createRaceSimulation({
      seed: 92,
      drivers: [
        { id: 'leader', code: 'LED', name: 'Leader', color: '#ff3860', pace: 1, racecraft: 0.78 },
        { id: 'chaser', code: 'CHS', name: 'Chaser', color: '#118ab2', pace: 1, racecraft: 0.78 },
      ],
      totalLaps: 3,
    });

    placeCarAtDistance(sim, 'leader', 1100, 80, 0);
    placeCarAtDistance(sim, 'chaser', 980, 84, 0);

    const chaser = sim.cars.find((car) => car.id === 'chaser');
    chaser.desiredOffset = 0;
    chaser.aggression = 0.2;
    const cautiousPlan = planRacingLine(chaser, 1, sim.driverRaceContext());

    chaser.desiredOffset = 0;
    chaser.aggression = 0.92;
    const aggressivePlan = planRacingLine(chaser, 1, sim.driverRaceContext());

    expect(Math.abs(aggressivePlan.offset)).toBeGreaterThan(Math.abs(cautiousPlan.offset));
    expect(Math.abs(aggressivePlan.offset)).toBeGreaterThan(1.3);
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
    const sim = createRaceSimulation({
      seed: 11,
      drivers: drivers.slice(0, 2),
      totalLaps: 3,
      rules: { standingStart: false },
    });
    const trackPoint = pointAt(sim.snapshot().track, 1320);
    const gap = VEHICLE_LIMITS.carLength * 0.93;
    const noirPoint = pointAt(sim.snapshot().track, 1320 + gap);
    sim.setCarState('budget', {
      x: trackPoint.x,
      y: trackPoint.y,
      heading: trackPoint.heading,
      speed: 48,
      progress: trackPoint.distance,
      raceDistance: trackPoint.distance,
    });
    sim.setCarState('noir', {
      x: noirPoint.x,
      y: noirPoint.y,
      heading: noirPoint.heading,
      speed: 42,
      progress: noirPoint.distance,
      raceDistance: noirPoint.distance,
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
      speed: 155,
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

    for (let elapsed = 0; elapsed < 2; elapsed += 1 / 60) {
      integrateVehiclePhysics(normal, { steering: 0, throttle: 1, brake: 0 }, 1 / 60);
      integrateVehiclePhysics(drs, { steering: 0, throttle: 1, brake: 0 }, 1 / 60);
    }

    expect(drs.speedKph ?? drs.speed * 3.6).toBeGreaterThan((normal.speedKph ?? normal.speed * 3.6) + 4);
  });

  test('straight-line acceleration follows a power-limited curve instead of jumping to top speed', () => {
    const car = {
      x: 0,
      y: 0,
      heading: 0,
      steeringAngle: 0,
      speed: 0,
      mass: 798,
      powerNewtons: 43000,
      brakeNewtons: 59000,
      dragCoefficient: 0.33,
      downforceCoefficient: 6.1,
      tireGrip: 2.4,
      trackState: { surface: 'track' },
      tireEnergy: 100,
      drsActive: false,
    };

    expect(VEHICLE_LIMITS.maxSpeed * 3.6).toBeGreaterThan(680);
    expect(VEHICLE_LIMITS.maxSpeed * 3.6).toBeLessThan(705);

    integrateVehiclePhysics(car, { steering: 0, throttle: 1, brake: 0 }, 1);
    const oneSecondSpeed = car.speed;

    for (let elapsed = 0; elapsed < 1; elapsed += 1 / 60) {
      integrateVehiclePhysics(car, { steering: 0, throttle: 1, brake: 0 }, 1 / 60);
    }
    const twoSecondSpeed = car.speed;

    for (let elapsed = 0; elapsed < 6; elapsed += 1 / 60) {
      integrateVehiclePhysics(car, { steering: 0, throttle: 1, brake: 0 }, 1 / 60);
    }
    const eightSecondSpeed = car.speed;

    for (let elapsed = 0; elapsed < 8; elapsed += 1 / 60) {
      integrateVehiclePhysics(car, { steering: 0, throttle: 1, brake: 0 }, 1 / 60);
    }
    const sixteenSecondSpeed = car.speed;

    expect(oneSecondSpeed * 3.6).toBeLessThan(125);
    expect(twoSecondSpeed * 3.6).toBeLessThan(225);
    expect(eightSecondSpeed * 3.6).toBeGreaterThan(400);
    expect(eightSecondSpeed * 3.6).toBeLessThan(560);
    expect(sixteenSecondSpeed * 3.6).toBeGreaterThan(610);
    expect(sixteenSecondSpeed).toBeLessThan(VEHICLE_LIMITS.maxSpeed);
    expect(eightSecondSpeed - twoSecondSpeed).toBeGreaterThan(sixteenSecondSpeed - eightSecondSpeed);
  });

  test('uses vehicle constructor arguments as the car physics setup', () => {
    const sim = createRaceSimulation({
      seed: 44,
      drivers: [{
        id: 'custom',
        code: 'CUS',
        name: 'Custom Pair',
        color: '#ffffff',
        pace: 1,
        racecraft: 0.78,
        vehicle: {
          id: 'custom-vehicle',
          name: 'Custom Vehicle',
          mass: 790,
          powerNewtons: 45200,
          brakeNewtons: 61300,
          dragCoefficient: 0.305,
          downforceCoefficient: 6.32,
          tireGrip: 2.48,
        },
      }],
      totalLaps: 3,
      rules: { standingStart: false },
    });

    const setup = sim.snapshot().cars[0].setup;

    expect(setup.massKg).toBe(790);
    expect(setup.powerUnitKn).toBeCloseTo(45.2);
    expect(setup.brakeSystemKn).toBeCloseTo(61.3);
    expect(setup.dragCoefficient).toBeCloseTo(0.305);
    expect(setup.downforceCoefficient).toBeCloseTo(6.32);
    expect(setup.tireGrip).toBeCloseTo(2.48);
  });

  test('maximum braking cannot make a car stop instantly from racing speed', () => {
    const car = {
      x: 0,
      y: 0,
      heading: 0,
      steeringAngle: 0,
      speed: VEHICLE_LIMITS.maxSpeed,
      mass: 798,
      powerNewtons: 43000,
      brakeNewtons: 59000,
      dragCoefficient: 0.33,
      downforceCoefficient: 6.1,
      tireGrip: 2.4,
      trackState: { surface: 'track' },
      tireEnergy: 100,
      drsActive: false,
    };

    integrateVehiclePhysics(car, { steering: 0, throttle: 0, brake: 1 }, 0.5);
    expect(car.speed).toBeGreaterThan(VEHICLE_LIMITS.maxSpeed * 0.72);

    integrateVehiclePhysics(car, { steering: 0, throttle: 0, brake: 1 }, 0.5);
    expect(car.speed).toBeGreaterThan(VEHICLE_LIMITS.maxSpeed * 0.45);
  });

  test('DRS latches at the detection point until the zone ends', () => {
    const sim = createRaceSimulation({ seed: 31, drivers: drivers.slice(0, 2), totalLaps: 3 });
    const track = sim.snapshot().track;
    const zone = track.drsZones[0];
    const leaderPoint = pointAt(track, zone.start + 70);
    const chasingPoint = pointAt(track, zone.start - 5);

    sim.setCarState('budget', {
      x: leaderPoint.x,
      y: leaderPoint.y,
      heading: leaderPoint.heading,
      speed: 70,
      raceDistance: zone.start + 70,
      progress: leaderPoint.distance,
    });
    sim.setCarState('noir', {
      x: chasingPoint.x,
      y: chasingPoint.y,
      heading: chasingPoint.heading,
      speed: 82,
      raceDistance: zone.start - 5,
      progress: chasingPoint.distance,
    });
    sim.cars.find((car) => car.id === 'budget').drsDetection = {
      [zone.id]: { passage: 1, time: sim.time },
    };

    run(sim, 0.16);
    let snapshot = sim.snapshot();
    let chasing = snapshot.cars.find((car) => car.id === 'noir');

    expect(chasing.drsActive).toBe(true);
    expect(chasing.drsZoneId).toBe(zone.id);

    const farLeaderPoint = pointAt(track, chasing.progress + 250);
    sim.setCarState('budget', {
      x: farLeaderPoint.x,
      y: farLeaderPoint.y,
      heading: farLeaderPoint.heading,
      speed: 90,
      raceDistance: chasing.raceDistance + 250,
      progress: farLeaderPoint.distance,
    });
    sim.step(1 / 60);
    snapshot = sim.snapshot();
    chasing = snapshot.cars.find((car) => car.id === 'noir');

    expect(chasing.gapAheadSeconds).toBeGreaterThan(1);
    expect(chasing.drsActive).toBe(true);

    const afterZonePoint = pointAt(track, zone.end + 20);
    sim.setCarState('noir', {
      x: afterZonePoint.x,
      y: afterZonePoint.y,
      heading: afterZonePoint.heading,
      speed: 90,
      raceDistance: zone.end + 20,
      progress: afterZonePoint.distance,
    });
    sim.step(1 / 60);
    chasing = sim.snapshot().cars.find((car) => car.id === 'noir');

    expect(chasing.drsActive).toBe(false);
    expect(chasing.drsZoneId).toBe(null);
  });

  test('estimates the gap to the car ahead from crossed track time, not the trailing car speed', () => {
    const sim = createRaceSimulation({
      seed: 57,
      drivers: drivers.slice(0, 2),
      totalLaps: 3,
      rules: { standingStart: false },
    });
    const leader = sim.cars.find((car) => car.id === 'budget');
    const chaser = sim.cars.find((car) => car.id === 'noir');
    const leaderPoint = pointAt(sim.track, 1000);
    const chaserPoint = pointAt(sim.track, 940);

    sim.time = 12;
    Object.assign(leader, {
      x: leaderPoint.x,
      y: leaderPoint.y,
      heading: leaderPoint.heading,
      speed: 60,
      progress: leaderPoint.distance,
      raceDistance: 1000,
      timingHistory: [
        { time: 11, raceDistance: 940 },
        { time: 12, raceDistance: 1000 },
      ],
    });
    Object.assign(chaser, {
      x: chaserPoint.x,
      y: chaserPoint.y,
      heading: chaserPoint.heading,
      speed: 120,
      progress: chaserPoint.distance,
      raceDistance: 940,
      timingHistory: [
        { time: 12, raceDistance: 940 },
      ],
    });

    sim.recalculateRaceState({ updateDrs: false });
    const snapshot = sim.snapshot();
    const noir = snapshot.cars.find((car) => car.id === 'noir');
    const trailingSpeedEstimate = noir.gapAhead / Math.max(noir.speed, 1);

    expect(trailingSpeedEstimate).toBeLessThan(0.55);
    expect(noir.gapAheadSeconds).toBeCloseTo(1, 1);
  });

  test('DRS cannot be gained after missing the detection point inside a zone', () => {
    const sim = createRaceSimulation({
      seed: 32,
      drivers: drivers.slice(0, 2),
      totalLaps: 3,
      rules: { standingStart: false },
    });
    const track = sim.snapshot().track;
    const zone = track.drsZones[0];
    const leaderPoint = pointAt(track, zone.start + 96);
    const chasingPoint = pointAt(track, zone.start + 42);

    sim.setCarState('budget', {
      x: leaderPoint.x,
      y: leaderPoint.y,
      heading: leaderPoint.heading,
      speed: 72,
      raceDistance: zone.start + 96,
      progress: leaderPoint.distance,
    });
    sim.setCarState('noir', {
      x: chasingPoint.x,
      y: chasingPoint.y,
      heading: chasingPoint.heading,
      speed: 84,
      raceDistance: zone.start + 42,
      progress: chasingPoint.distance,
    });

    run(sim, 0.5);

    const chasing = sim.snapshot().cars.find((car) => car.id === 'noir');
    expect(chasing.gapAheadSeconds).toBeLessThan(1);
    expect(chasing.drsActive).toBe(false);
    expect(chasing.drsZoneId).toBe(null);
  });

  test('gravel recovery slows the car without stopping it into a pivot', () => {
    const sim = createRaceSimulation({
      seed: 41,
      drivers: drivers.slice(0, 1),
      totalLaps: 3,
      rules: { standingStart: false },
    });
    const track = sim.snapshot().track;
    const point = pointAt(track, 1350);
    const gravelPoint = offsetTrackPoint(point, track.width / 2 + 82);

    sim.setCarState('budget', {
      x: gravelPoint.x,
      y: gravelPoint.y,
      heading: point.heading + 1.25,
      speed: 44,
      progress: point.distance,
      raceDistance: point.distance,
    });

    run(sim, 2.2);

    const car = sim.snapshot().cars.find((item) => item.id === 'budget');
    expect(car.surface === 'track' || car.surface === 'gravel').toBe(true);
    expect(car.speed).toBeGreaterThan(14);
    expect(car.raceDistance).toBeGreaterThan(point.distance + 40);
  });

  test('kerb riding does not trigger gravel-style stopping behavior', () => {
    const sim = createRaceSimulation({
      seed: 42,
      drivers: drivers.slice(0, 1),
      totalLaps: 3,
      rules: { standingStart: false },
    });
    const track = sim.snapshot().track;
    const point = pointAt(track, 1520);
    const kerbPoint = offsetTrackPoint(point, track.width / 2 + track.kerbWidth * 0.62);

    sim.setCarState('budget', {
      x: kerbPoint.x,
      y: kerbPoint.y,
      heading: point.heading + 0.16,
      speed: 72,
      progress: point.distance,
      raceDistance: point.distance,
    });

    run(sim, 1.2);

    const car = sim.snapshot().cars.find((item) => item.id === 'budget');
    expect(['track', 'kerb']).toContain(car.surface);
    expect(car.speed).toBeGreaterThan(54);
    expect(car.raceDistance).toBeGreaterThan(point.distance + 70);
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
    const sim = createRaceSimulation({
      seed: 9,
      drivers: drivers.slice(0, 2),
      totalLaps: 3,
      rules: { standingStart: false },
    });
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
    expect(slowed.speedKph).toBeLessThan(before.speedKph * 0.62);
    expect(slowed.speedKph).toBeGreaterThan(before.speedKph * 0.32);
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
      expect(Number.isFinite(car.setup.maxSpeedKph)).toBe(true);
      expect(Number.isFinite(car.setup.powerUnitKn)).toBe(true);
      expect(Number.isFinite(car.setup.brakeSystemKn)).toBe(true);
      expect(Number.isFinite(car.setup.dragCoefficient)).toBe(true);
      expect(Number.isFinite(car.setup.downforceCoefficient)).toBe(true);
      expect(Number.isFinite(car.setup.tireGrip)).toBe(true);
      expect(Number.isFinite(car.setup.massKg)).toBe(true);
      expect(Number.isFinite(car.aggression)).toBe(true);
      expect(Number.isFinite(car.personality.baseAggression)).toBe(true);
      expect(Number.isFinite(car.personality.riskTolerance)).toBe(true);
      expect(car.setup.maxSpeedKph).toBeGreaterThan(680);
      expect(car.setup.powerUnitKn).toBeGreaterThan(37);
      expect(car.setup.brakeSystemKn).toBeGreaterThan(55);
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
    expect(averageSpeedKph).toBeGreaterThan(290);
    expect(Math.min(...snapshot.cars.map((car) => car.speedKph))).toBeGreaterThan(170);
    expect(Math.max(...snapshot.cars.map((car) => car.speedKph))).toBeLessThan(690);
    expect(laneBuckets).toBeGreaterThanOrEqual(5);
    expect(Math.max(...snapshot.cars.map((car) => car.crossTrackError))).toBeLessThan(TRACK.width / 2);
    expect(Math.max(...snapshot.cars.slice(1).map((car) => car.gapAheadSeconds))).toBeLessThan(8);
    expect(contactCount).toBeLessThan(12);
  });
});
