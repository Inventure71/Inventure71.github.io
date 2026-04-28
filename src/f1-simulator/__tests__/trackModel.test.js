import { describe, expect, test } from 'vitest';
import {
  buildTrackModel,
  createProceduralTrack,
  nearestTrackState,
  offsetTrackPoint,
  pointAt,
  TRACK,
  WORLD,
} from '../trackModel.js';

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

function expectNoSelfIntersections(track) {
  const points = track.samples.filter((_, index) => index % 12 === 0);
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
}

function trackSignature(track) {
  return track.centerlineControls.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join('|');
}

function radialCoefficientOfVariation(track) {
  const center = { x: WORLD.width / 2, y: WORLD.height / 2 };
  const radii = track.centerlineControls.map((point) => Math.hypot(point.x - center.x, point.y - center.y));
  const mean = radii.reduce((total, radius) => total + radius, 0) / radii.length;
  const variance = radii.reduce((total, radius) => total + (radius - mean) ** 2, 0) / radii.length;
  return Math.sqrt(variance) / mean;
}

function minimumNonAdjacentSampleDistance(track) {
  const points = track.samples.slice(0, -1).filter((_, index) => index % 24 === 0);
  let minimum = Infinity;

  for (let first = 0; first < points.length; first += 1) {
    for (let second = first + 1; second < points.length; second += 1) {
      const arcDistance = Math.abs(points[second].distance - points[first].distance);
      const loopDistance = Math.min(arcDistance, track.length - arcDistance);
      if (loopDistance < 700) continue;
      minimum = Math.min(minimum, Math.hypot(points[first].x - points[second].x, points[first].y - points[second].y));
    }
  }

  return minimum;
}

function maximumLocalTurn(track) {
  const samples = track.samples.slice(0, -1);
  let maximum = 0;

  for (let index = 0; index < samples.length; index += 6) {
    let turn = 0;
    for (let offset = 0; offset < 30; offset += 6) {
      const current = samples[(index + offset) % samples.length];
      const next = samples[(index + offset + 6) % samples.length];
      let delta = ((next.heading - current.heading + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (delta < -Math.PI) delta += Math.PI * 2;
      turn += Math.abs(delta);
    }
    maximum = Math.max(maximum, turn);
  }

  return maximum;
}

function headingDelta(first, second) {
  let delta = ((second - first + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return Math.abs(delta);
}

function maximumStartGridHeadingDelta(track) {
  const line = pointAt(track, 0);
  const gridSlots = [0, -98, -196, -294, -392, -490, -588, -686];

  return Math.max(...gridSlots.map((distanceAlong) => {
    const point = pointAt(track, distanceAlong);
    return headingDelta(line.heading, point.heading);
  }));
}

const GENERATED_TRACK_SEEDS = [7, 71, 1971, 10101, 20260427];
const START_GRID_TRACK_SEEDS = [null, ...GENERATED_TRACK_SEEDS];

describe('track model', () => {
  test('provides guidance without owning vehicle position', () => {
    const track = buildTrackModel(TRACK);
    const center = pointAt(track, track.length * 0.25);
    const outside = offsetTrackPoint(center, track.width);
    const state = nearestTrackState(track, outside);

    expect(track.length).toBeGreaterThan(1800);
    expect(Math.abs(state.signedOffset)).toBeGreaterThan(track.width / 2);
    expect(state.onTrack).toBe(false);
  });

  test('keeps the handcrafted DRS zones long enough to cover the full main straights', () => {
    const track = buildTrackModel(TRACK);
    const zoneLengths = track.drsZones.map((zone) => (zone.end - zone.start) / track.length);

    expect(zoneLengths[0]).toBeCloseTo(0.16, 6);
    expect(zoneLengths[1]).toBeCloseTo(0.17, 6);
    expect(zoneLengths[2]).toBeCloseTo(0.14, 6);
  });

  test('generates deterministic but seed-distinct circuit definitions', () => {
    const first = createProceduralTrack(12345);
    const repeated = createProceduralTrack(12345);
    const different = createProceduralTrack(54321);

    expect(trackSignature(first)).toBe(trackSignature(repeated));
    expect(trackSignature(first)).not.toBe(trackSignature(different));
    expect(first.drsZones).toHaveLength(3);
  });

  test.each(GENERATED_TRACK_SEEDS)('generated circuit seed %s stays inside the world and does not self-intersect', (seed) => {
    const track = buildTrackModel(createProceduralTrack(seed));

    expect(track.length).toBeGreaterThan(7600);
    expect(track.length).toBeLessThan(14500);
    expect(track.drsZones).toHaveLength(3);
    expect(radialCoefficientOfVariation(track)).toBeGreaterThan(0.28);
    expect(minimumNonAdjacentSampleDistance(track)).toBeGreaterThan(track.width * 1.55);
    expect(maximumLocalTurn(track)).toBeLessThanOrEqual(1.5);
    expect(track.samples.every((sample) => (
      sample.x > 460 &&
      sample.x < WORLD.width - 460 &&
      sample.y > 460 &&
      sample.y < WORLD.height - 460
    ))).toBe(true);
    expectNoSelfIntersections(track);
  });

  test.each(START_GRID_TRACK_SEEDS)('normalizes seed %s start finish line onto a straight grid section', (seed) => {
    const track = buildTrackModel(seed == null ? TRACK : createProceduralTrack(seed));
    const line = pointAt(track, 0);
    const exit = pointAt(track, 220);

    expect(maximumStartGridHeadingDelta(track)).toBeLessThan(0.14);
    expect(headingDelta(line.heading, exit.heading)).toBeLessThan(0.2);
  });

  test('treats the visual kerb band as drivable track-adjacent surface', () => {
    const track = buildTrackModel(TRACK);
    const center = pointAt(track, track.length * 0.3);
    const kerbPoint = offsetTrackPoint(center, track.width / 2 + track.kerbWidth * 0.55);
    const gravelPoint = offsetTrackPoint(center, track.width / 2 + track.kerbWidth + 18);

    const kerbState = nearestTrackState(track, kerbPoint);
    const gravelState = nearestTrackState(track, gravelPoint);

    expect(kerbState.surface).toBe('kerb');
    expect(kerbState.onTrack).toBe(true);
    expect(gravelState.surface).toBe('gravel');
    expect(gravelState.onTrack).toBe(false);
  });
});
