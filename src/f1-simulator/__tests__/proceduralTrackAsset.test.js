import { describe, expect, test } from 'vitest';
import {
  getOffsetGapBridges,
  getOffsetStrokeSegments,
  offsetGapBridgeIsSafe,
  offsetSegmentIsSafe,
} from '../proceduralTrackAsset.js';
import { buildTrackModel, offsetTrackPoint, TRACK } from '../trackModel.js';

describe('procedural track asset geometry', () => {
  test('renders normal offset edge segments but rejects non-local inside-corner chords', () => {
    const track = buildTrackModel(TRACK);
    const samples = track.samples.slice(0, -1);
    const offset = track.width / 2 + track.kerbWidth * 0.5;
    const current = samples[120];
    const next = samples[124];
    const start = offsetTrackPoint(current, offset);
    const end = offsetTrackPoint(next, offset);

    expect(offsetSegmentIsSafe(track, current, next, start, end, offset)).toBe(true);

    const farStart = offsetTrackPoint(samples[900], offset);
    const farEnd = offsetTrackPoint(samples[904], offset);
    expect(offsetSegmentIsSafe(track, current, next, farStart, farEnd, offset)).toBe(false);
  });

  test('rejects decorative edge segments that cut back over the road surface', () => {
    const track = buildTrackModel(TRACK);
    const samples = track.samples.slice(0, -1);
    const offset = track.width / 2 + track.kerbWidth * 0.5;
    const current = samples[360];
    const next = samples[364];
    const start = offsetTrackPoint(current, 12);
    const end = offsetTrackPoint(next, 12);

    expect(offsetSegmentIsSafe(track, current, next, start, end, offset)).toBe(false);
  });

  test('rejects offset decorations that intrude into a nearby non-adjacent road band', () => {
    const track = buildTrackModel(TRACK);
    const samples = track.samples.slice(0, -1);
    const offset = track.width / 2 + track.kerbWidth * 0.5;
    const current = samples[120];
    const next = samples[124];
    const nonLocalRoad = samples.find((sample) => (
      Math.abs(sample.distance - current.distance) > 900 &&
      Math.hypot(sample.x - current.x, sample.y - current.y) < 900
    ));

    expect(nonLocalRoad).toBeTruthy();

    const start = offsetTrackPoint(nonLocalRoad, 0);
    const end = offsetTrackPoint(nonLocalRoad, track.width * 0.18);

    expect(offsetSegmentIsSafe(track, current, next, start, end, offset)).toBe(false);
  });

  test('bridges only tiny decorative gaps created by inside-corner clipping', () => {
    const track = buildTrackModel(TRACK);
    const samples = track.samples.slice(0, -1);
    const segments = getOffsetStrokeSegments(track, {
      side: 1,
      offset: track.width / 2,
      step: 4,
    });
    const bridges = getOffsetGapBridges(track, segments, 5);

    expect(segments.some((segment) => !segment.safe)).toBe(true);
    expect(bridges.length).toBeGreaterThan(0);
    bridges.forEach((bridge) => {
      expect(offsetGapBridgeIsSafe(track, bridge.start, bridge.end, 5)).toBe(true);
    });

    const longStart = offsetTrackPoint(samples[40], track.width / 2);
    const longEnd = offsetTrackPoint(samples[300], track.width / 2);
    expect(offsetGapBridgeIsSafe(track, longStart, longEnd, 5)).toBe(false);
  });
});
