import { DriverData } from './driverData.js';
import { PROJECT_DRIVERS } from './drivers.js';
import { VehicleData } from './vehicleData.js';

export { DriverData, DRIVER_STAT_DEFINITIONS } from './driverData.js';
export { VehicleData, VEHICLE_STAT_DEFINITIONS } from './vehicleData.js';

export const CHAMPIONSHIP = {
  id: 'project-race-2026',
  name: 'Project Race',
  season: 2026,
};

export const CHAMPIONSHIP_ENTRY_BLUEPRINTS = [
  {
    driverId: 'budget',
    driverNumber: 71,
    timingName: 'Budget',
    driver: new DriverData({ pace: 52, racecraft: 74, aggression: 38, riskTolerance: 47, patience: 81, consistency: 86 }),
    vehicle: new VehicleData({ id: 'budget-bb01', name: 'BB-01 Ledger', power: 48, braking: 72, aero: 55, dragEfficiency: 66, mechanicalGrip: 63, weightControl: 58, tireCare: 82 }),
  },
  {
    driverId: 'noir',
    driverNumber: 13,
    timingName: 'Noir',
    driver: new DriverData({ pace: 68, racecraft: 83, aggression: 61, riskTolerance: 72, patience: 57, consistency: 64 }),
    vehicle: new VehicleData({ id: 'noir-nn13', name: 'NN-13 Shadow', power: 64, braking: 60, aero: 73, dragEfficiency: 57, mechanicalGrip: 69, weightControl: 54, tireCare: 51 }),
  },
  {
    driverId: 'vinyl',
    driverNumber: 33,
    timingName: 'HoloVinyl',
    driver: new DriverData({ pace: 71, racecraft: 66, aggression: 52, riskTolerance: 59, patience: 62, consistency: 58 }),
    vehicle: new VehicleData({ id: 'vinyl-hv33', name: 'HV-33 Groove', power: 70, braking: 49, aero: 58, dragEfficiency: 74, mechanicalGrip: 52, weightControl: 68, tireCare: 46 }),
  },
  {
    driverId: 'drsorriso',
    driverNumber: 55,
    timingName: 'DrSorriso',
    driver: new DriverData({ pace: 46, racecraft: 69, aggression: 44, riskTolerance: 43, patience: 76, consistency: 73 }),
    vehicle: new VehicleData({ id: 'sorriso-ds55', name: 'DS-55 Intake', power: 54, braking: 67, aero: 62, dragEfficiency: 49, mechanicalGrip: 71, weightControl: 45, tireCare: 69 }),
  },
  {
    driverId: 'victoria',
    driverNumber: 11,
    timingName: 'VictorIA',
    driver: new DriverData({ pace: 78, racecraft: 79, aggression: 58, riskTolerance: 65, patience: 55, consistency: 68 }),
    vehicle: new VehicleData({ id: 'victoria-vi11', name: 'VI-11 Vector', power: 76, braking: 58, aero: 65, dragEfficiency: 63, mechanicalGrip: 61, weightControl: 60, tireCare: 48 }),
  },
  {
    driverId: 'reminderz',
    driverNumber: 7,
    timingName: 'ReminderZ',
    driver: new DriverData({ pace: 41, racecraft: 61, aggression: 34, riskTolerance: 39, patience: 85, consistency: 80 }),
    vehicle: new VehicleData({ id: 'reminderz-rz07', name: 'RZ-07 Recall', power: 42, braking: 76, aero: 50, dragEfficiency: 72, mechanicalGrip: 58, weightControl: 63, tireCare: 88 }),
  },
  {
    driverId: 'clipclop',
    driverNumber: 14,
    timingName: 'ClipClop',
    driver: new DriverData({ pace: 73, racecraft: 88, aggression: 76, riskTolerance: 78, patience: 48, consistency: 61 }),
    vehicle: new VehicleData({ id: 'clipclop-cc14', name: 'CC-14 Sync', power: 68, braking: 63, aero: 59, dragEfficiency: 61, mechanicalGrip: 78, weightControl: 56, tireCare: 44 }),
  },
  {
    driverId: 'evolve',
    driverNumber: 23,
    timingName: 'Evolve',
    driver: new DriverData({ pace: 56, racecraft: 70, aggression: 63, riskTolerance: 61, patience: 58, consistency: 52 }),
    vehicle: new VehicleData({ id: 'evolve-ev23', name: 'EV-23 Morph', power: 60, braking: 53, aero: 79, dragEfficiency: 46, mechanicalGrip: 66, weightControl: 49, tireCare: 57 }),
  },
  {
    driverId: 'clash',
    driverNumber: 47,
    timingName: 'Clash',
    driver: new DriverData({ pace: 44, racecraft: 67, aggression: 70, riskTolerance: 69, patience: 42, consistency: 59 }),
    vehicle: new VehicleData({ id: 'clash-cr47', name: 'CR-47 Arena', power: 57, braking: 48, aero: 52, dragEfficiency: 55, mechanicalGrip: 73, weightControl: 52, tireCare: 64 }),
  },
  {
    driverId: 'core',
    driverNumber: 91,
    timingName: 'Core',
    driver: new DriverData({ pace: 82, racecraft: 85, aggression: 67, riskTolerance: 74, patience: 53, consistency: 72 }),
    vehicle: new VehicleData({ id: 'core-ai91', name: 'AI-91 Core', power: 80, braking: 61, aero: 72, dragEfficiency: 59, mechanicalGrip: 75, weightControl: 51, tireCare: 50 }),
  },
];

