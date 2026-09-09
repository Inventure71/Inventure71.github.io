import {
  CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  DEMO_PROJECT_DRIVERS,
  DriverData,
  VehicleData,
} from '@inventure71/paddockjs/data';
import { projectCommandItems } from './playfolio/catalog.js';

// Package demo descriptions are examples; portfolio facts belong to this site.
const portfolioDemoCopy = {
  vinyl: ['Objects select music', 'Computer vision', 'Gesture playback controls'],
  victoria: ['Connect Four robot', 'Board recognition', 'Minimax move selection'],
  reminderz: ['Notes and reminders', 'Conversation history', 'Project organization'],
  evolve: ['Dynamic Python tools', 'Gemini + Ollama', 'Agent runtime'],
};

const additionalDrivers = [
  {
    id: 'noty',
    code: 'NOT',
    icon: 'NY',
    raceName: 'NOTY',
    name: 'Noty',
    color: '#f59e0b',
    tire: 'M',
    pace: 1.02,
    racecraft: 0.84,
    link: '/project_details/project-noty.html',
    raceData: ['Local-first notes', 'Swift 6 + AppKit', 'Window attachments'],
  },
  {
    id: 'paddockjs',
    code: 'PDK',
    icon: 'PJ',
    raceName: 'PADDOCK',
    name: 'PaddockJS',
    color: '#8b5cf6',
    tire: 'S',
    pace: 1.05,
    racecraft: 0.88,
    link: '/project_details/project-paddockjs.html',
    raceData: ['F1 simulation toolkit', 'PixiJS rendering', 'Headless environment'],
  },
  {
    id: 'dream2detect',
    code: 'D2D',
    icon: 'D2',
    raceName: 'DREAM',
    name: 'Dream2Detect',
    color: '#14b8a6',
    tire: 'M',
    pace: 1,
    racecraft: 0.81,
    link: '/project_details/project-dream2detect.html',
    raceData: ['Synthetic-to-real study', 'Package damage vision', 'PyTorch pipeline'],
  },
  {
    id: 'vigil',
    code: 'VIG',
    icon: 'VG',
    raceName: 'VIGIL',
    name: 'VIGIL',
    color: '#c084fc',
    tire: 'H',
    pace: 0.99,
    racecraft: 0.86,
    link: '/project_details/project-vigil.html',
    raceData: ['Robot fleet operations', 'Guided recovery', 'FastAPI + ROS'],
  },
  {
    id: 'contextkey',
    code: 'CTX',
    icon: 'CK',
    raceName: 'CONTEXT',
    name: 'ContextKey',
    color: '#60a5fa',
    tire: 'M',
    pace: 1.01,
    racecraft: 0.79,
    link: '/project_details/project-contextkey.html',
    raceData: ['Local autocomplete', 'On-device MLX', 'macOS context capture'],
  },
  {
    id: 'project-unity',
    code: 'UNI',
    icon: 'UY',
    raceName: 'UNITY',
    name: 'Project Unity',
    color: '#4f7cff',
    tire: 'S',
    pace: 1.04,
    racecraft: 0.9,
    link: '/project_details/project-unity.html',
    raceData: ['Cross-platform input', 'Encrypted LAN transport', 'macOS + Windows'],
  },
  {
    id: 'mattyflow',
    code: 'MAT',
    icon: 'MF',
    raceName: 'MATTY',
    name: 'MattyFlow',
    color: '#2f9d73',
    tire: 'M',
    pace: 1.01,
    racecraft: 0.86,
    link: '/project_details/project-mattyflow.html',
    raceData: ['Local macOS dictation', 'MLX speech + Gemma', 'Swift + FastAPI'],
  },
  {
    id: 'mosaic',
    code: 'MOS',
    icon: 'MO',
    raceName: 'MOSAIC',
    name: 'Mosaic',
    color: '#e56d2f',
    tire: 'H',
    pace: 0.98,
    racecraft: 0.9,
    link: '/project_details/project-mosaic.html',
    raceData: ['ROS 2 robot fleet', 'Robot-local autonomy', 'OptiTrack + UDP'],
  },
  {
    id: 'databases-ie',
    code: 'DBI',
    icon: 'DB',
    raceName: 'DATABASE',
    name: 'TCGNET',
    color: '#c88a1b',
    tire: 'M',
    pace: 0.99,
    racecraft: 0.85,
    link: '/project_details/project-databases-ie.html',
    raceData: ['PostgreSQL data model', 'Django marketplace', 'Transactional inventory'],
  },
  {
    id: 'ghoststroke',
    code: 'GST',
    icon: 'GS',
    raceName: 'GHOST',
    name: 'Ghostyper',
    color: '#9b8a73',
    tire: 'S',
    pace: 1.02,
    racecraft: 0.82,
    link: '/project_details/project-ghoststroke.html',
    raceData: ['Prepared text typing', 'Custom cadence', 'Test Bench preview'],
  },
];

