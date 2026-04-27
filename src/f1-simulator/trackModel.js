export const WORLD = {
  width: 7600,
  height: 4600,
};

export const TRACK = {
  name: 'Apex Harbor GP',
  width: 230,
  gravelWidth: 165,
  runoffWidth: 260,
  sampleCount: 3600,
  drsZones: [
    { id: 'main-straight', startRatio: 0.02, endRatio: 0.14 },
    { id: 'back-straight', startRatio: 0.43, endRatio: 0.56 },
    { id: 'harbor-straight', startRatio: 0.82, endRatio: 0.93 },
  ],
};

const TWO_PI = Math.PI * 2;
const GENERATED_TRACK_MIN_LENGTH = 7600;
const GENERATED_TRACK_MAX_LENGTH = 14500;
const GENERATED_TRACK_ATTEMPTS = 12;
const GENERATED_CONTROL_COUNT = 18;
const TRACK_BOUNDARY_PADDING = 520;

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

function normalizeAngle(angle) {
  let value = ((angle + Math.PI) % TWO_PI) - Math.PI;
  if (value < -Math.PI) value += TWO_PI;
  return value;
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

function generateCenterlineControls(seed) {
  const random = mulberry32(seed);
  const center = { x: WORLD.width / 2, y: WORLD.height / 2 };
  const horizontalWave = seededRange(random, 0, TWO_PI);
  const verticalWave = seededRange(random, 0, TWO_PI);
  const kinkWave = seededRange(random, 0, TWO_PI);
  const angleStep = TWO_PI / GENERATED_CONTROL_COUNT;

  return Array.from({ length: GENERATED_CONTROL_COUNT }, (_, index) => {
    const angleJitter = seededRange(random, -angleStep * 0.22, angleStep * 0.22);
    const angle = Math.PI + index * angleStep + angleJitter;
    const harmonic = Math.sin(angle * 3 + horizontalWave) * 0.10 + Math.sin(angle * 5 + kinkWave) * 0.045;
    const rx = WORLD.width * seededRange(random, 0.335, 0.392) * (1 + harmonic);
    const ry = WORLD.height * seededRange(random, 0.300, 0.372) * (1 - harmonic * 0.55);
    const pinch = 1 + Math.sin(angle * 2 + verticalWave) * seededRange(random, -0.055, 0.075);

    return {
      x: center.x + Math.cos(angle) * rx * pinch,
      y: center.y + Math.sin(angle) * ry * pinch,
    };
  });
}

function generateFallbackCenterlineControls(seed) {
  const random = mulberry32(seed ^ 0xa5a5a5a5);
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
  const windowSize = Math.max(80, Math.floor(usableSampleCount * 0.055));
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
      endRatio: (start.distance + Math.min(distance, totalLength * 0.12)) / totalLength,
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

  return {
    ...track,
    centerlineControls: controls,
    length: totalLength,
    samples,
    drsZones: (track.drsZones ?? deriveDrsZones(samples, totalLength)).map((zone) => normalizeDrsZone(zone, totalLength)),
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
  const wrapped = ((distanceAlong % track.length) + track.length) % track.length;
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
  const amount = Math.min(Math.max((wrapped - previous.distance) / span, 0), 1);

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
  const gravelEdge = trackEdge + track.gravelWidth;
  const runoffEdge = gravelEdge + track.runoffWidth;
  const surface = crossTrackError <= trackEdge
    ? 'track'
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
    onTrack: surface === 'track',
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
  const wrapped = ((progress % track.length) + track.length) % track.length;
  return track.drsZones.some((zone) => {
    const start = ((zone.start % track.length) + track.length) % track.length;
    const end = ((zone.end % track.length) + track.length) % track.length;
    if (zone.end - zone.start >= track.length) return true;
    return end >= start
      ? wrapped >= start && wrapped <= end
      : wrapped >= start || wrapped <= end;
  });
}

export { normalizeAngle };
