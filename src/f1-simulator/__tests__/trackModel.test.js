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

  test('generates deterministic but seed-distinct circuit definitions', () => {
    const first = createProceduralTrack(12345);
    const repeated = createProceduralTrack(12345);
    const different = createProceduralTrack(54321);

    expect(trackSignature(first)).toBe(trackSignature(repeated));
    expect(trackSignature(first)).not.toBe(trackSignature(different));
    expect(first.drsZones).toHaveLength(3);
  });

  test('generated circuits stay inside the world and do not self-intersect', () => {
    [7, 71, 1971, 20260427].forEach((seed) => {
      const track = buildTrackModel(createProceduralTrack(seed));

      expect(track.length).toBeGreaterThan(7600);
      expect(track.length).toBeLessThan(14500);
      expect(track.drsZones).toHaveLength(3);
      expect(track.samples.every((sample) => (
        sample.x > 460 &&
        sample.x < WORLD.width - 460 &&
        sample.y > 460 &&
        sample.y < WORLD.height - 460
      ))).toBe(true);
      expectNoSelfIntersections(track);
    });
  });
});