export const CHAMPIONSHIP_DRIVER_ENTRIES = CHAMPIONSHIP_ENTRY_BLUEPRINTS.map((entry) => ({
  driverId: entry.driverId,
  driverNumber: entry.driverNumber,
  timingName: entry.timingName,
}));

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function normalizeLetters(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase();
}

function timingCodeCandidates(source) {
  const letters = normalizeLetters(source);
  if (!letters) return ['XXX'];
  if (letters.length <= 3) return [letters.padEnd(3, 'X')];

  const candidates = [letters.slice(0, 3)];
  for (let index = 1; index <= letters.length - 3; index += 1) {
    candidates.push(letters.slice(index, index + 3));
  }
  candidates.push(`${letters[0]}${letters[1]}${letters[letters.length - 1]}`);
  return [...new Set(candidates)];
}

function pickUniqueTimingCode(source, usedCodes) {
  for (const candidate of timingCodeCandidates(source)) {
    if (!usedCodes.has(candidate)) {
      usedCodes.add(candidate);
      return candidate;
    }
  }

  const letters = normalizeLetters(source).padEnd(2, 'X');
  for (const suffix of LETTERS) {
    const candidate = `${letters[0]}${letters[1]}${suffix}`;
    if (!usedCodes.has(candidate)) {
      usedCodes.add(candidate);
      return candidate;
    }
  }

  throw new Error(`Unable to create a unique three-letter timing code for "${source}"`);
}

function assertUniqueDriverNumbers(entries) {
  const seen = new Set();
  entries.forEach((entry) => {
    if (seen.has(entry.driverNumber)) {
      throw new Error(`Duplicate championship driver number: ${entry.driverNumber}`);
    }
    seen.add(entry.driverNumber);
  });
}

function buildDriverConstructorArgs(entry) {
  return (entry.driver ?? new DriverData()).toConstructorArgs();
}

function buildVehicleConstructorArgs(entry) {
  return (entry.vehicle ?? new VehicleData()).toConstructorArgs();
}

export function formatDriverNumber(driverNumber) {
  return String(driverNumber ?? '').padStart(2, '0');
}

export function buildChampionshipDriverGrid(drivers = PROJECT_DRIVERS, entries = CHAMPIONSHIP_DRIVER_ENTRIES) {
  assertUniqueDriverNumbers(entries);

  const entryByDriverId = new Map(entries.map((entry) => [entry.driverId, entry]));
  const blueprintByDriverId = new Map(CHAMPIONSHIP_ENTRY_BLUEPRINTS.map((entry) => [entry.driverId, entry]));
  const usedTimingCodes = new Set();

  return drivers.map((driver, index) => {
    const entry = {
      ...(blueprintByDriverId.get(driver.id) ?? {}),
      ...(entryByDriverId.get(driver.id) ?? {}),
    };
    const timingCode = pickUniqueTimingCode(entry.timingName ?? driver.name ?? driver.code, usedTimingCodes);
    const driverNumber = entry.driverNumber ?? index + 1;
    const driverArgs = buildDriverConstructorArgs({ driverId: driver.id, ...entry });
    const vehicleArgs = buildVehicleConstructorArgs({ driverId: driver.id, ...entry });

    return {
      ...driver,
      code: timingCode,
      timingCode,
      raceName: timingCode,
      driverNumber,
      pace: driverArgs.pace,
      racecraft: driverArgs.racecraft,
      consistency: driverArgs.consistency,
      personality: driverArgs.personality,
      vehicle: vehicleArgs,
      constructorArgs: {
        driver: driverArgs,
        vehicle: vehicleArgs,
      },
      championship: {
        ...CHAMPIONSHIP,
        entryIndex: index,
        vehicleId: vehicleArgs.id,
      },
    };
  });
}

export const CHAMPIONSHIP_PROJECT_DRIVERS = buildChampionshipDriverGrid();
