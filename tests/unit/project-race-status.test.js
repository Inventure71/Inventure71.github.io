import { describe, expect, test } from 'vitest';
import { getProjectRaceStatus } from '../../js/project-race-status.js';

describe('project race flag', () => {
  test.each([
    [{ mode: 'pre-start' }, 'starting', 'Starting'],
    [{ mode: 'green' }, 'racing', 'Racing'],
    [{ mode: 'safety-car' }, 'safety-car', 'Safety car'],
    [{ mode: 'red-flag', redFlag: true }, 'red-flag', 'Red flag'],
    // PaddockJS brings the safety car out after the full classification finishes.
    [{ mode: 'safety-car', finished: true }, 'finished', 'Finished'],
  ])('reflects race-control state %j', (raceControl, state, label) => {
    expect(getProjectRaceStatus({ raceControl })).toEqual({ state, label });
  });
});
