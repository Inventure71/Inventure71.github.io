import {
  createPaddockSimulator,
  mountF1Simulator,
} from '@inventure71/paddockjs';
import { PORTFOLIO_DRIVERS, PORTFOLIO_ENTRIES } from './portfolio-race-data.js';
import { setPaddockShellState, syncPaddockShellLayout } from './paddockjs-boot-state.js';
import { getPaddockTheme, installPaddockThemeSync } from './paddockjs-theme-sync.js';

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
  drivers: PORTFOLIO_DRIVERS,
  entries: PORTFOLIO_ENTRIES,
  rules: raceRules,
  physicsMode: 'arcade',
  theme: getPaddockTheme(),
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
  const simulator = await mountF1Simulator(root, portfolioOptions);
  installPaddockThemeSync(simulator);
}

async function mountProjectsSimulator() {
  syncPaddockShellLayout(paddockShell, projectSimulatorUi);
  setPaddockShellState(paddockShell, 'booting');

  const simulator = createPaddockSimulator({
    ...portfolioOptions,
    showBackLink: false,
    ui: projectSimulatorUi,
    theme: getPaddockTheme(),
  });

  simulator.mountRaceTelemetryDrawer(raceRoot, {
    timingTowerVerticalFit: projectSimulatorUi.timingTowerVerticalFit,
    raceDataTelemetryDetail: projectSimulatorUi.raceDataTelemetryDetail,
  });
  await simulator.start();
  installPaddockThemeSync(simulator);
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
