import { describe, expect, test } from 'vitest';
import { buildTrackModel, nearestTrackState, offsetTrackPoint, pointAt, TRACK } from '../trackModel.js';

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
});
