import {
  CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  DEMO_PROJECT_DRIVERS,
  createPaddockSimulator,
  mountRaceTelemetryDrawer,
  mountF1Simulator,
} from '@inventure71/paddockjs';
import { setPaddockShellState, syncPaddockShellLayout } from './paddockjs-boot-state.js';

const root = document.getElementById('f1-simulator-root');
const raceRoot = document.getElementById('paddock-race-root');
const paddockShell = document.querySelector('[data-paddock-shell]');

const raceRules = {
  ruleset: 'custom',
  modules: {
    pitStops: {
      enabled: true,
    },
    stalledDnf: {
      enabled: true,
    },
    tireStrategy: {
      enabled: true,
      mandatoryDistinctDryCompounds: 2,
    },
    penalties: {
      collision: {
        strictness: 1,
        consequences: [{ type: 'time', seconds: 5 }],
      },
      trackLimits: {
        strictness: 1,
        warningsBeforePenalty: 3,
        consequences: [{ type: 'time', seconds: 5 }],
      },
    },
  },
};

const portfolioOptions = {
  drivers: DEMO_PROJECT_DRIVERS,
  entries: CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  rules: raceRules,
  title: 'F1 Simulator Lab',
  kicker: 'Race Control',
  backLinkHref: 'projects.html',
  backLinkLabel: 'Projects',
  onDriverOpen(driver) {
    if (driver.link) window.open(driver.link, '_blank', 'noopener');
  },
};

const projectSimulatorUi = {
  layoutPreset: 'left-tower-overlay',
  cameraControls: 'embedded',
  showFps: false,
  telemetryModules: ['core', 'sectors', 'lapTimes', 'sectorTimes'],
  penaltyBanners: true,
  timingPenaltyBadges: true,
  timingTowerVerticalFit: 'expand-race-view',
  raceDataBannerSize: 'auto',
  raceDataTelemetryDetail: true,
  raceDataBanners: {
    initial: 'project',
    enabled: ['project', 'radio'],
  },
};

async function mountStandaloneSimulator() {
  await mountF1Simulator(root, portfolioOptions);
}

async function mountProjectsSimulator() {
  syncPaddockShellLayout(paddockShell, projectSimulatorUi);
  setPaddockShellState(paddockShell, 'booting');

  const simulator = createPaddockSimulator({
    ...portfolioOptions,
    showBackLink: false,
    ui: projectSimulatorUi,
  });

  mountRaceTelemetryDrawer(raceRoot, simulator, {
    timingTowerVerticalFit: projectSimulatorUi.timingTowerVerticalFit,
    raceDataTelemetryDetail: projectSimulatorUi.raceDataTelemetryDetail,
  });
  await simulator.start();
  setPaddockShellState(paddockShell, 'ready');
}

if (root || raceRoot) {
  const mount = root ? mountStandaloneSimulator : mountProjectsSimulator;

  mount().catch((error) => {
    setPaddockShellState(paddockShell, 'error');
    const errorRoot = root || raceRoot;
    if (errorRoot) errorRoot.dataset.simulatorState = 'error';
    console.error('PaddockJS failed to initialize.', error);
  });
}
