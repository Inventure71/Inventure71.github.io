import {
  buildTrackModel,
  createProceduralTrack,
  nearestTrackState,
  offsetTrackPoint,
  pointAt,
  TRACK,
  WORLD,
} from './trackModel.js';
import { buildDriverPersonality, decideDriverControls } from './driverController.js';
import { clamp, createMulberry32, normalizeAngle, seededRange, wrapDistance } from './simMath.js';
import { getCarCorners, integrateVehiclePhysics, VEHICLE_LIMITS } from './vehiclePhysics.js';

const DEFAULT_TOTAL_LAPS = 10;
const MAX_COLLISION_CORRECTION = 4.5;
const GRID_SLOT_SPACING = 82;
const GRID_FIRST_SLOT_DISTANCE = -42;
const GRID_LATERAL_OFFSET = 42;
const TIMING_HISTORY_WINDOW_SECONDS = 18;
const TIMING_HISTORY_MAX_SAMPLES = 720;

export const DEFAULT_RULES = {
  drsDetectionSeconds: 1,
  safetyCarSpeed: 46,
  safetyCarLeadDistance: 122,
  safetyCarGap: 128,
  collisionRestitution: 0.18,
  standingStart: true,
  startLightCount: 5,
  startLightInterval: 0.72,
  startLightsOutHold: 0.78,
};

function wrapProgress(value, length) {
  return wrapDistance(value, length);
}

function distanceForward(from, to, length) {
  return wrapProgress(to - from, length);
}

function crossesDistance(previous, current, target, length) {
  const travelled = distanceForward(previous, current, length);
  if (travelled <= 0 || travelled > length / 2) return false;
  const targetOffset = distanceForward(previous, target, length);
  return targetOffset > 0 && targetOffset <= travelled + 0.001;
}

function isProgressInZone(track, progress, zone) {
  const wrapped = wrapProgress(progress, track.length);
  const start = wrapProgress(zone.start, track.length);
  const end = wrapProgress(zone.end, track.length);
  if (zone.end - zone.start >= track.length) return true;
  return end >= start
    ? wrapped >= start && wrapped <= end
    : wrapped >= start || wrapped <= end;
}

function createCar(driver, index, random, track, { standingStart = false } = {}) {
  const gridDistance = GRID_FIRST_SLOT_DISTANCE - index * GRID_SLOT_SPACING;
  const start = pointAt(track, gridDistance);
  const offset = index % 2 === 0 ? -GRID_LATERAL_OFFSET : GRID_LATERAL_OFFSET;
  const position = offsetTrackPoint(start, offset);
  const pace = clamp(driver.pace ?? seededRange(random, 0.95, 1.05), 0.88, 1.12);
  const racecraft = clamp(driver.racecraft ?? seededRange(random, 0.65, 0.92), 0.45, 1);
  const personality = buildDriverPersonality(driver, index, racecraft, random);
  const launchSpeed = Math.max(70, 84 - index * 0.55 + pace * 4);
  const vehicle = driver.vehicle ?? {};

  return {
    id: driver.id ?? `car-${index + 1}`,
    code: driver.code ?? `C${index + 1}`,
    timingCode: driver.timingCode ?? driver.code ?? `C${index + 1}`,
    driverNumber: driver.driverNumber ?? index + 1,
    icon: driver.icon ?? String(index + 1).padStart(2, '0'),
    raceName: driver.raceName ?? driver.code ?? `CAR${index + 1}`,
    name: driver.name ?? `Car ${index + 1}`,
    color: driver.color ?? '#e10600',
    tire: driver.tire ?? ['M', 'H', 'S'][index % 3],
    index,
    x: position.x,
    y: position.y,
    previousX: position.x,
    previousY: position.y,
    heading: start.heading,
    previousHeading: start.heading,
    steeringAngle: 0,
    yawRate: 0,
    turnRadius: Infinity,
    speed: standingStart ? 0 : launchSpeed,
    throttle: 0,
    brake: 0,
    vehicleId: vehicle.id ?? null,
    vehicleName: vehicle.name ?? null,
    vehicleRatings: vehicle.ratings ? { ...vehicle.ratings } : null,
    mass: vehicle.mass ?? 798 + seededRange(random, -5, 5),
    powerNewtons: vehicle.powerNewtons ?? 43000 * pace,
    brakeNewtons: vehicle.brakeNewtons ?? 59000,
    dragCoefficient: vehicle.dragCoefficient ?? 0.33 + seededRange(random, -0.026, 0.026),
    downforceCoefficient: vehicle.downforceCoefficient ?? 6.1 + seededRange(random, -0.18, 0.18),
    tireGrip: vehicle.tireGrip ?? 2.22 + racecraft * 0.28 + seededRange(random, -0.03, 0.03),
    tireCare: vehicle.tireCare ?? 1,
    pace,
    racecraft,
    personality,
    aggression: personality.baseAggression,
    gridLocked: standingStart,
    gridDistance,
    gridOffset: offset,
    desiredOffset: offset,
    progress: start.distance,
    raceDistance: gridDistance,
    lap: 1,
    rank: index + 1,
    gapAhead: Infinity,
    gapAheadSeconds: Infinity,
    leaderGapSeconds: 0,
    drsEligible: false,
    drsActive: false,
    drsZoneId: null,
    drsZoneEnabled: false,
    timingHistory: [],
    drsDetection: {},
    canAttack: true,
    trackState: start,
    contactCooldown: 0,
    tireEnergy: 100,
  };
}

