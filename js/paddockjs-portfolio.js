import {
  CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  DEMO_PROJECT_DRIVERS,
  createPaddockSimulator,
  mountF1Simulator,
} from '@inventure71/paddockjs';
import { setPaddockShellState, syncPaddockShellLayout } from './paddockjs-boot-state.js';

const root = document.getElementById('f1-simulator-root');
const timingRoot = document.getElementById('paddock-timing-root');
const raceRoot = document.getElementById('paddock-race-root');
const safetyRoot = document.getElementById('paddock-safety-root');
const paddockShell = document.querySelector('[data-paddock-shell]');

const portfolioOptions = {
  drivers: DEMO_PROJECT_DRIVERS,
  entries: CHAMPIONSHIP_ENTRY_BLUEPRINTS,
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
  timingTowerVerticalFit: 'expand-race-view',
  raceDataBannerSize: 'auto',
  raceDataBanners: {
    initial: 'radio',
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

  simulator.mountTimingTower(timingRoot);
  simulator.mountRaceCanvas(raceRoot, { includeRaceDataPanel: true });
  simulator.mountSafetyCarControl(safetyRoot);
  await simulator.start();
  setPaddockShellState(paddockShell, 'ready');
}

if (root || (timingRoot && raceRoot && safetyRoot)) {
  const mount = root ? mountStandaloneSimulator : mountProjectsSimulator;

  mount().catch((error) => {
    setPaddockShellState(paddockShell, 'error');
    const errorRoot = root || raceRoot;
    if (errorRoot) errorRoot.dataset.simulatorState = 'error';
    console.error('PaddockJS failed to initialize.', error);
  });
}
