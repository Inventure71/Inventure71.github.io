export const WORLD = {
  width: 1700,
  height: 1020,
};

export const TRACK = {
  name: 'Apex Harbor GP',
  width: 210,
  sampleCount: 980,
  drsZones: [
    { id: 'main-straight', startRatio: 0.16, endRatio: 0.28 },
    { id: 'back-straight', startRatio: 0.58, endRatio: 0.72 },
  ],
};

const TWO_PI = Math.PI * 2;

function rawCenterPoint(t) {
  return {
    x: WORLD.width * (0.5 + Math.cos(t) * 0.382 + Math.cos(t * 3.1) * 0.046 - Math.sin(t * 1.7) * 0.025),
    y: WORLD.height * (0.51 + Math.sin(t) * 0.322 + Math.sin(t * 2.2) * 0.052 + Math.cos(t * 1.4) * 0.02),
  };
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
    const t = (index / track.sampleCount) * TWO_PI - Math.PI / 2;
    base.push(rawCenterPoint(t));
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
  return {
    ...best,
    signedOffset,
    crossTrackError: Math.abs(signedOffset),
    onTrack: Math.abs(signedOffset) <= track.width / 2,
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