function projectOntoAxis(points, axis) {
  let min = Infinity;
  let max = -Infinity;
  points.forEach((point) => {
    const projection = point.x * axis.x + point.y * axis.y;
    min = Math.min(min, projection);
    max = Math.max(max, projection);
  });
  return { min, max };
}

function overlapOnAxis(a, b, axis) {
  const first = projectOntoAxis(a, axis);
  const second = projectOntoAxis(b, axis);
  return Math.min(first.max, second.max) - Math.max(first.min, second.min);
}

function detectObbCollision(a, b) {
  const aCorners = getCarCorners(a);
  const bCorners = getCarCorners(b);
  const axes = [
    normalizeVector({ x: aCorners[1].x - aCorners[0].x, y: aCorners[1].y - aCorners[0].y }),
    normalizeVector({ x: aCorners[3].x - aCorners[0].x, y: aCorners[3].y - aCorners[0].y }),
    normalizeVector({ x: bCorners[1].x - bCorners[0].x, y: bCorners[1].y - bCorners[0].y }),
    normalizeVector({ x: bCorners[3].x - bCorners[0].x, y: bCorners[3].y - bCorners[0].y }),
  ];

  let minimumOverlap = Infinity;
  let minimumAxis = null;

  for (const axis of axes) {
    const overlap = overlapOnAxis(aCorners, bCorners, axis);
    if (overlap <= 0) return null;
    if (overlap < minimumOverlap) {
      minimumOverlap = overlap;
      minimumAxis = axis;
    }
  }

  const direction = { x: b.x - a.x, y: b.y - a.y };
  if (direction.x * minimumAxis.x + direction.y * minimumAxis.y < 0) {
    minimumAxis = { x: -minimumAxis.x, y: -minimumAxis.y };
  }

  return { axis: minimumAxis, depth: minimumOverlap };
}

