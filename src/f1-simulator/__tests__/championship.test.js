import { describe, expect, test } from 'vitest';
import {
  CHAMPIONSHIP_DRIVER_ENTRIES,
  CHAMPIONSHIP_PROJECT_DRIVERS,
  buildChampionshipDriverGrid,
  formatDriverNumber,
} from '../championship.js';

describe('championship driver metadata', () => {
  test('assigns stable unique driver numbers from the championship entries', () => {
    const numbers = CHAMPIONSHIP_PROJECT_DRIVERS.map((driver) => driver.driverNumber);

    expect(numbers).toHaveLength(new Set(numbers).size);
    expect(CHAMPIONSHIP_PROJECT_DRIVERS.find((driver) => driver.id === 'budget').driverNumber).toBe(71);
    expect(formatDriverNumber(7)).toBe('07');
  });

  test('generates unique F1-style three-letter timing names', () => {
    const timingCodes = CHAMPIONSHIP_PROJECT_DRIVERS.map((driver) => driver.timingCode);

    expect(timingCodes).toHaveLength(new Set(timingCodes).size);
    expect(timingCodes.every((code) => /^[A-Z]{3}$/.test(code))).toBe(true);
    expect(CHAMPIONSHIP_PROJECT_DRIVERS.find((driver) => driver.id === 'budget').timingCode).toBe('BUD');
    expect(CHAMPIONSHIP_PROJECT_DRIVERS.find((driver) => driver.id === 'drsorriso').timingCode).toBe('DRS');
  });

  test('rejects duplicate championship driver numbers', () => {
    expect(() => buildChampionshipDriverGrid(undefined, [
      ...CHAMPIONSHIP_DRIVER_ENTRIES,
      { driverId: 'duplicate', driverNumber: 71, timingName: 'Duplicate' },
    ])).toThrow('Duplicate championship driver number: 71');
  });
});
