import {
  createPaddockSimulator,
  mountF1Simulator,
} from '@inventure71/paddockjs';
import { getPortfolioGrid, normalizeSeries } from './portfolio-race-data.js';
import { SERIES } from './playfolio/project-catalog.js';
import { setPaddockShellState, syncPaddockShellLayout } from './paddockjs-boot-state.js';
import { getPaddockTheme, installPaddockThemeSync } from './paddockjs-theme-sync.js';
import { observeProjectRaceStatus, updateProjectRaceStatus } from './project-race-status.js';

const root = document.getElementById('f1-simulator-root');
const paddockShell = document.querySelector('[data-paddock-shell]');

function getRaceRoot(shell) {
  return shell?.querySelector('[data-paddock-root]') || shell?.querySelector('#paddock-race-root');
}

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
  ...getPortfolioGrid('F1'),
  rules: raceRules,
  physicsMode: 'arcade',
  gridWalk: { enabled: true, initialView: 'race' },
  ui: { viewControls: 'toggle' },
  theme: getPaddockTheme(),
  title: 'Project Race',
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

function seriesRaceOptions(series) {
  const { logo } = SERIES.find(item => item.id === series);
  return {
    ...getPortfolioGrid(series),
    title: `${series} Project Race`,
    ...(logo ? { assets: { f1Logo: logo } } : {}),
  };
}

function applySeriesLabels(container, series) {
  // Branding is DOM-only in PaddockJS. Keep renderer assets stable on restart.
  const { logo: source } = SERIES.find(item => item.id === series);
  container.querySelectorAll('.broadcast-f1-logo').forEach(logo => { logo.alt = series; logo.src = source; });
  container.querySelectorAll('[aria-label$="race simulator"]').forEach(region => {
    region.setAttribute('aria-label', `${series} project race simulator`);
  });
  container.querySelectorAll('[data-paddock-unsupported-size] span').forEach(label => {
    label.textContent = label.textContent.replace(/^F1 simulator/, `${series} simulator`);
  });
}

async function mountStandaloneSimulator() {
  const series = normalizeSeries(new URLSearchParams(window.location.search).get('series'));
  document.title = `${series} Project Race - Matteo Giorgetti`;
  const simulator = await mountF1Simulator(root, { ...portfolioOptions, ...seriesRaceOptions(series) });
  applySeriesLabels(root, series);
  installPaddockThemeSync(simulator);
}

// A cached module is reusable: each mount owns one in-flight or ready instance.
const sessions = new WeakMap();

function syncProjectView(shell, session) {
  const view = session.simulator.getView();
  if (view === 'race') session.hasRaced = true;
  shell.dataset.raceView = view;
  shell.dataset.hasRaced = String(session.hasRaced);
  const button = shell.parentElement?.querySelector('[data-project-race-toggle]');
  if (button) {
    button.disabled = shell.dataset.simulatorState !== 'ready';
    button.dataset.raceAction = view === 'race' ? 'browse' : 'race';
    button.querySelector('[data-race-toggle-label]').textContent = view === 'race'
      ? 'Back to grid' : session.hasRaced ? 'Resume race' : 'Start race';
  }
  updateProjectRaceStatus(shell, session.simulator.getSnapshot());
}

function installProjectViewControl(shell, session, raceRoot) {
  const button = shell.parentElement?.querySelector('[data-project-race-toggle]');
  const toggle = () => {
    session.simulator.setView(session.simulator.getView() === 'race' ? 'grid-walk' : 'race');
    syncProjectView(shell, session);
  };
  button?.addEventListener('click', toggle);
  // Grid Walk also supports keyboard shortcuts. Reflect those in the host CTA.
  const observer = new MutationObserver(() => syncProjectView(shell, session));
  observer.observe(raceRoot, { subtree: true, attributes: true, attributeFilter: ['data-view'] });
  syncProjectView(shell, session);
  return () => { button?.removeEventListener('click', toggle); observer.disconnect(); if (button) button.disabled = true; };
}