const additionalEntrySpecs = [
  { driverId: 'noty', number: 24, timingName: 'Noty', vehicleId: 'noty-ny24', vehicleName: 'NY-24 Lasso' },
  { driverId: 'paddockjs', number: 42, timingName: 'PaddockJS', vehicleId: 'paddock-pj42', vehicleName: 'PJ-42 Grid' },
  { driverId: 'dream2detect', number: 26, timingName: 'Dream2Detect', vehicleId: 'dream-d226', vehicleName: 'D2-26 Vision' },
  { driverId: 'vigil', number: 88, timingName: 'VIGIL', vehicleId: 'vigil-vg88', vehicleName: 'VG-88 Sentinel' },
  { driverId: 'contextkey', number: 17, timingName: 'ContextKey', vehicleId: 'context-ck17', vehicleName: 'CK-17 Local' },
  { driverId: 'project-unity', number: 64, timingName: 'Project Unity', vehicleId: 'unity-uy64', vehicleName: 'UY-64 Relay' },
  { driverId: 'mattyflow', number: 12, timingName: 'MattyFlow', vehicleId: 'matty-mf12', vehicleName: 'MF-12 Whisper' },
  { driverId: 'mosaic', number: 32, timingName: 'Mosaic', vehicleId: 'mosaic-mo32', vehicleName: 'MO-32 Swarm' },
  { driverId: 'databases-ie', number: 44, timingName: 'TCGNET', vehicleId: 'database-db44', vehicleName: 'DB-44 Ledger' },
  { driverId: 'ghoststroke', number: 77, timingName: 'Ghostyper', vehicleId: 'ghoststroke-gs77', vehicleName: 'GS-77 Cadence' },
];

// These ratings tune the race simulation; they are not product-performance claims.
function createBalancedEntry({ driverId, number, timingName, vehicleId, vehicleName }) {
  return {
    driverId,
    driverNumber: number,
    timingName,
    driver: new DriverData({
      pace: 68,
      racecraft: 74,
      aggression: 56,
      riskTolerance: 58,
      patience: 67,
      consistency: 72,
    }),
    vehicle: new VehicleData({
      id: vehicleId,
      name: vehicleName,
      power: 67,
      braking: 66,
      aero: 65,
      dragEfficiency: 64,
      mechanicalGrip: 68,
      weightControl: 63,
      tireCare: 70,
    }),
  };
}

const catalogByHref = new Map(projectCommandItems.map((project) => [project.href, project]));

// Editorial starting grid. The simulation can change positions once racing starts.
const projectGridOrder = [
  'core',
  'victoria',
  'ghoststroke',
  'dream2detect',
  'noir',
  'vinyl',
  'mosaic',
  'vigil',
  'noty',
  'paddockjs',
  'project-unity',
  'clipclop',
  'contextkey',
  'mattyflow',
  'clash',
  'drsorriso',
  'reminderz',
  'evolve',
  'databases-ie',
  'budget',
];
const driversById = new Map([...DEMO_PROJECT_DRIVERS, ...additionalDrivers].map((driver) => [driver.id, driver]));
if (projectGridOrder.length !== driversById.size || new Set(projectGridOrder).size !== driversById.size) {
  throw new Error('Project starting grid must include every driver exactly once');
}

export const PORTFOLIO_DRIVERS = projectGridOrder.map((id) => {
  const driver = driversById.get(id);
  if (!driver) throw new Error(`Unknown project in starting grid: ${id}`);
  const project = catalogByHref.get(driver.link);
  if (!project) throw new Error(`Race entry missing from project catalog: ${driver.link}`);
  return {
    ...driver,
    name: project.label,
    raceData: portfolioDemoCopy[driver.id] || driver.raceData,
  };
});

const entriesById = new Map([
  ...CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  ...additionalEntrySpecs.map(createBalancedEntry),
].map((entry) => [entry.driverId, entry]));

export const PORTFOLIO_ENTRIES = PORTFOLIO_DRIVERS.map(({ id }) => {
  const entry = entriesById.get(id);
  if (!entry) throw new Error(`Race entry missing for project: ${id}`);
  return entry;
});
