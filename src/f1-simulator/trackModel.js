import { clamp, createMulberry32, normalizeAngle, seededRange, TWO_PI, wrapDistance } from './simMath.js';

export const WORLD = {
  width: 7600,
  height: 4600,
};

export const TRACK = {
  name: 'Apex Harbor GP',
  width: 230,
  kerbWidth: 34,
  gravelWidth: 165,
  runoffWidth: 260,
  sampleCount: 3600,
  drsZones: [
    { id: 'main-straight', startRatio: 0.02, endRatio: 0.18 },
    { id: 'back-straight', startRatio: 0.43, endRatio: 0.60 },
    { id: 'harbor-straight', startRatio: 0.82, endRatio: 0.96 },
  ],
};

const GENERATED_TRACK_MIN_LENGTH = 7600;
const GENERATED_TRACK_MAX_LENGTH = 14500;
const GENERATED_TRACK_ATTEMPTS = 320;
const GENERATED_CONTROL_COUNT = 20;
const TRACK_BOUNDARY_PADDING = 520;
const MIN_TRACK_CLEARANCE_MULTIPLIER = 1.55;
const MAX_LOCAL_TURN_RADIANS = 1.5;
const START_STRAIGHT_GRID_LENGTH = 760;
const START_STRAIGHT_EXIT_LENGTH = 260;
const PROCEDURAL_TRACK_TEMPLATES = [
  [
    [0.08, 0.55], [0.10, 0.80], [0.22, 0.89], [0.42, 0.84], [0.52, 0.93],
    [0.60, 0.75], [0.74, 0.88], [0.91, 0.76], [0.94, 0.54], [0.82, 0.46],
    [0.94, 0.28], [0.78, 0.18], [0.62, 0.31], [0.54, 0.13], [0.43, 0.30],
    [0.33, 0.17], [0.20, 0.24], [0.12, 0.38], [0.22, 0.48], [0.13, 0.50],
  ],
  [
    [0.07, 0.46], [0.14, 0.72], [0.25, 0.83], [0.39, 0.73], [0.47, 0.88],
    [0.56, 0.70], [0.67, 0.82], [0.88, 0.84], [0.95, 0.63], [0.83, 0.56],
    [0.92, 0.43], [0.79, 0.35], [0.88, 0.20], [0.68, 0.15], [0.58, 0.29],
    [0.47, 0.18], [0.34, 0.30], [0.21, 0.19], [0.10, 0.28], [0.17, 0.39],
  ],
  [
    [0.06, 0.61], [0.13, 0.86], [0.31, 0.91], [0.43, 0.79], [0.57, 0.87],
    [0.71, 0.70], [0.92, 0.72], [0.95, 0.50], [0.84, 0.43], [0.91, 0.32],
    [0.74, 0.24], [0.69, 0.11], [0.54, 0.18], [0.45, 0.08], [0.35, 0.22],
    [0.23, 0.17], [0.11, 0.31], [0.24, 0.43], [0.15, 0.52], [0.28, 0.60],
  ],
];

const CENTERLINE_CONTROLS = [
  { x: WORLD.width * 0.05, y: WORLD.height * 0.56 },
  { x: WORLD.width * 0.10, y: WORLD.height * 0.81 },
  { x: WORLD.width * 0.23, y: WORLD.height * 0.91 },
  { x: WORLD.width * 0.35, y: WORLD.height * 0.80 },
  { x: WORLD.width * 0.48, y: WORLD.height * 0.90 },
  { x: WORLD.width * 0.59, y: WORLD.height * 0.75 },
  { x: WORLD.width * 0.71, y: WORLD.height * 0.87 },
  { x: WORLD.width * 0.82, y: WORLD.height * 0.72 },
  { x: WORLD.width * 0.94, y: WORLD.height * 0.66 },
  { x: WORLD.width * 0.96, y: WORLD.height * 0.47 },
  { x: WORLD.width * 0.88, y: WORLD.height * 0.33 },
  { x: WORLD.width * 0.74, y: WORLD.height * 0.31 },
  { x: WORLD.width * 0.64, y: WORLD.height * 0.18 },
  { x: WORLD.width * 0.54, y: WORLD.height * 0.31 },
  { x: WORLD.width * 0.43, y: WORLD.height * 0.13 },
  { x: WORLD.width * 0.29, y: WORLD.height * 0.18 },
  { x: WORLD.width * 0.17, y: WORLD.height * 0.31 },
  { x: WORLD.width * 0.08, y: WORLD.height * 0.43 },
];

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: 0.5 * (
      (2 * p1.x) +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    ),
    y: 0.5 * (
      (2 * p1.y) +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    ),
  };
}

