import { PROJECT_DRIVERS } from './drivers.js';

export const CHAMPIONSHIP = {
  id: 'project-race-2026',
  name: 'Project Race',
  season: 2026,
};

export const CHAMPIONSHIP_DRIVER_ENTRIES = [
  { driverId: 'budget', driverNumber: 71, timingName: 'Budget' },
  { driverId: 'noir', driverNumber: 13, timingName: 'Noir' },
  { driverId: 'vinyl', driverNumber: 33, timingName: 'HoloVinyl' },
  { driverId: 'drsorriso', driverNumber: 55, timingName: 'DrSorriso' },
  { driverId: 'victoria', driverNumber: 11, timingName: 'VictorIA' },
  { driverId: 'reminderz', driverNumber: 7, timingName: 'ReminderZ' },
  { driverId: 'clipclop', driverNumber: 14, timingName: 'ClipClop' },
  { driverId: 'evolve', driverNumber: 23, timingName: 'Evolve' },
  { driverId: 'clash', driverNumber: 47, timingName: 'Clash' },
  { driverId: 'core', driverNumber: 91, timingName: 'Core' },
];

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

export function formatDriverNumber(driverNumber) {
  return String(driverNumber ?? '').padStart(2, '0');
}

export function buildChampionshipDriverGrid(drivers = PROJECT_DRIVERS, entries = CHAMPIONSHIP_DRIVER_ENTRIES) {
  assertUniqueDriverNumbers(entries);

  const entryByDriverId = new Map(entries.map((entry) => [entry.driverId, entry]));
  const usedTimingCodes = new Set();

  return drivers.map((driver, index) => {
    const entry = entryByDriverId.get(driver.id) ?? {};
    const timingCode = pickUniqueTimingCode(entry.timingName ?? driver.name ?? driver.code, usedTimingCodes);
    const driverNumber = entry.driverNumber ?? index + 1;

    return {
      ...driver,
      code: timingCode,
      timingCode,
      raceName: timingCode,
      driverNumber,
      championship: {
        ...CHAMPIONSHIP,
        entryIndex: index,
      },
    };
  });
}

export const CHAMPIONSHIP_PROJECT_DRIVERS = buildChampionshipDriverGrid();
