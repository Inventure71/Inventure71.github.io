const paddockThemeTokens = {
  light: {
    primary: '#c90400',
    primaryText: '#ffffff',
    secondary: '#eef2f7',
    secondaryText: '#111827',
    surface: '#f6f8fb',
    surfaceRaised: '#ffffff',
    surfacePanel: '#eef2f7',
    text: '#111827',
    mutedText: '#5d6675',
    border: 'rgba(17, 24, 39, 0.16)',
    success: '#0f9f6a',
    warning: '#b97800',
    danger: '#c90400',
    info: '#1e74c9',
    yellowFlag: '#b97800',
    greenFlag: '#0f9f6a',
    redFlag: '#c90400',
    safetyCar: '#b97800',
    drsActive: '#6d28d9',
    pitLane: '#d8dee8',
    track: '#d7dde6',
    trackEdge: '#111827',
    timingTowerMaxWidth: '390px',
    raceViewMinHeight: '620px',
  },
  dark: {
    primary: '#e10600',
    primaryText: '#ffffff',
    secondary: '#151923',
    secondaryText: '#f4f7fb',
    surface: '#08090b',
    surfaceRaised: '#111318',
    surfacePanel: '#171a20',
    text: '#f4f7fb',
    mutedText: '#8d97a7',
    border: 'rgba(255, 255, 255, 0.13)',
    success: '#14c784',
    warning: '#ffd166',
    danger: '#e10600',
    info: '#39a7ff',
    yellowFlag: '#ffd166',
    greenFlag: '#14c784',
    redFlag: '#e10600',
    safetyCar: '#f5c542',
    drsActive: '#8b5cf6',
    pitLane: '#2f3540',
    track: '#262a31',
    trackEdge: '#f4f7fb',
    timingTowerMaxWidth: '390px',
    raceViewMinHeight: '620px',
  },
};

const paddockThemeCssVariables = {
  primary: '--paddock-color-primary',
  primaryText: '--paddock-color-primary-text',
  secondary: '--paddock-color-secondary',
  secondaryText: '--paddock-color-secondary-text',
  surface: '--paddock-color-surface',
  surfaceRaised: '--paddock-color-surface-raised',
  surfacePanel: '--paddock-color-surface-panel',
  text: '--paddock-color-text',
  mutedText: '--paddock-color-muted-text',
  border: '--paddock-color-border',
  success: '--paddock-color-success',
  warning: '--paddock-color-warning',
  danger: '--paddock-color-danger',
  info: '--paddock-color-info',
  yellowFlag: '--paddock-color-yellow-flag',
  greenFlag: '--paddock-color-green-flag',
  redFlag: '--paddock-color-red-flag',
  safetyCar: '--paddock-color-safety-car',
  drsActive: '--paddock-color-drs-active',
  pitLane: '--paddock-color-pit-lane',
  track: '--paddock-color-track',
  trackEdge: '--paddock-color-track-edge',
  timingTowerMaxWidth: '--paddock-timing-tower-max-width',
  raceViewMinHeight: '--paddock-race-view-min-height',
};

const paddockLegacyThemeCssVariables = {
  primary: '--paddock-accent-color',
  greenFlag: '--paddock-green-color',
  yellowFlag: '--paddock-yellow-color',
  info: '--paddock-blue-color',
  redFlag: '--paddock-race-control-red-color',
  surface: '--paddock-surface-color',
  surfaceRaised: '--paddock-surface-raised-color',
  surfacePanel: '--paddock-surface-panel-color',
  border: '--paddock-line-color',
  text: '--paddock-text-color',
  mutedText: '--paddock-muted-text-color',
  track: '--paddock-track-color',
  trackEdge: '--paddock-track-edge-color',
};

const paddockComponentCssVariables = [
  '--paddock-button-background',
  '--paddock-button-text',
  '--paddock-button-border',
  '--paddock-race-controls-background',
  '--paddock-race-controls-text',
  '--paddock-race-controls-border',
  '--paddock-race-controls-accent',
  '--paddock-camera-controls-background',
  '--paddock-camera-controls-text',
  '--paddock-camera-controls-border',
  '--paddock-camera-controls-accent',
  '--paddock-timing-tower-shell-background',
  '--paddock-timing-tower-row-background',
  '--paddock-timing-tower-driver-text',
  '--paddock-timing-tower-gap-text',
  '--paddock-timing-tower-warning-text',
  '--paddock-race-canvas-track',
  '--paddock-race-canvas-track-edge',
  '--paddock-race-canvas-pit-lane',
  '--paddock-race-data-panel-background',
  '--paddock-race-data-panel-text',
  '--paddock-race-data-panel-accent',
  '--paddock-selected-driver-panel-background',
  '--paddock-selected-driver-panel-text',
  '--paddock-selected-driver-panel-accent',
  '--paddock-driver-rows-background',
  '--paddock-driver-rows-text',
  '--paddock-driver-rows-accent',
];

let paddockThemeObserver = null;

export function getPortfolioThemeMode() {
  const pageTheme = document.documentElement.dataset.theme;
  if (pageTheme === 'dark' || pageTheme === 'light') return pageTheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getPaddockTheme() {
  return { mode: getPortfolioThemeMode() };
}

function clearPaddockThemeVariables(target) {
  [
    ...Object.values(paddockThemeCssVariables),
    ...Object.values(paddockLegacyThemeCssVariables),
    ...paddockComponentCssVariables,
  ].forEach((variable) => target.style.removeProperty(variable));
}

function applyPaddockThemeTokens(target, tokens) {
  Object.entries(paddockThemeCssVariables).forEach(([key, variable]) => {
    target.style.setProperty(variable, tokens[key]);
  });
  Object.entries(paddockLegacyThemeCssVariables).forEach(([key, variable]) => {
    target.style.setProperty(variable, tokens[key]);
  });
}

export function syncPaddockThemeMode() {
  const mode = getPortfolioThemeMode();
  const tokens = paddockThemeTokens[mode];
  document.querySelectorAll('.f1-sim-component').forEach((simRoot) => {
    simRoot.setAttribute('data-paddock-theme-mode', mode);
    clearPaddockThemeVariables(simRoot);
    applyPaddockThemeTokens(simRoot, tokens);
    simRoot.querySelectorAll('[data-paddock-component]').forEach((component) => {
      clearPaddockThemeVariables(component);
      applyPaddockThemeTokens(component, tokens);
    });
  });
}

export function installPaddockThemeSync() {
  syncPaddockThemeMode();
  if (paddockThemeObserver) return;
  paddockThemeObserver = new MutationObserver(syncPaddockThemeMode);
  paddockThemeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });
}