export function initializeProjectsRace(shell = paddockShell) {
  const raceRoot = getRaceRoot(shell);
  if (!raceRoot) return Promise.reject(new Error('Missing project race mount.'));
  const existing = sessions.get(raceRoot);
  if (existing?.teardown) return existing.teardown.then(() => initializeProjectsRace(shell));
  if (existing) return existing.promise;

  const session = { simulator: null, series: null, hasRaced: false, stopTheme: () => {}, stopStatus: () => {}, stopControl: () => {} };
  sessions.set(raceRoot, session);
  session.promise = Promise.resolve().then(async () => {
    shell.dataset.raceView = 'grid-walk';
    shell.dataset.hasRaced = 'false';
    syncPaddockShellLayout(shell, projectSimulatorUi);
    setPaddockShellState(shell, 'booting');
    try {
      session.series = normalizeSeries(shell.dataset.raceSeries);
      const simulator = createPaddockSimulator({
        ...portfolioOptions,
        ...seriesRaceOptions(session.series),
        gridWalk: { enabled: true, initialView: 'grid-walk' },
        showBackLink: false,
        ui: { ...portfolioOptions.ui, ...projectSimulatorUi },
        theme: getPaddockTheme(),
        onReady: ({ snapshot }) => updateProjectRaceStatus(shell, snapshot),
        onRaceEvent: (_event, snapshot) => updateProjectRaceStatus(shell, snapshot),
        onRaceFinish: ({ snapshot }) => updateProjectRaceStatus(shell, snapshot),
      });
      session.simulator = simulator;
      simulator.mountRaceTelemetryDrawer(raceRoot, {
        timingTowerVerticalFit: projectSimulatorUi.timingTowerVerticalFit,
        raceDataTelemetryDetail: projectSimulatorUi.raceDataTelemetryDetail,
      });
      applySeriesLabels(raceRoot, session.series);
      await simulator.start();
      session.stopStatus = observeProjectRaceStatus(shell, simulator, raceRoot);
      session.stopTheme = installPaddockThemeSync(simulator);
      if (!session.teardown) {
        setPaddockShellState(shell, 'ready');
        session.stopControl = installProjectViewControl(shell, session, raceRoot);
      }
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

export async function changeProjectsRaceSeries(shell = paddockShell) {
  const raceRoot = getRaceRoot(shell);
  const simulator = await initializeProjectsRace(shell);
  const session = sessions.get(raceRoot);
  if (!session || session.teardown) return;
  if (session.switching) return session.switching;
  if (session.series === normalizeSeries(shell.dataset.raceSeries)) return simulator;

  setPaddockShellState(shell, 'loading');
  syncProjectView(shell, session);
  session.switching = (async () => {
    // Give the existing loading component a paint before synchronous restart.
    // The timer also permits progress when a background tab suspends rAF.
    await new Promise(resolve => {
      const fallback = setTimeout(resolve, 80);
      globalThis.requestAnimationFrame?.(() => globalThis.requestAnimationFrame(() => {
        clearTimeout(fallback);
        resolve();
      }));
    });
    if (session.teardown) return;
    // Read the latest choice after the paint: rapid clicks share one restart.
    const series = normalizeSeries(shell.dataset.raceSeries);
    const { assets, ...options } = seriesRaceOptions(series);
    session.hasRaced = false;
    shell.dataset.raceView = 'grid-walk';
    // Keep renderer assets fixed; the series wordmark is a DOM image.
    simulator.restart({ ...options, gridWalk: { enabled: true, initialView: 'grid-walk' } });
    session.series = series;
    applySeriesLabels(raceRoot, series);
    setPaddockShellState(shell, 'ready');
    syncProjectView(shell, session);
    return simulator;
  })().catch(error => {
    releaseSession(raceRoot, session);
    setPaddockShellState(shell, 'error');
    throw error;
  }).finally(() => { session.switching = null; });
  return session.switching;
}

function releaseSession(raceRoot, session) {
  if (sessions.get(raceRoot) !== session) return;
  sessions.delete(raceRoot);
  session.stopTheme();
  session.stopStatus();
  session.stopControl();
  try { session.simulator?.destroy(); }
  catch (error) { console.error('PaddockJS cleanup failed.', error); }
  raceRoot.replaceChildren();
}

// Await teardown before mounting into the same root again. In particular, do
// not destroy a package instance midway through its asynchronous renderer init.
export function destroyProjectsRace(shell = paddockShell) {
  const raceRoot = getRaceRoot(shell);
  const session = raceRoot && sessions.get(raceRoot);
  if (!session) return Promise.resolve();
  if (!session.teardown) {
    session.teardown = Promise.all([session.promise.catch(() => {}), session.switching?.catch(() => {})]).then(() => {
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
