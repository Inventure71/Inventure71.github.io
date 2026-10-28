import {
  createPaddockSimulator,
  mountF1Simulator,
} from '@inventure71/paddockjs';
import { PORTFOLIO_DRIVERS, PORTFOLIO_ENTRIES } from './portfolio-race-data.js';
import { setPaddockShellState, syncPaddockShellLayout } from './paddockjs-boot-state.js';
import { getPaddockTheme, installPaddockThemeSync } from './paddockjs-theme-sync.js';

const root = document.getElementById('f1-simulator-root');
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
  gridWalk: { enabled: true, initialView: 'race' },
  ui: { viewControls: 'toggle' },
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

// A cached module is reusable: each mount owns one in-flight or ready instance.
const sessions = new WeakMap();

export function initializeProjectsRace(shell = paddockShell) {
  const raceRoot = shell?.querySelector('#paddock-race-root');
  if (!raceRoot) return Promise.reject(new Error('Missing project race mount.'));
  const existing = sessions.get(raceRoot);
  if (existing?.teardown) return existing.teardown.then(() => initializeProjectsRace(shell));
  if (existing) return existing.promise;

  const session = { simulator: null, stopTheme: () => {} };
  sessions.set(raceRoot, session);
  session.promise = Promise.resolve().then(async () => {
    syncPaddockShellLayout(shell, projectSimulatorUi);
    setPaddockShellState(shell, 'booting');
    try {
      const simulator = createPaddockSimulator({
        ...portfolioOptions,
        showBackLink: false,
        ui: { ...portfolioOptions.ui, ...projectSimulatorUi },
        theme: getPaddockTheme(),
      });
      session.simulator = simulator;
      simulator.mountRaceTelemetryDrawer(raceRoot, {
        timingTowerVerticalFit: projectSimulatorUi.timingTowerVerticalFit,
        raceDataTelemetryDetail: projectSimulatorUi.raceDataTelemetryDetail,
      });
      await simulator.start();
      session.stopTheme = installPaddockThemeSync(simulator);
      if (!session.teardown) setPaddockShellState(shell, 'ready');
      return simulator;
    } catch (error) {
      if (sessions.get(raceRoot) === session) {
        releaseSession(raceRoot, session);
        setPaddockShellState(shell, 'error');
      }
      throw error;
    }
  });
  return session.promise;
}

function releaseSession(raceRoot, session) {
  if (sessions.get(raceRoot) !== session) return;
  sessions.delete(raceRoot);
  session.stopTheme();
  try { session.simulator?.destroy(); }
  catch (error) { console.error('PaddockJS cleanup failed.', error); }
  raceRoot.replaceChildren();
}

// Await teardown before mounting into the same root again. In particular, do
// not destroy a package instance midway through its asynchronous renderer init.
export function destroyProjectsRace(shell = paddockShell) {
  const raceRoot = shell?.querySelector('#paddock-race-root');
  const session = raceRoot && sessions.get(raceRoot);
  if (!session) return Promise.resolve();
  if (!session.teardown) {
    session.teardown = session.promise.catch(() => {}).then(() => {
      if (!sessions.has(raceRoot) || sessions.get(raceRoot) === session) {
        releaseSession(raceRoot, session);
        setPaddockShellState(shell, 'preview');
      }
    });
  }
  return session.teardown;
}

// Only the standalone page auto-mounts. Embedded startup belongs to its loader.
if (root) {
  mountStandaloneSimulator().catch((error) => {
    root.dataset.simulatorState = 'error';
    console.error('PaddockJS failed to initialize.', error);
  });
}