function detectLongitudinalCollision(a, b) {
  const longitudinalGap = b.raceDistance - a.raceDistance;
  const headingDelta = Math.abs(normalizeAngle(a.heading - b.heading));
  const blendedHeading = a.heading + normalizeAngle(b.heading - a.heading) * 0.5;
  let axis = normalizeVector({ x: Math.cos(blendedHeading), y: Math.sin(blendedHeading) });
  const direction = { x: b.x - a.x, y: b.y - a.y };
  const physicalLongitudinalGap = dot(direction, axis);
  if (physicalLongitudinalGap < 0) axis = { x: -axis.x, y: -axis.y };

  const physicalLongitudinalSeparation = Math.abs(physicalLongitudinalGap);
  const lateralGap = Math.abs(direction.x * -axis.y + direction.y * axis.x);
  const requiredGap = VEHICLE_LIMITS.carLength * 0.96;

  if (Math.abs(longitudinalGap) > VEHICLE_LIMITS.carLength * 1.45) return null;
  if (physicalLongitudinalSeparation >= requiredGap) return null;
  if (lateralGap > VEHICLE_LIMITS.carWidth * 0.82) return null;
  if (headingDelta > 0.58) return null;

  return {
    axis,
    depth: requiredGap - physicalLongitudinalSeparation,
    longitudinal: true,
  };
}

