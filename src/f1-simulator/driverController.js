import { pointAt, offsetTrackPoint } from './trackModel.js';
import { clamp, normalizeAngle, seededRange, TWO_PI } from './simMath.js';
import { VEHICLE_LIMITS } from './vehiclePhysics.js';

const LANE_OFFSETS = [-78, -52, -26, 0, 26, 52, 78];

function angleToPoint(car, target) {
  const angle = Math.atan2(target.y - car.y, target.x - car.x);
  return normalizeAngle(angle - car.heading);
}

export function buildDriverPersonality(driver, index, racecraft, random) {
  const numberSeed = Number(driver.driverNumber ?? index + 1);
  const numberBias = (((Number.isFinite(numberSeed) ? numberSeed : index + 1) % 11) - 5) * 0.014;
  const baseAggression = clamp(
    driver.personality?.aggression ?? 0.36 + racecraft * 0.34 + numberBias + seededRange(random, -0.045, 0.045),
    0.18,
    0.88,
  );

  return {
    baseAggression,
    riskTolerance: clamp(
      driver.personality?.riskTolerance ?? baseAggression * 0.72 + racecraft * 0.24 + seededRange(random, -0.04, 0.04),
      0.12,
      0.95,
    ),
    patience: clamp(
      driver.personality?.patience ?? 0.72 - baseAggression * 0.36 + racecraft * 0.12 + seededRange(random, -0.05, 0.05),
      0.18,
      0.9,
    ),
  };
}

export function createDriverInput() {
  const state = {
    steering: 0,
    throttle: 0,
    brake: 0,
  };

  return {
    steer(amount) {
      state.steering = clamp(amount, -VEHICLE_LIMITS.maxSteer, VEHICLE_LIMITS.maxSteer);
      return this;
    },
    accelerate(amount) {
      state.throttle = clamp(amount, 0, 1);
      return this;
    },
    brake(amount) {
      state.brake = clamp(amount, 0, 1);
      return this;
    },
    controls() {
      return { ...state };
    },
  };
}

export function decideDriverControls({ car, orderIndex, race }) {
  if (car.manualControls) return car.manualControls;

  if (car.gridLocked) {
    return createDriverInput().brake(1).controls();
  }

  if (race.safetyCar.deployed) {
    return decideSafetyCarControls(car, orderIndex, race);
  }

  if (!car.trackState.onTrack) {
    return decideRejoinControls(car, race);
  }

  return decideRacingControls(car, orderIndex, race);
}

function decideRacingControls(car, orderIndex, race) {
  const aggression = car.aggression ?? car.personality?.baseAggression ?? 0.5;
  const lookahead = clamp(car.speed * (1.12 - aggression * 0.08) + 160, 160, 360);
  const targetBase = pointAt(race.track, car.progress + lookahead);
  const lanePlan = planRacingLine(car, orderIndex, race);
  const recoveryBias = car.trackState.crossTrackError > race.track.width * 0.46 ? 0 : 1;
  const target = offsetTrackPoint(targetBase, lanePlan.offset * recoveryBias);
  const angleError = angleToPoint(car, target);
  const curvature = Math.max(car.trackState.curvature, targetBase.curvature);
  const gripBudget = 54 + car.racecraft * 11 + (car.tireEnergy ?? 100) * 0.05 + aggression * 4.5;
  const cornerTarget = clamp(
    Math.sqrt(gripBudget / Math.max(curvature, 0.0001)) + (car.pace - 1) * 20 + aggression * 7,
    72,
    168,
  );
  const edgeTolerance = race.track.width * (0.36 + aggression * 0.1);
  const edgePenalty = Math.max(0, car.trackState.crossTrackError - edgeTolerance) * (0.16 - aggression * 0.05);
  const trafficPenalty = Math.max(
    lanePlan.sameLaneAhead ? clamp((230 - lanePlan.sameLaneAhead.gap) * 0.16, 0, 32) : 0,
    lanePlan.sideRisk ? clamp((44 - lanePlan.sideRisk.lateral) * 0.42, 0, 16) : 0,
  ) * (1 - aggression * 0.28);
  const desiredSpeed = clamp(
    (car.drsActive ? cornerTarget + 22 : cornerTarget) - edgePenalty - trafficPenalty,
    58,
    VEHICLE_LIMITS.maxSpeed,
  );
  const speedError = desiredSpeed - car.speed;

  return createDriverInput()
    .steer(angleError * (0.82 + car.racecraft * 0.1))
    .accelerate(speedError > 1 ? clamp(speedError / 16, 0.1 + aggression * 0.08, 1) : 0)
    .brake(speedError < -2 ? clamp(Math.abs(speedError) / (22 + aggression * 8), 0, 1) : 0)
    .controls();
}

function decideRejoinControls(car, race) {
  const lookahead = clamp(car.speed * 0.72 + 118, 118, 220);
  const targetBase = pointAt(race.track, car.progress + lookahead);
  const target = offsetTrackPoint(targetBase, 0);
  const angleError = angleToPoint(car, target);
  const distanceFromRoad = Math.max(0, car.trackState.crossTrackError - race.track.width / 2);
  const surfaceTargetSpeed = car.trackState.surface === 'gravel'
    ? 54
    : car.trackState.surface === 'grass'
      ? 44
      : 30;
  const desiredSpeed = clamp(surfaceTargetSpeed - distanceFromRoad * 0.045, 20, surfaceTargetSpeed);
  const speedError = desiredSpeed - car.speed;
  const alignment = clamp(1 - Math.abs(angleError) / Math.PI, 0.28, 1);
  const lowSpeedRecovery = car.speed < 18 ? 0.16 : 0;
  const throttleLimit = car.trackState.surface === 'gravel' ? 0.62 : 0.48;

  return createDriverInput()
    .steer(angleError * 0.92)
    .accelerate(speedError > 0 ? clamp((speedError / 24) * alignment + lowSpeedRecovery, 0.08, throttleLimit) : lowSpeedRecovery)
    .brake(speedError < -5 ? clamp(Math.abs(speedError) / 30, 0.04, 0.74) : 0)
    .controls();
}

