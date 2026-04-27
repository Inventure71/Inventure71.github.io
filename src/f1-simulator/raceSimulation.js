import {
  buildTrackModel,
  isInDrsZone,
  nearestTrackState,
  offsetTrackPoint,
  pointAt,
  TRACK,
  WORLD,
  normalizeAngle,
} from './trackModel.js';
import { getCarCorners, integrateVehiclePhysics, VEHICLE_LIMITS } from './vehiclePhysics.js';

const DEFAULT_TOTAL_LAPS = 10;
const TWO_PI = Math.PI * 2;

export const DEFAULT_RULES = {
  drsDetectionSeconds: 1,
  safetyCarSpeed: 42,
  safetyCarLeadDistance: 145,
  safetyCarGap: 40,
  collisionRestitution: 0.18,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const LANE_OFFSETS = [-62, -42, -22, 0, 22, 42, 62];

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededRange(random, min, max) {
  return min + (max - min) * random();
}

function wrapProgress(value, length) {
  return ((value % length) + length) % length;
}

function angleToPoint(car, target) {
  const angle = Math.atan2(target.y - car.y, target.x - car.x);
  return normalizeAngle(angle - car.heading);
}

function createCar(driver, index, random, track) {
  const gridDistance = -index * 54;
  const start = pointAt(track, gridDistance);
  const offset = [-42, 0, 42][index % 3];
  const position = offsetTrackPoint(start, offset);
  const pace = clamp(driver.pace ?? seededRange(random, 0.95, 1.05), 0.88, 1.12);
  const racecraft = clamp(driver.racecraft ?? seededRange(random, 0.65, 0.92), 0.45, 1);

  return {
    id: driver.id ?? `car-${index + 1}`,
    code: driver.code ?? `C${index + 1}`,
    name: driver.name ?? `Car ${index + 1}`,
    color: driver.color ?? '#e10600',
    index,
    x: position.x,
    y: position.y,
    previousX: position.x,
    previousY: position.y,
    heading: start.heading,
    steeringAngle: 0,
    yawRate: 0,
    turnRadius: Infinity,
    speed: Math.max(54, 69 - index * 0.58 + pace * 2),
    throttle: 0,
    brake: 0,
    mass: 798 + seededRange(random, -5, 5),
    powerNewtons: 23500 * pace,
    brakeNewtons: 46000,
    dragCoefficient: 0.54 + seededRange(random, -0.035, 0.035),
    downforceCoefficient: 4.7 + seededRange(random, -0.16, 0.16),
    tireGrip: 2.08 + racecraft * 0.24 + seededRange(random, -0.03, 0.03),
    pace,
    racecraft,
    desiredOffset: offset,
    progress: start.distance,
    raceDistance: gridDistance,
    lap: 1,
    rank: index + 1,
    gapAhead: Infinity,
    gapAheadSeconds: Infinity,
    drsEligible: false,
    drsActive: false,
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

function serializeCar(car, rank) {
  return {
    id: car.id,
    code: car.code,
    name: car.name,
    color: car.color,
    rank,
    x: car.x,
    y: car.y,
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
    drsEligible: car.drsEligible,
    drsActive: car.drsActive,
    canAttack: car.canAttack,
    signedOffset: car.trackState?.signedOffset ?? 0,
    crossTrackError: car.trackState?.crossTrackError ?? 0,
    contactCooldown: car.contactCooldown,
    tireEnergy: car.tireEnergy,
    positionSource: 'integrated-vehicle',
  };
}

export class F1RaceSimulation {
  constructor({ seed = 1, drivers = [], totalLaps = DEFAULT_TOTAL_LAPS, rules = {} } = {}) {
    this.seed = seed;
    this.random = mulberry32(seed);
    this.track = buildTrackModel(TRACK);
    this.rules = { ...DEFAULT_RULES, ...rules };
    this.totalLaps = totalLaps;
    this.time = 0;
    this.events = [];
    this.raceControl = {
      mode: 'green',
      frozenOrder: null,
    };
    this.safetyCar = {
      deployed: false,
      progress: this.rules.safetyCarLeadDistance,
      speed: this.rules.safetyCarSpeed,
      x: pointAt(this.track, this.rules.safetyCarLeadDistance).x,
      y: pointAt(this.track, this.rules.safetyCarLeadDistance).y,
      heading: pointAt(this.track, this.rules.safetyCarLeadDistance).heading,
    };
    this.cars = drivers.map((driver, index) => createCar(driver, index, this.random, this.track));
    this.recalculateRaceState();
  }

  setSafetyCar(deployed) {
    const next = Boolean(deployed);
    if (next === this.safetyCar.deployed) return;
    this.safetyCar.deployed = next;
    this.raceControl.mode = next ? 'safety-car' : 'green';
    this.raceControl.frozenOrder = next ? this.orderedCars().map((car) => car.id) : null;
    this.events.unshift({ type: next ? 'safety-car' : 'green-flag', at: this.time });
  }

  setCarState(id, partial) {
    const car = this.cars.find((item) => item.id === id);
    if (!car) return;
    Object.assign(car, partial);
    car.speed = clamp(car.speed, 0, VEHICLE_LIMITS.maxSpeed);
    car.heading = normalizeAngle(car.heading);
    car.trackState = nearestTrackState(this.track, car);
    const delta = progressDelta(car.trackState.distance, car.progress ?? car.trackState.distance, this.track.length);
    car.raceDistance = (car.raceDistance ?? car.trackState.distance) + delta;
    car.progress = car.trackState.distance;
    car.lap = this.computeLap(car.raceDistance);
    this.recalculateRaceState();
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
    this.recalculateRaceState();
    this.updateSafetyCar(delta);

    this.orderedCars().forEach((car, index) => {
      car.previousX = car.x;
      car.previousY = car.y;
      const controls = car.manualControls ?? this.computeDriverControls(car, index);
      integrateVehiclePhysics(car, controls, delta);
      this.resolveTrackLimit(car);
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
      raceControl: { mode: this.raceControl.mode },
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

  computeDriverControls(car, orderIndex) {
    if (this.safetyCar.deployed) {
      return this.computeSafetyCarControls(car, orderIndex);
    }

    const lookahead = clamp(car.speed * 1.05 + 96, 108, 210);
    const targetBase = pointAt(this.track, car.progress + lookahead);
    const lanePlan = this.planRacingLine(car, orderIndex);
    const recoveryBias = car.trackState.crossTrackError > TRACK.width * 0.46 ? 0 : 1;
    const target = offsetTrackPoint(targetBase, lanePlan.offset * recoveryBias);
    const angleError = angleToPoint(car, target);
    const curvature = Math.max(car.trackState.curvature, targetBase.curvature);
    const gripBudget = 38 + car.racecraft * 8 + (car.tireEnergy ?? 100) * 0.03;
    const cornerTarget = clamp(Math.sqrt(gripBudget / Math.max(curvature, 0.0001)) + (car.pace - 1) * 16, 48, 106);
    const edgePenalty = Math.max(0, car.trackState.crossTrackError - TRACK.width * 0.38) * 0.18;
    const trafficPenalty = Math.max(
      lanePlan.sameLaneAhead ? clamp((148 - lanePlan.sameLaneAhead.gap) * 0.22, 0, 26) : 0,
      lanePlan.sideRisk ? clamp((36 - lanePlan.sideRisk.lateral) * 0.45, 0, 14) : 0,
    );
    const desiredSpeed = clamp(
      (car.drsActive ? cornerTarget + 9 : cornerTarget) - edgePenalty - trafficPenalty,
      36,
      VEHICLE_LIMITS.maxSpeed,
    );
    const speedError = desiredSpeed - car.speed;

    return {
      steering: clamp(angleError * (0.82 + car.racecraft * 0.1), -VEHICLE_LIMITS.maxSteer, VEHICLE_LIMITS.maxSteer),
      throttle: speedError > 1 ? clamp(speedError / 20, 0.1, 1) : 0,
      brake: speedError < -2 ? clamp(Math.abs(speedError) / 24, 0, 1) : 0,
    };
  }

  computeSafetyCarControls(car, orderIndex) {
    const referenceProgress = orderIndex === 0
      ? this.safetyCar.progress - this.rules.safetyCarLeadDistance
      : this.orderedCars()[orderIndex - 1].raceDistance - this.rules.safetyCarGap;
    const targetBase = pointAt(this.track, referenceProgress + 100);
    const target = offsetTrackPoint(targetBase, [-24, 0, 24][car.index % 3] * 0.45);
    const gapCorrection = clamp((referenceProgress - car.raceDistance) * 0.08, -10, 8);
    const desiredSpeed = this.rules.safetyCarSpeed + gapCorrection;
    const speedError = desiredSpeed - car.speed;

    return {
      steering: clamp(angleToPoint(car, target) * 0.85, -VEHICLE_LIMITS.maxSteer, VEHICLE_LIMITS.maxSteer),
      throttle: speedError > 1 ? clamp(speedError / 14, 0, 0.55) : 0,
      brake: speedError < -1 ? clamp(Math.abs(speedError) / 16, 0, 0.9) : 0,
    };
  }

  planRacingLine(car, orderIndex) {
    const trackLimit = TRACK.width / 2 - VEHICLE_LIMITS.carWidth * 1.15;
    const preferred = Math.sin((car.index / Math.max(1, this.cars.length)) * TWO_PI) * 26;
    const currentOffset = clamp(car.desiredOffset ?? preferred, -trackLimit, trackLimit);
    const ahead = this.orderedCars()[orderIndex - 1];
    const traffic = this.scanNearbyTraffic(car);

    let bestOffset = currentOffset;
    let bestScore = -Infinity;

    LANE_OFFSETS.forEach((rawOffset) => {
      const offset = clamp(rawOffset, -trackLimit, trackLimit);
      const edgeClearance = trackLimit - Math.abs(offset);
      let score = 80;
      score -= Math.abs(offset - preferred) * 0.18;
      score -= Math.abs(offset - currentOffset) * 0.08;
      score -= Math.max(0, 18 - edgeClearance) * 0.9;

      traffic.forEach((entry) => {
        const lateral = Math.abs(entry.signedOffset - offset);
        if (entry.gap > 0 && entry.gap < 170) {
          const overlapRisk = clamp(50 - lateral, 0, 50);
          score -= overlapRisk * (170 - entry.gap) * 0.052;
          if (entry.gap < 130 && lateral > 30) {
            score += Math.min(28, lateral - 28) * 0.7;
          }
        } else if (entry.gap <= 0 && entry.gap > -52) {
          const sideOverlapRisk = clamp(46 - lateral, 0, 46);
          score -= sideOverlapRisk * (52 + entry.gap) * 0.055;
        }
      });

      if (ahead && car.gapAhead < 150) {
        const side = car.index % 2 === 0 ? -1 : 1;
        const passSide = clamp((ahead.trackState.signedOffset * -0.65) + side * 44, -trackLimit, trackLimit);
        score -= Math.abs(offset - passSide) * 0.11;
      }

      if (score > bestScore) {
        bestScore = score;
        bestOffset = offset;
      }
    });

    const laneChangeRate = 0.62 + car.racecraft * 0.28;
    car.desiredOffset = currentOffset + clamp(bestOffset - currentOffset, -laneChangeRate, laneChangeRate);

    return {
      offset: car.desiredOffset,
      sameLaneAhead: this.findLaneTrafficAhead(car, car.desiredOffset, 148),
      sideRisk: this.findLaneTrafficBeside(car, car.desiredOffset),
    };
  }

  scanNearbyTraffic(car) {
    return this.cars
      .filter((other) => other !== car)
      .map((other) => ({
        car: other,
        gap: other.raceDistance - car.raceDistance,
        signedOffset: other.trackState?.signedOffset ?? 0,
      }))
      .filter((entry) => entry.gap > -58 && entry.gap < 180);
  }

  findLaneTrafficAhead(car, offset, maxDistance) {
    let closest = null;

    this.scanNearbyTraffic(car).forEach((entry) => {
      if (entry.gap <= 0 || entry.gap > maxDistance) return;
      if (Math.abs(entry.signedOffset - offset) > 36) return;
      if (!closest || entry.gap < closest.gap) closest = entry;
    });

    return closest;
  }

  findLaneTrafficBeside(car, offset) {
    let closest = null;

    this.scanNearbyTraffic(car).forEach((entry) => {
      const lateral = Math.abs(entry.signedOffset - offset);
      if (Math.abs(entry.gap) > 42 || lateral > 36) return;
      const risk = (42 - Math.abs(entry.gap)) + (36 - lateral);
      if (!closest || risk > closest.risk) closest = { ...entry, lateral, risk };
    });

    return closest;
  }

  updateSafetyCar(dt) {
    if (!this.safetyCar.deployed) return;
    const leader = this.orderedCars()[0];
    const targetProgress = (leader?.raceDistance ?? 0) + this.rules.safetyCarLeadDistance;
    const progress = Math.max(this.safetyCar.progress + this.safetyCar.speed * dt, targetProgress);
    const point = pointAt(this.track, progress);
    this.safetyCar.progress = progress;
    this.safetyCar.x = point.x;
    this.safetyCar.y = point.y;
    this.safetyCar.heading = point.heading;
  }

  resolveTrackLimit(car) {
    const state = nearestTrackState(this.track, car);
    const signedLimit = TRACK.width / 2 - VEHICLE_LIMITS.carWidth * 0.45;
    const overshoot = Math.abs(state.signedOffset) - signedLimit;
    if (overshoot <= 0) {
      car.trackState = state;
      return;
    }

    const side = Math.sign(state.signedOffset) || 1;
    car.x -= state.normalX * side * overshoot;
    car.y -= state.normalY * side * overshoot;
    car.speed = clamp(car.speed * clamp(1 - overshoot * 0.006, 0.72, 0.985), 0, VEHICLE_LIMITS.maxSpeed);
    car.heading = normalizeAngle(car.heading - side * clamp(overshoot * 0.0015, 0.004, 0.035));
    car.trackState = nearestTrackState(this.track, car);
  }

  recalculateRaceState() {
    this.cars.forEach((car) => {
      car.trackState = nearestTrackState(this.track, car);
      const previousProgress = car.progress ?? car.trackState.distance;
      const delta = progressDelta(car.trackState.distance, previousProgress, this.track.length);
      car.raceDistance = (car.raceDistance ?? previousProgress) + delta;
      car.progress = car.trackState.distance;
      car.lap = this.computeLap(car.raceDistance);
    });

    const ordered = this.orderedCars();
    ordered.forEach((car, index) => {
      const ahead = ordered[index - 1];
      const gap = ahead ? ahead.raceDistance - car.raceDistance : Infinity;
      car.rank = index + 1;
      car.gapAhead = gap;
      car.gapAheadSeconds = Number.isFinite(gap) ? gap / Math.max(car.speed, 1) : Infinity;
      car.canAttack = !this.safetyCar.deployed;
      car.drsEligible =
        !this.safetyCar.deployed &&
        index > 0 &&
        isInDrsZone(this.track, car.progress) &&
        car.gapAheadSeconds <= this.rules.drsDetectionSeconds;
      car.drsActive = car.drsEligible;
    });
  }

  resolveCollisions() {
    const reportedContacts = new Set();

    for (let pass = 0; pass < 3; pass += 1) {
      for (let i = 0; i < this.cars.length; i += 1) {
        for (let j = i + 1; j < this.cars.length; j += 1) {
          const first = this.cars[i];
          const second = this.cars[j];
          const collision = detectObbCollision(first, second);
          if (!collision) continue;

          const correction = collision.depth / 2 + 0.65;
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
