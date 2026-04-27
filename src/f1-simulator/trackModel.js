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

function rawCenterPoint(ratio) {
  const count = CENTERLINE_CONTROLS.length;
  const scaled = ratio * count;
  const index = Math.floor(scaled) % count;
  const localT = scaled - Math.floor(scaled);
  const p0 = CENTERLINE_CONTROLS[(index - 1 + count) % count];
  const p1 = CENTERLINE_CONTROLS[index];
  const p2 = CENTERLINE_CONTROLS[(index + 1) % count];
  const p3 = CENTERLINE_CONTROLS[(index + 2) % count];
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

export function buildTrackModel(track = TRACK) {
  const base = [];
  for (let index = 0; index <= track.sampleCount; index += 1) {
    base.push(rawCenterPoint(index / track.sampleCount));
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
    length: totalLength,
    samples,
    drsZones: track.drsZones.map((zone) => ({
      ...zone,
      start: zone.startRatio * totalLength,
      end: zone.endRatio * totalLength,
    })),
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
  return track.drsZones.some((zone) => wrapped >= zone.start && wrapped <= zone.end);
}

export { normalizeAngle };