function normalizeSeed(seed) {
  if (Number.isFinite(seed)) return seed >>> 0;
  let hash = 2166136261;
  String(seed ?? 'f1-track').split('').forEach((character) => {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  });
  return hash >>> 0;
}

function rawCenterPoint(ratio, controls = CENTERLINE_CONTROLS) {
  const count = controls.length;
  const scaled = ratio * count;
  const index = Math.floor(scaled) % count;
  const localT = scaled - Math.floor(scaled);
  const p0 = controls[(index - 1 + count) % count];
  const p1 = controls[index];
  const p2 = controls[(index + 1) % count];
  const p3 = controls[(index + 2) % count];
  return catmullRom(p0, p1, p2, p3, localT);
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function orientation(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentBoxesOverlap(a, b, c, d) {
  return (
    Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x)) <= Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) &&
    Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y)) <= Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
  );
}

function segmentsIntersect(a, b, c, d) {
  if (!segmentBoxesOverlap(a, b, c, d)) return false;
  const abC = orientation(a, b, c);
  const abD = orientation(a, b, d);
  const cdA = orientation(c, d, a);
  const cdB = orientation(c, d, b);
  return abC * abD < 0 && cdA * cdB < 0;
}

function hasSelfIntersections(samples) {
  const points = samples.slice(0, -1).filter((_, index) => index % 12 === 0);
  for (let first = 0; first < points.length - 1; first += 1) {
    for (let second = first + 2; second < points.length - 1; second += 1) {
      const sharesLoopClosure = first === 0 && second >= points.length - 3;
      if (sharesLoopClosure) continue;
      if (segmentsIntersect(points[first], points[first + 1], points[second], points[second + 1])) return true;
    }
  }
  return false;
}

function samplesStayInsideWorld(samples) {
  return samples.every((sample) => (
    sample.x >= TRACK_BOUNDARY_PADDING &&
    sample.x <= WORLD.width - TRACK_BOUNDARY_PADDING &&
    sample.y >= TRACK_BOUNDARY_PADDING &&
    sample.y <= WORLD.height - TRACK_BOUNDARY_PADDING
  ));
}

function hasEnoughTrackClearance(samples, totalLength, minimumClearance) {
  const points = samples.slice(0, -1).filter((_, index) => index % 24 === 0);
  const minimumClearanceSquared = minimumClearance * minimumClearance;
  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      const arcDistance = Math.abs(points[second].distance - points[first].distance);
      const loopDistance = Math.min(arcDistance, totalLength - arcDistance);
      if (loopDistance < 700) continue;
      const dx = points[first].x - points[second].x;
      const dy = points[first].y - points[second].y;
      if (dx * dx + dy * dy < minimumClearanceSquared) return false;
    }
  }
  return true;
}

function hasReasonableTurnSharpness(samples) {
  const usableSamples = samples.slice(0, -1);
  const window = 30;
  const step = 6;

  for (let index = 0; index < usableSamples.length; index += step) {
    let accumulatedTurn = 0;
    for (let offset = 0; offset < window; offset += step) {
      const current = usableSamples[(index + offset) % usableSamples.length];
      const next = usableSamples[(index + offset + step) % usableSamples.length];
      accumulatedTurn += Math.abs(normalizeAngle(next.heading - current.heading));
    }
    if (accumulatedTurn > MAX_LOCAL_TURN_RADIANS) return false;
  }

  return true;
}

function distanceForwardAlongTrack(from, to, totalLength) {
  return to >= from ? to - from : totalLength - from + to;
}

