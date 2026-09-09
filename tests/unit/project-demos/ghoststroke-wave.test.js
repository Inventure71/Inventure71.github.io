import { describe, test, expect } from 'vitest';
import { activitySamples } from '../../../js/project-demos/ghoststroke-wave.js';

describe('Ghostyper activity wave', () => {
  test('a pause is flat while faster keys have greater amplitude', () => {
    const samples = activitySamples([
      { kind:'typing', duration:200 },
      { kind:'pause', duration:200 },
      { kind:'correction', duration:100 },
      { kind:'correction', duration:100 },
    ], 6);
    expect(samples[0].activity).toBe(5);
    expect(samples[2].activity).toBe(0);
    expect(samples[3].activity).toBe(0);
    expect(samples[4].activity).toBe(10);
    expect(samples[4].kind).toBe('correction');
  });
  test('integrated activity matches the emitted characters rather than decorative noise', () => {
    const plan = [{kind:'typing',duration:73},{kind:'alternative',duration:115},{kind:'consider',duration:1800},{kind:'correction',duration:27}];
    const samples=activitySamples(plan);
    const secondsPerBin = 2.015 / samples.length;
    expect(samples.reduce((sum,s)=>sum+s.activity*secondsPerBin,0)).toBeCloseTo(3,6);
    expect(activitySamples([])).toEqual([]);
  });
});
