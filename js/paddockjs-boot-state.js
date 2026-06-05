export function setPaddockShellState(shell, state) {
  if (!shell) return;

  shell.dataset.simulatorState = state;
  shell.setAttribute('aria-busy', state === 'booting' || state === 'loading' ? 'true' : 'false');

  const loading = shell.querySelector('[data-paddock-loading]');
  if (loading) loading.hidden = state !== 'booting' && state !== 'loading';

  const error = shell.querySelector('[data-paddock-error]');
  if (error) error.hidden = state !== 'error';
}

export function syncPaddockShellLayout(shell, ui = {}) {
  if (!shell) return;

  const layoutPreset = ui.layoutPreset === 'left-tower-overlay'
    ? 'left-tower-overlay'
    : 'standard';
  const timingFit = ui.timingTowerVerticalFit === 'scroll'
    ? 'scroll'
    : 'expand-race-view';
  const raceDataSize = ui.raceDataBannerSize === 'auto'
    ? 'auto'
    : 'custom';

  // The telemetry drawer owns PaddockJS layout classes internally. The host
  // wrapper only records state so package shell selectors do not leak inward.
  shell.dataset.layoutPreset = layoutPreset;
  shell.dataset.timingFit = timingFit;
  shell.dataset.raceDataSize = raceDataSize;
}