function chooseStandingStartIndex(samples, totalLength) {
  const usableSamples = samples.slice(0, -1);
  let best = { index: 0, score: Infinity };

  for (let index = 0; index < usableSamples.length; index += 1) {
    const candidate = usableSamples[index];
    let gridTurn = 0;
    let gridCurvature = 0;
    let gridCount = 0;
    let exitTurn = 0;
    let exitCurvature = 0;
    let exitCount = 0;

    for (let offset = 1; offset < usableSamples.length; offset += 1) {
      const sample = usableSamples[(index - offset + usableSamples.length) % usableSamples.length];
      const distanceToLine = distanceForwardAlongTrack(sample.distance, candidate.distance, totalLength);
      if (distanceToLine > START_STRAIGHT_GRID_LENGTH) break;
      gridTurn = Math.max(gridTurn, Math.abs(normalizeAngle(candidate.heading - sample.heading)));
      gridCurvature += sample.curvature;
      gridCount += 1;
    }

    for (let offset = 1; offset < usableSamples.length; offset += 1) {
      const sample = usableSamples[(index + offset) % usableSamples.length];
      const distanceFromLine = distanceForwardAlongTrack(candidate.distance, sample.distance, totalLength);
      if (distanceFromLine > START_STRAIGHT_EXIT_LENGTH) break;
      exitTurn = Math.max(exitTurn, Math.abs(normalizeAngle(sample.heading - candidate.heading)));
      exitCurvature += sample.curvature;
      exitCount += 1;
    }

    const score =
      gridTurn * 5 +
      exitTurn * 1.2 +
      (gridCurvature / Math.max(1, gridCount)) * 2600 +
      (exitCurvature / Math.max(1, exitCount)) * 650;

    if (score < best.score) best = { index, score };
  }

  return best.index;
}

function rotateSamplesToStandingStart(samples, totalLength) {
  const usableSamples = samples.slice(0, -1);
  const startIndex = chooseStandingStartIndex(samples, totalLength);
  const startDistance = usableSamples[startIndex].distance;

  const rotated = [
    ...usableSamples.slice(startIndex),
    ...usableSamples.slice(0, startIndex),
  ].map((sample) => ({
    ...sample,
    distance: distanceForwardAlongTrack(startDistance, sample.distance, totalLength),
  }));

  return [
    ...rotated,
    {
      ...rotated[0],
      distance: totalLength,
    },
  ];
}

function makeTemplatePoint([x, y], random, index) {
  const edgeDistance = Math.min(x, 1 - x, y, 1 - y);
  const jitter = edgeDistance < 0.13 ? 0.014 : 0.03;
  const chicaneNudge = index % 5 === 2 ? seededRange(random, -0.024, 0.024) : 0;

  return {
    x: clamp(x + seededRange(random, -jitter, jitter) + chicaneNudge, 0.06, 0.94),
    y: clamp(y + seededRange(random, -jitter, jitter) - chicaneNudge * 0.55, 0.08, 0.92),
  };
}

function applySectorMorph(points, random) {
  const center = { x: 0.5, y: 0.5 };
  const horizontalBias = seededRange(random, -0.035, 0.035);
  const verticalBias = seededRange(random, -0.035, 0.035);
  const squeeze = seededRange(random, 0.94, 1.06);
  const stretch = seededRange(random, 0.93, 1.07);
  const layoutScale = seededRange(random, 0.76, 0.84);

  return points.map((point, index) => {
    const turnComplex = index % 4 === 1 ? seededRange(random, -0.024, 0.024) : 0;
    return {
      x: clamp(center.x + (point.x - center.x) * stretch * layoutScale + horizontalBias + turnComplex, 0.06, 0.94),
      y: clamp(center.y + (point.y - center.y) * squeeze * layoutScale + verticalBias - turnComplex * 0.4, 0.08, 0.92),
    };
  });
}

function normalizedToWorld(point) {
  const usableWidth = WORLD.width - TRACK_BOUNDARY_PADDING * 2;
  const usableHeight = WORLD.height - TRACK_BOUNDARY_PADDING * 2;
  return {
    x: TRACK_BOUNDARY_PADDING + point.x * usableWidth,
    y: TRACK_BOUNDARY_PADDING + point.y * usableHeight,
  };
}

function rotateControls(controls, random) {
  const rotation = Math.floor(seededRange(random, 0, controls.length));
  return [...controls.slice(rotation), ...controls.slice(0, rotation)];
}

function generateCenterlineControls(seed) {
  const random = createMulberry32(seed);
  const template = PROCEDURAL_TRACK_TEMPLATES[Math.floor(seededRange(random, 0, PROCEDURAL_TRACK_TEMPLATES.length))]
    ?? PROCEDURAL_TRACK_TEMPLATES[0];
  const normalized = applySectorMorph(
    template.map((point, index) => makeTemplatePoint(point, random, index)),
    random,
  );

  return rotateControls(normalized.map(normalizedToWorld), random);
}