function decideSafetyCarControls(car, orderIndex, race) {
  const queueSlot = race.safetyCar.progress - race.rules.safetyCarLeadDistance - orderIndex * race.rules.safetyCarGap;
  const lookahead = clamp(car.speed * 0.8 + 74, 84, 148);
  const targetBase = pointAt(race.track, car.progress + lookahead);
  const target = offsetTrackPoint(targetBase, 0);
  const slotError = queueSlot - car.raceDistance;
  const desiredSpeed = clamp(
    race.rules.safetyCarSpeed + slotError * 0.24,
    22,
    race.rules.safetyCarSpeed + 32,
  );
  const speedError = desiredSpeed - car.speed;

  return createDriverInput()
    .steer(angleToPoint(car, target) * 1.04)
    .accelerate(speedError > 1 ? clamp(speedError / 16, 0, 0.5) : 0)
    .brake(speedError < -0.5 ? clamp(Math.abs(speedError) / 14, 0, 1) : 0)
    .controls();
}

export function planRacingLine(car, orderIndex, race) {
  const aggression = car.aggression ?? car.personality?.baseAggression ?? 0.5;
  const riskTolerance = car.personality?.riskTolerance ?? aggression;
  const trackLimit = race.track.width / 2 - VEHICLE_LIMITS.carWidth * clamp(1.22 - aggression * 0.34, 0.84, 1.22);
  const preferred = Math.sin((car.index / Math.max(1, race.cars.length)) * TWO_PI) * 26;
  const currentOffset = clamp(car.desiredOffset ?? preferred, -trackLimit, trackLimit);
  const ahead = race.orderedCars[orderIndex - 1];
  const traffic = scanNearbyTraffic(car, race);

  let bestOffset = currentOffset;
  let bestScore = -Infinity;

  LANE_OFFSETS.forEach((rawOffset) => {
    const offset = clamp(rawOffset, -trackLimit, trackLimit);
    const edgeClearance = trackLimit - Math.abs(offset);
    let score = 80;
    score -= Math.abs(offset - preferred) * 0.18;
    score -= Math.abs(offset - currentOffset) * (0.09 - aggression * 0.025);
    score -= Math.max(0, 18 - edgeClearance) * (0.92 - aggression * 0.42);

    traffic.forEach((entry) => {
      const lateral = Math.abs(entry.signedOffset - offset);
      if (entry.gap > 0 && entry.gap < 260) {
        const overlapRisk = clamp(58 - lateral, 0, 58);
        score -= overlapRisk * (260 - entry.gap) * 0.038 * (1 - riskTolerance * 0.34);
        if (entry.gap < 190 + aggression * 70 && lateral > 34 - aggression * 8) {
          score += Math.min(30 + aggression * 18, lateral - (28 - aggression * 6)) * (0.62 + aggression * 0.82);
        }
      } else if (entry.gap <= 0 && entry.gap > -74) {
        const sideOverlapRisk = clamp(52 - lateral, 0, 52);
        score -= sideOverlapRisk * (74 + entry.gap) * 0.052 * (1 - riskTolerance * 0.22);
      }
    });

    if (ahead && car.gapAhead < 230) {
      const side = car.index % 2 === 0 ? -1 : 1;
      const passSide = clamp(
        (ahead.trackState.signedOffset * -0.65) + side * (48 + aggression * 42),
        -trackLimit,
        trackLimit,
      );
      score -= Math.abs(offset - passSide) * (0.09 + aggression * 0.08);
    }

    if (score > bestScore) {
      bestScore = score;
      bestOffset = offset;
    }
  });

  const laneChangeRate = 0.72 + car.racecraft * 0.3 + aggression * 0.58;
  car.desiredOffset = currentOffset + clamp(bestOffset - currentOffset, -laneChangeRate, laneChangeRate);

  return {
    offset: car.desiredOffset,
    sameLaneAhead: findLaneTrafficAhead(traffic, car.desiredOffset, 230),
    sideRisk: findLaneTrafficBeside(traffic, car.desiredOffset),
  };
}

function scanNearbyTraffic(car, race) {
  return race.cars
    .filter((other) => other !== car)
    .map((other) => ({
      car: other,
      gap: other.raceDistance - car.raceDistance,
      signedOffset: other.trackState?.signedOffset ?? 0,
    }))
    .filter((entry) => entry.gap > -82 && entry.gap < 280);
}

function findLaneTrafficAhead(traffic, offset, maxDistance) {
  let closest = null;

  traffic.forEach((entry) => {
    if (entry.gap <= 0 || entry.gap > maxDistance) return;
    if (Math.abs(entry.signedOffset - offset) > 42) return;
    if (!closest || entry.gap < closest.gap) closest = entry;
  });

  return closest;
}

function findLaneTrafficBeside(traffic, offset) {
  let closest = null;

  traffic.forEach((entry) => {
    const lateral = Math.abs(entry.signedOffset - offset);
    if (Math.abs(entry.gap) > 58 || lateral > 44) return;
    const risk = (58 - Math.abs(entry.gap)) + (44 - lateral);
    if (!closest || risk > closest.risk) closest = { ...entry, lateral, risk };
  });

  return closest;
}