function forwardVector(car) {
  return { x: Math.cos(car.heading), y: Math.sin(car.heading) };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function normalizeVector(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function progressDelta(a, b, trackLength) {
  let delta = a - b;
  if (delta < -trackLength / 2) delta += trackLength;
  if (delta > trackLength / 2) delta -= trackLength;
  return delta;
}

function trimTimingHistory(history, currentTime) {
  const cutoff = currentTime - TIMING_HISTORY_WINDOW_SECONDS;
  while (history.length > 2 && (history[0].time < cutoff || history.length > TIMING_HISTORY_MAX_SAMPLES)) {
    history.shift();
  }
}

function resetTimingHistory(car, currentTime) {
  car.timingHistory = [{ time: currentTime, raceDistance: car.raceDistance }];
}

function recordTimingSample(car, currentTime) {
  if (!Number.isFinite(car.raceDistance)) return;
  if (!Array.isArray(car.timingHistory)) {
    resetTimingHistory(car, currentTime);
    return;
  }

  const previous = car.timingHistory[car.timingHistory.length - 1];
  if (
    previous &&
    Math.abs(previous.time - currentTime) <= 1e-6 &&
    Math.abs(previous.raceDistance - car.raceDistance) <= 1e-3
  ) {
    return;
  }

  car.timingHistory.push({ time: currentTime, raceDistance: car.raceDistance });
  trimTimingHistory(car.timingHistory, currentTime);
}

function interpolateTimeAtDistance(history, targetDistance) {
  if (!Array.isArray(history) || history.length < 2) return null;

  for (let index = history.length - 1; index > 0; index -= 1) {
    const current = history[index];
    const previous = history[index - 1];
    if (targetDistance < previous.raceDistance || targetDistance > current.raceDistance) continue;

    const coveredDistance = current.raceDistance - previous.raceDistance;
    if (coveredDistance <= 1e-6) return current.time;
    const ratio = (targetDistance - previous.raceDistance) / coveredDistance;
    return previous.time + (current.time - previous.time) * ratio;
  }

  return null;
}

function estimateGapAheadSeconds(ahead, car, currentTime) {
  if (!ahead) return Infinity;

  const crossingTime = interpolateTimeAtDistance(ahead.timingHistory, car.raceDistance);
  if (Number.isFinite(crossingTime)) {
    return Math.max(0, currentTime - crossingTime);
  }

  const speedReference = Math.max((ahead.speed + car.speed) * 0.5, 1);
  return Math.max(0, (ahead.raceDistance - car.raceDistance) / speedReference);
}

function recordDrsDetection(car, zoneId, currentTime) {
  const previous = car.drsDetection?.[zoneId] ?? { passage: 0, time: -Infinity };
  const next = { passage: previous.passage + 1, time: currentTime };
  car.drsDetection = {
    ...(car.drsDetection ?? {}),
    [zoneId]: next,
  };
  return next;
}

function serializeCar(car, rank) {
  return {
    id: car.id,
    code: car.code,
    timingCode: car.timingCode,
    driverNumber: car.driverNumber,
    icon: car.icon,
    raceName: car.raceName,
    name: car.name,
    color: car.color,
    tire: car.tire,
    personality: { ...car.personality },
    aggression: car.aggression,
    aggressionPercent: Math.round((car.aggression ?? 0) * 100),
    setup: {
      vehicleId: car.vehicleId,
      vehicleName: car.vehicleName,
      vehicleRatings: car.vehicleRatings ? { ...car.vehicleRatings } : null,
      maxSpeedKph: VEHICLE_LIMITS.maxSpeed * 3.6,
      powerUnitKn: car.powerNewtons / 1000,
      brakeSystemKn: car.brakeNewtons / 1000,
      dragCoefficient: car.dragCoefficient,
      downforceCoefficient: car.downforceCoefficient,
      tireGrip: car.tireGrip,
      tireCare: car.tireCare,
      massKg: car.mass,
      pace: car.pace,
      racecraft: car.racecraft,
    },
    rank,
    previousX: car.previousX ?? car.x,
    previousY: car.previousY ?? car.y,
    x: car.x,
    y: car.y,
    previousHeading: car.previousHeading ?? car.heading,
    heading: car.heading,
    steeringAngle: car.steeringAngle,
    yawRate: car.yawRate,
    turnRadius: car.turnRadius,
    speed: car.speed,
    speedKph: car.speed * 3.6,
    throttle: car.throttle,
    brake: car.brake,
    lateralAcceleration: car.lateralAcceleration,
    progress: car.progress,
    raceDistance: car.raceDistance,
    lap: car.lap,
    gapAhead: car.gapAhead,
    gapAheadSeconds: car.gapAheadSeconds,
    leaderGapSeconds: car.leaderGapSeconds,
    drsEligible: car.drsEligible,
    drsActive: car.drsActive,
    drsZoneId: car.drsZoneId,
    drsZoneEnabled: car.drsZoneEnabled,
    canAttack: car.canAttack,
    signedOffset: car.trackState?.signedOffset ?? 0,
    crossTrackError: car.trackState?.crossTrackError ?? 0,
    surface: car.trackState?.surface ?? 'track',
    contactCooldown: car.contactCooldown,
    tireEnergy: car.tireEnergy,
    positionSource: 'integrated-vehicle',
  };
}

export class F1RaceSimulation {
  constructor({ seed = 1, drivers = [], totalLaps = DEFAULT_TOTAL_LAPS, rules = {}, track = null, trackSeed = null } = {}) {
    this.seed = seed;
    this.random = createMulberry32(seed);
    const trackDefinition = track ?? (trackSeed == null ? TRACK : createProceduralTrack(trackSeed));
    this.track = buildTrackModel(trackDefinition);
    this.trackSeed = this.track.seed ?? trackSeed;
    this.rules = { ...DEFAULT_RULES, ...rules };
    this.startLightsOutAt = this.rules.startLightCount * this.rules.startLightInterval + this.rules.startLightsOutHold;
    this.totalLaps = totalLaps;
    this.time = 0;
    this.events = [];
    this.raceControl = {
      mode: this.rules.standingStart === false ? 'green' : 'pre-start',
      frozenOrder: null,
      start: {
        lightCount: this.rules.startLightCount,
        lightsLit: 0,
        lightsOutAt: this.startLightsOutAt,
        released: this.rules.standingStart === false,
        releasedAt: this.rules.standingStart === false ? 0 : null,
      },
    };
    const safetyCarStart = pointAt(this.track, this.rules.safetyCarLeadDistance);
    this.safetyCar = {
      deployed: false,
      progress: this.rules.safetyCarLeadDistance,
      speed: this.rules.safetyCarSpeed,
      previousX: safetyCarStart.x,
      previousY: safetyCarStart.y,
      previousHeading: safetyCarStart.heading,
      x: safetyCarStart.x,
      y: safetyCarStart.y,
      heading: safetyCarStart.heading,
    };
    this.cars = drivers.map((driver, index) => createCar(driver, index, this.random, this.track, {
      standingStart: this.raceControl.mode === 'pre-start',
    }));
    this.recalculateRaceState({ updateDrs: false });
    this.cars.forEach((car) => resetTimingHistory(car, this.time));
  }

  setSafetyCar(deployed) {
    const next = Boolean(deployed);
    if (next && this.raceControl.mode === 'pre-start') return;
    if (next === this.safetyCar.deployed) return;
    const ordered = this.orderedCars();
    this.safetyCar.deployed = next;
    this.raceControl.mode = next ? 'safety-car' : 'green';
    this.raceControl.frozenOrder = next ? ordered.map((car) => car.id) : null;
    if (next) {
      const leader = ordered[0];
      const safetyCarProgress = (leader?.raceDistance ?? 0) + this.rules.safetyCarLeadDistance;
      if (this.safetyCar.progress < safetyCarProgress) {
        this.moveSafetyCarTo(safetyCarProgress);
      }
      this.cars.forEach((car) => {
        car.desiredOffset = 0;
        car.drsActive = false;
        car.drsEligible = false;
        car.drsZoneId = null;
        car.drsZoneEnabled = false;
      });
    }
    this.events.unshift({ type: next ? 'safety-car' : 'green-flag', at: this.time });
  }

  setCarState(id, partial) {
    const car = this.cars.find((item) => item.id === id);
    if (!car) return;
    Object.assign(car, partial);
    if (
      partial.x != null ||
      partial.y != null ||
      partial.progress != null ||
      partial.raceDistance != null
    ) {
      car.gridLocked = false;
      if (this.raceControl.mode === 'pre-start' && this.cars.every((item) => !item.gridLocked)) {
        this.releaseRaceStart();
      }
    }
    car.speed = clamp(car.speed, 0, VEHICLE_LIMITS.maxSpeed);
    car.heading = normalizeAngle(car.heading);
    car.trackState = nearestTrackState(this.track, car);
    const delta = progressDelta(car.trackState.distance, car.progress ?? car.trackState.distance, this.track.length);
    car.raceDistance = (car.raceDistance ?? car.trackState.distance) + delta;
    car.progress = car.trackState.distance;
    car.lap = this.computeLap(car.raceDistance);
    car.drsZoneId = null;
    car.drsZoneEnabled = false;
    car.drsActive = false;
    car.drsEligible = false;
    car.drsDetection = {};
    resetTimingHistory(car, this.time);
    this.recalculateRaceState({ updateDrs: false });
  }

  setCarControls(id, controls) {
    const car = this.cars.find((item) => item.id === id);
    if (!car) return;
    car.manualControls = controls;
  }

  clearCarControls(id) {
    const car = this.cars.find((item) => item.id === id);
    if (car) car.manualControls = null;
  }

  step(dt) {
    const delta = clamp(dt, 0, 1 / 20);
    if (!Number.isFinite(delta) || delta <= 0) return;

    this.time += delta;
    this.events = [];
    this.updateStartSequence();
    this.recalculateRaceState({ updateDrs: false });

    if (this.raceControl.mode === 'pre-start' && this.cars.every((car) => car.gridLocked)) {
      this.holdGridCars();
      this.recalculateRaceState({ updateDrs: false });
      return;
    }

    this.updateSafetyCar(delta);

    const orderedCars = this.orderedCars();
    const raceContext = this.driverRaceContext(orderedCars);
    orderedCars.forEach((car, index) => {
      car.previousX = car.x;
      car.previousY = car.y;
      car.previousHeading = car.heading;
      car.previousProgress = car.progress;
      const controls = decideDriverControls({
        car,
        orderIndex: index,
        race: raceContext,
      });
      integrateVehiclePhysics(car, controls, delta);
      this.applyRunoffResponse(car);
      car.contactCooldown = Math.max(0, car.contactCooldown - delta);
    });

    this.resolveCollisions();
    this.recalculateRaceState();
  }

  snapshot() {
    const ordered = this.orderedCars();
    return {
      time: this.time,
      world: WORLD,
      track: this.track,
      totalLaps: this.totalLaps,
      raceControl: {
        mode: this.raceControl.mode,
        start: {
          ...this.raceControl.start,
          visible: this.raceControl.mode === 'pre-start' ||
            (this.raceControl.start.releasedAt != null && this.time - this.raceControl.start.releasedAt < 1.45),
        },
      },
      safetyCar: { ...this.safetyCar },
      rules: this.rules,
      events: [...this.events],
      cars: ordered.map((car, index) => serializeCar(car, index + 1)),
    };
  }

  orderedCars() {
    if (this.safetyCar.deployed && this.raceControl.frozenOrder?.length) {
      const byId = new Map(this.cars.map((car) => [car.id, car]));
      return this.raceControl.frozenOrder.map((id) => byId.get(id)).filter(Boolean);
    }

    return [...this.cars].sort((a, b) => {
      const delta = b.raceDistance - a.raceDistance;
      return delta === 0 ? a.index - b.index : delta;
    });
  }

  driverRaceContext(orderedCars = this.orderedCars()) {
    return {
      track: this.track,
      cars: this.cars,
      orderedCars,
      safetyCar: this.safetyCar,
      rules: this.rules,
    };
  }

  computeAggression(car, orderIndex = Math.max(0, (car.rank ?? 1) - 1)) {
    const personality = car.personality ?? { baseAggression: 0.5, riskTolerance: 0.5, patience: 0.5 };
    if (this.safetyCar.deployed || car.canAttack === false) {
      return clamp(personality.baseAggression * 0.62, 0.08, 0.62);
    }

    const fieldDepth = Math.max(1, this.cars.length - 1);
    const positionPressure = clamp(orderIndex / fieldDepth, 0, 1);
    const gapPressure = Number.isFinite(car.gapAhead) ? clamp((230 - car.gapAhead) / 230, 0, 1) : 0;
    const tireConfidence = clamp(((car.tireEnergy ?? 100) - 42) / 58, 0, 1);
    const patienceDamping = (1 - gapPressure) * personality.patience * 0.08;

    return clamp(
      personality.baseAggression
        + positionPressure * 0.26
        + gapPressure * (0.1 + personality.riskTolerance * 0.08)
        - (1 - tireConfidence) * 0.1
        - patienceDamping,
      0.08,
      1,
    );
  }

  updateStartSequence() {
    const start = this.raceControl.start;
    if (this.raceControl.mode !== 'pre-start' || !start || start.released) return;

    if (this.time >= start.lightsOutAt) {
      this.releaseRaceStart();
      this.events.unshift({ type: 'start-lights-out', at: this.time });
      return;
    }

    start.lightsLit = clamp(
      Math.floor((this.time + Number.EPSILON) / this.rules.startLightInterval),
      0,
      start.lightCount,
    );
  }

  releaseRaceStart() {
    const start = this.raceControl.start;
    this.raceControl.mode = 'green';
    start.lightsLit = 0;
    start.released = true;
    start.releasedAt = this.time;
    this.cars.forEach((car) => {
      const wasGridLocked = car.gridLocked;
      car.gridLocked = false;
      const state = nearestTrackState(this.track, car);
      car.trackState = state;
      car.progress = state.distance;
      if (wasGridLocked) car.raceDistance = car.gridDistance;
      car.previousX = car.x;
      car.previousY = car.y;
      car.previousHeading = car.heading;
    });
  }

  holdGridCars() {
    this.cars.forEach((car) => {
      if (!car.gridLocked) return;
      const gridPoint = pointAt(this.track, car.gridDistance);
      const position = offsetTrackPoint(gridPoint, car.gridOffset);
      car.previousX = position.x;
      car.previousY = position.y;
      car.previousHeading = gridPoint.heading;
      car.x = position.x;
      car.y = position.y;
      car.heading = gridPoint.heading;
      car.speed = 0;
      car.throttle = 0;
      car.brake = 1;
      car.steeringAngle = 0;
      car.yawRate = 0;
      car.turnRadius = Infinity;
      car.progress = gridPoint.distance;
      car.raceDistance = car.gridDistance;
      car.trackState = nearestTrackState(this.track, car);
    });
  }

  updateSafetyCar(dt) {
    if (!this.safetyCar.deployed) return;
    const leader = this.orderedCars()[0];
    const targetProgress = (leader?.raceDistance ?? 0) + this.rules.safetyCarLeadDistance;
    const progress = Math.max(this.safetyCar.progress + this.safetyCar.speed * dt, targetProgress);
    this.moveSafetyCarTo(progress);
  }

  moveSafetyCarTo(progress) {
    const point = pointAt(this.track, progress);
    this.safetyCar.previousX = this.safetyCar.x;
    this.safetyCar.previousY = this.safetyCar.y;
    this.safetyCar.previousHeading = this.safetyCar.heading;
    this.safetyCar.progress = progress;
    this.safetyCar.x = point.x;
    this.safetyCar.y = point.y;
    this.safetyCar.heading = point.heading;
  }

  applyRunoffResponse(car) {
    const state = nearestTrackState(this.track, car);
    const signedLimit = this.track.width / 2 + this.track.gravelWidth + this.track.runoffWidth;
    const overshoot = Math.abs(state.signedOffset) - signedLimit;
    if (overshoot <= 0) {
      car.trackState = state;
      return;
    }

    const side = Math.sign(state.signedOffset) || 1;
    car.x -= state.normalX * side * overshoot;
    car.y -= state.normalY * side * overshoot;
    car.speed = clamp(car.speed * clamp(1 - overshoot * 0.012, 0.22, 0.86), 0, VEHICLE_LIMITS.maxSpeed);
    car.heading = normalizeAngle(car.heading - side * clamp(overshoot * 0.0028, 0.018, 0.08));
    car.trackState = nearestTrackState(this.track, car);
  }

  recalculateRaceState({ updateDrs = true } = {}) {
    this.cars.forEach((car) => {
      if (car.gridLocked) {
        const gridPoint = pointAt(this.track, car.gridDistance);
        car.trackState = nearestTrackState(this.track, car);
        car.progress = gridPoint.distance;
        car.raceDistance = car.gridDistance;
        car.lap = 1;
        return;
      }

      car.trackState = nearestTrackState(this.track, car);
      const previousProgress = car.progress ?? car.trackState.distance;
      const delta = progressDelta(car.trackState.distance, previousProgress, this.track.length);
      car.raceDistance = (car.raceDistance ?? previousProgress) + delta;
      car.progress = car.trackState.distance;
      car.lap = this.computeLap(car.raceDistance);
    });

    this.cars.forEach((car) => recordTimingSample(car, this.time));

    const ordered = this.orderedCars();
    ordered.forEach((car, index) => {
      const ahead = ordered[index - 1];
      const gap = ahead ? ahead.raceDistance - car.raceDistance : Infinity;
      car.rank = index + 1;
      car.gapAhead = gap;
      car.gapAheadSeconds = Number.isFinite(gap) ? estimateGapAheadSeconds(ahead, car, this.time) : Infinity;
      car.leaderGapSeconds = ahead ? ahead.leaderGapSeconds + car.gapAheadSeconds : 0;
      car.canAttack = !this.safetyCar.deployed;
      car.aggression = this.computeAggression(car, index);
      if (updateDrs) this.updateDrsLatch(car, ahead, index);
    });
  }

  updateDrsLatch(car, ahead, orderIndex) {
    if (this.safetyCar.deployed) {
      car.drsEligible = false;
      car.drsActive = false;
      car.drsZoneId = null;
      car.drsZoneEnabled = false;
      return;
    }

    const previousProgress = car.previousProgress ?? car.progress;
    const currentZone = car.drsZoneId
      ? this.track.drsZones.find((zone) => zone.id === car.drsZoneId)
      : null;

    if (currentZone && !isProgressInZone(this.track, car.progress, currentZone)) {
      car.drsZoneId = null;
      car.drsZoneEnabled = false;
    }

    if (!car.drsZoneId) {
      const crossedZone = this.track.drsZones.find((zone) => (
        crossesDistance(previousProgress, car.progress, zone.start, this.track.length)
      ));
      if (crossedZone) {
        car.drsZoneId = crossedZone.id;
        const crossing = recordDrsDetection(car, crossedZone.id, this.time);
        const aheadCrossing = ahead?.drsDetection?.[crossedZone.id];
        car.drsZoneEnabled = Boolean(
          orderIndex > 0 &&
          aheadCrossing &&
          aheadCrossing.passage === crossing.passage &&
          crossing.time >= aheadCrossing.time &&
          crossing.time - aheadCrossing.time <= this.rules.drsDetectionSeconds + 1e-6
        );
      }
    }

    const activeZone = car.drsZoneId
      ? this.track.drsZones.find((zone) => zone.id === car.drsZoneId)
      : null;
    const inLatchedZone = activeZone ? isProgressInZone(this.track, car.progress, activeZone) : false;
    car.drsEligible = Boolean(car.drsZoneEnabled && inLatchedZone);
    car.drsActive = car.drsEligible;
  }

  resolveCollisions() {
    const reportedContacts = new Set();

    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < this.cars.length; i += 1) {
        for (let j = i + 1; j < this.cars.length; j += 1) {
          const first = this.cars[i];
          const second = this.cars[j];
          const collision = detectObbCollision(first, second) ?? detectLongitudinalCollision(first, second);
          if (!collision) continue;

          const correction = Math.min(
            collision.depth / 2 + (collision.longitudinal ? 0.35 : 0.65),
            MAX_COLLISION_CORRECTION,
          );
          first.x -= collision.axis.x * correction;
          first.y -= collision.axis.y * correction;
          second.x += collision.axis.x * correction;
          second.y += collision.axis.y * correction;

          this.applyContactVelocityResponse(first, second, collision.axis);

          const yawNudge = clamp(collision.depth * 0.0025, 0.008, 0.035);
          const freshContact = first.contactCooldown <= 0 && second.contactCooldown <= 0;
          first.heading = normalizeAngle(first.heading - collision.axis.y * yawNudge);
          second.heading = normalizeAngle(second.heading + collision.axis.y * yawNudge);
          first.contactCooldown = 1;
          second.contactCooldown = 1;

          const contactKey = `${first.id}:${second.id}`;
          if (freshContact && pass === 0 && !reportedContacts.has(contactKey)) {
            reportedContacts.add(contactKey);
            this.events.unshift({ type: 'contact', at: this.time, carId: first.id, otherCarId: second.id });
          }
        }
      }
    }
  }

  applyContactVelocityResponse(first, second, axis) {
    const firstForward = forwardVector(first);
    const secondForward = forwardVector(second);
    const firstNormal = dot(firstForward, axis);
    const secondNormal = dot(secondForward, axis);
    const relativeNormalVelocity = second.speed * secondNormal - first.speed * firstNormal;

    if (relativeNormalVelocity < 0) {
      const impulse = clamp(-relativeNormalVelocity * (0.34 + this.rules.collisionRestitution), 0, 16);
      if (firstNormal > 0) first.speed = clamp(first.speed - impulse * firstNormal, 0, VEHICLE_LIMITS.maxSpeed);
      if (secondNormal < 0) second.speed = clamp(second.speed + impulse * secondNormal, 0, VEHICLE_LIMITS.maxSpeed);
    }

    first.speed = clamp(first.speed * 0.997, 0, VEHICLE_LIMITS.maxSpeed);
    second.speed = clamp(second.speed * 0.997, 0, VEHICLE_LIMITS.maxSpeed);
  }

  computeLap(raceDistance) {
    return clamp(Math.floor(Math.max(0, raceDistance) / this.track.length) + 1, 1, this.totalLaps);
  }
}

export function createRaceSimulation(options = {}) {
  return new F1RaceSimulation(options);
}