function generateFallbackCenterlineControls(seed) {
  const random = createMulberry32(seed ^ 0xa5a5a5a5);
  const center = { x: WORLD.width / 2, y: WORLD.height / 2 };
  const phaseA = seededRange(random, 0, TWO_PI);
  const phaseB = seededRange(random, 0, TWO_PI);
  const angleStep = TWO_PI / GENERATED_CONTROL_COUNT;

  return Array.from({ length: GENERATED_CONTROL_COUNT }, (_, index) => {
    const angle = Math.PI + index * angleStep;
    const rx = WORLD.width * (0.345 + Math.sin(angle * 3 + phaseA) * 0.024);
    const ry = WORLD.height * (0.315 + Math.sin(angle * 2 + phaseB) * 0.022);

    return {
      x: center.x + Math.cos(angle) * rx,
      y: center.y + Math.sin(angle) * ry,
    };
  });
}

function normalizeDrsZone(zone, totalLength) {
  if (Number.isFinite(zone.start) && Number.isFinite(zone.end)) return zone;
  const start = zone.startRatio * totalLength;
  const rawEnd = zone.endRatio * totalLength;
  return {
    ...zone,
    start,
    end: rawEnd >= start ? rawEnd : rawEnd + totalLength,
  };
}

function scoreStraightWindow(samples, startIndex, windowSize) {
  let curvature = 0;
  for (let offset = 0; offset < windowSize; offset += 1) {
    curvature += samples[(startIndex + offset) % (samples.length - 1)].curvature;
  }
  return curvature / windowSize;
}

function deriveDrsZones(samples, totalLength) {
  const usableSampleCount = samples.length - 1;
  const windowSize = Math.max(96, Math.floor(usableSampleCount * 0.07));
  const candidates = [];

  for (let index = 0; index < usableSampleCount; index += Math.floor(windowSize / 2)) {
    const start = samples[index];
    const end = samples[(index + windowSize) % usableSampleCount];
    const distance = end.distance >= start.distance
      ? end.distance - start.distance
      : totalLength - start.distance + end.distance;
    if (distance < 360) continue;
    candidates.push({
      startRatio: start.distance / totalLength,
      endRatio: (start.distance + Math.min(distance, totalLength * 0.16)) / totalLength,
      score: scoreStraightWindow(samples, index, windowSize),
    });
  }

  return candidates
    .sort((a, b) => a.score - b.score)
    .reduce((zones, candidate) => {
      const farEnough = zones.every((zone) => Math.abs(zone.startRatio - candidate.startRatio) > 0.18);
      if (farEnough && zones.length < 3) {
        zones.push({
          id: `generated-drs-${zones.length + 1}`,
          startRatio: candidate.startRatio % 1,
          endRatio: candidate.endRatio % 1,
        });
      }
      return zones;
    }, [])
    .sort((a, b) => a.startRatio - b.startRatio);
}

export function buildTrackModel(track = TRACK) {
  const controls = track.centerlineControls ?? CENTERLINE_CONTROLS;
  const base = [];
  for (let index = 0; index <= track.sampleCount; index += 1) {
    base.push(rawCenterPoint(index / track.sampleCount, controls));
  }

  let totalLength = 0;
  const samples = base.map((point, index) => {
    if (index > 0) totalLength += distance(base[index - 1], point);
    return { ...point, distance: totalLength, heading: 0, normalX: 0, normalY: 0, curvature: 0 };
  });

  samples.forEach((sample, index) => {
    const previous = samples[(index - 1 + samples.length - 1) % (samples.length - 1)];
    const next = samples[(index + 1) % (samples.length - 1)];
    const heading = Math.atan2(next.y - previous.y, next.x - previous.x);
    const nextHeading = Math.atan2(
      samples[(index + 2) % (samples.length - 1)].y - sample.y,
      samples[(index + 2) % (samples.length - 1)].x - sample.x,
    );
    sample.heading = heading;
    sample.normalX = -Math.sin(heading);
    sample.normalY = Math.cos(heading);
    sample.curvature = Math.abs(normalizeAngle(nextHeading - heading)) / 28;
  });

  const normalizedSamples = rotateSamplesToStandingStart(samples, totalLength);

  return {
    ...track,
    centerlineControls: controls,
    length: totalLength,
    samples: normalizedSamples,
    drsZones: (track.drsZones ?? deriveDrsZones(normalizedSamples, totalLength))
      .map((zone) => normalizeDrsZone(zone, totalLength)),
  };
}

