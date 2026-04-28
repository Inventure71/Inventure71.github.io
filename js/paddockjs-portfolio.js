import {
  CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  DEMO_PROJECT_DRIVERS,
  createPaddockSimulator,
  mountF1Simulator,
} from '@inventure71/paddockjs';
import { setPaddockShellState } from './paddockjs-boot-state.js';

const root = document.getElementById('f1-simulator-root');
const timingRoot = document.getElementById('paddock-timing-root');
const raceRoot = document.getElementById('paddock-race-root');
const safetyRoot = document.getElementById('paddock-safety-root');
const radioRoot = document.getElementById('paddock-radio-root');
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

async function mountStandaloneSimulator() {
  await mountF1Simulator(root, portfolioOptions);
}

async function mountProjectsSimulator() {
  setPaddockShellState(paddockShell, 'booting');

  const simulator = createPaddockSimulator({
    ...portfolioOptions,
    showBackLink: false,
    ui: {
      layoutPreset: 'left-tower-overlay',
      cameraControls: 'embedded',
      showFps: false,
    },
  });

  simulator.mountTimingTower(timingRoot);
  simulator.mountRaceCanvas(raceRoot);
  simulator.mountSafetyCarControl(safetyRoot);
  simulator.mountRaceDataPanel(radioRoot);
  await simulator.start();
  setPaddockShellState(paddockShell, 'ready');
}

if (root || (timingRoot && raceRoot && safetyRoot && radioRoot)) {
  const mount = root ? mountStandaloneSimulator : mountProjectsSimulator;

  mount().catch((error) => {
    setPaddockShellState(paddockShell, 'error');
    const errorRoot = root || raceRoot;
    if (errorRoot) errorRoot.dataset.simulatorState = 'error';
    console.error('PaddockJS failed to initialize.', error);
  });
}
