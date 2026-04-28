import { describe, expect, test } from 'vitest';
import {
  CHAMPIONSHIP_DRIVER_ENTRIES,
  CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  CHAMPIONSHIP_PROJECT_DRIVERS,
  DriverData,
  DRIVER_STAT_DEFINITIONS,
  VehicleData,
  VEHICLE_STAT_DEFINITIONS,
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

  test('defines neutral-at-50 rating sheets for drivers and vehicles', () => {
    expect(Object.keys(DRIVER_STAT_DEFINITIONS)).toEqual([
      'pace',
      'racecraft',
      'aggression',
      'riskTolerance',
      'patience',
      'consistency',
    ]);
    expect(Object.keys(VEHICLE_STAT_DEFINITIONS)).toEqual([
      'power',
      'braking',
      'aero',
      'dragEfficiency',
      'mechanicalGrip',
      'weightControl',
      'tireCare',
    ]);
    [...Object.values(DRIVER_STAT_DEFINITIONS), ...Object.values(VEHICLE_STAT_DEFINITIONS)].forEach((definition) => {
      expect(definition.neutral).toBe(50);
      expect(definition.minimum).toBe(0);
      expect(definition.maximum).toBe(100);
    });
  });

  test('builds paired driver and vehicle constructor argument sheets', () => {
    const budget = CHAMPIONSHIP_PROJECT_DRIVERS.find((driver) => driver.id === 'budget');
    const blueprint = CHAMPIONSHIP_ENTRY_BLUEPRINTS.find((entry) => entry.driverId === 'budget');

    expect(blueprint.driver).toBeInstanceOf(DriverData);
    expect(blueprint.vehicle).toBeInstanceOf(VehicleData);
    expect(blueprint.driver.pace).toBeGreaterThanOrEqual(0);
    expect(blueprint.driver.pace).toBeLessThanOrEqual(100);
    expect(blueprint.vehicle.power).toBeGreaterThanOrEqual(0);
    expect(blueprint.vehicle.power).toBeLessThanOrEqual(100);
    expect(budget.constructorArgs.driver.ratings).toEqual(blueprint.driver.ratings());
    expect(budget.constructorArgs.vehicle.ratings).toEqual(blueprint.vehicle.ratings());
    expect(budget.pace).not.toBe(1);
    expect(budget.racecraft).not.toBe(0.78);
    expect(budget.vehicle.powerNewtons).toBeGreaterThan(0);
    expect(budget.vehicle.brakeNewtons).toBeGreaterThan(0);
  });
});