export function createProceduralTrack(seed = Date.now()) {
  const normalizedSeed = normalizeSeed(seed);

  for (let attempt = 0; attempt < GENERATED_TRACK_ATTEMPTS; attempt += 1) {
    const candidateSeed = (normalizedSeed + Math.imul(attempt, 2654435761)) >>> 0;
    const candidate = {
      ...TRACK,
      name: `Generated GP ${candidateSeed.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`,
      seed: candidateSeed,
      centerlineControls: generateCenterlineControls(candidateSeed),
      drsZones: null,
    };
    const model = buildTrackModel(candidate);
    const valid =
      model.length >= GENERATED_TRACK_MIN_LENGTH &&
      model.length <= GENERATED_TRACK_MAX_LENGTH &&
      samplesStayInsideWorld(model.samples) &&
      hasEnoughTrackClearance(model.samples, model.length, model.width * MIN_TRACK_CLEARANCE_MULTIPLIER) &&
      hasReasonableTurnSharpness(model.samples) &&
      !hasSelfIntersections(model.samples);

    if (valid) {
      return {
        ...candidate,
        drsZones: model.drsZones.map(({ id, startRatio, endRatio }) => ({ id, startRatio, endRatio })),
      };
    }
  }

  return {
    ...TRACK,
    name: `Generated GP ${normalizedSeed.toString(36).toUpperCase().padStart(6, '0').slice(-6)}`,
    seed: normalizedSeed,
    centerlineControls: generateFallbackCenterlineControls(normalizedSeed),
    drsZones: null,
  };
}

export function pointAt(track, distanceAlong) {
  const wrapped = wrapDistance(distanceAlong, track.length);
  let low = 0;
  let high = track.samples.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (track.samples[mid].distance < wrapped) low = mid + 1;
    else high = mid;
  }

  const next = track.samples[low] ?? track.samples[0];
  const previous = track.samples[Math.max(0, low - 1)] ?? next;
  const span = Math.max(1, next.distance - previous.distance);
  const amount = clamp((wrapped - previous.distance) / span, 0, 1);

  return {
    x: previous.x + (next.x - previous.x) * amount,
    y: previous.y + (next.y - previous.y) * amount,
    heading: previous.heading + normalizeAngle(next.heading - previous.heading) * amount,
    normalX: previous.normalX + (next.normalX - previous.normalX) * amount,
    normalY: previous.normalY + (next.normalY - previous.normalY) * amount,
    curvature: previous.curvature + (next.curvature - previous.curvature) * amount,
    distance: wrapped,
  };
}

export function nearestTrackState(track, position) {
  let best = track.samples[0];
  let bestDistance = Infinity;

  for (const sample of track.samples) {
    const dx = position.x - sample.x;
    const dy = position.y - sample.y;
    const squared = dx * dx + dy * dy;
    if (squared < bestDistance) {
      bestDistance = squared;
      best = sample;
    }
  }

  const dx = position.x - best.x;
  const dy = position.y - best.y;
  const signedOffset = dx * best.normalX + dy * best.normalY;
  const crossTrackError = Math.abs(signedOffset);
  const trackEdge = track.width / 2;
  const kerbEdge = trackEdge + (track.kerbWidth ?? 0);
  const gravelEdge = kerbEdge + track.gravelWidth;
  const runoffEdge = gravelEdge + track.runoffWidth;
  const surface = crossTrackError <= trackEdge
    ? 'track'
    : crossTrackError <= kerbEdge
      ? 'kerb'
      : crossTrackError <= gravelEdge
        ? 'gravel'
        : crossTrackError <= runoffEdge
          ? 'grass'
          : 'barrier';

  return {
    ...best,
    signedOffset,
    crossTrackError,
    surface,
    onTrack: surface === 'track' || surface === 'kerb',
  };
}

export function offsetTrackPoint(point, offset) {
  return {
    x: point.x + point.normalX * offset,
    y: point.y + point.normalY * offset,
    heading: point.heading,
  };
}

export function isInDrsZone(track, progress) {
  const wrapped = wrapDistance(progress, track.length);
  return track.drsZones.some((zone) => {
    const start = wrapDistance(zone.start, track.length);
    const end = wrapDistance(zone.end, track.length);
    if (zone.end - zone.start >= track.length) return true;
    return end >= start
      ? wrapped >= start && wrapped <= end
      : wrapped >= start || wrapped <= end;
  });
}

export { normalizeAngle };
