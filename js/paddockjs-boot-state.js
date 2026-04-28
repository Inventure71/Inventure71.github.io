export function setPaddockShellState(shell, state) {
  if (!shell) return;

  shell.dataset.simulatorState = state;
  shell.setAttribute('aria-busy', state === 'booting' ? 'true' : 'false');

  const loading = shell.querySelector('[data-paddock-loading]');
  if (loading) loading.hidden = state !== 'booting';

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

  shell.classList.toggle('sim-shell--left-tower-overlay', layoutPreset === 'left-tower-overlay');
  shell.classList.remove('sim-shell--timing-expand-race-view', 'sim-shell--timing-scroll');
  shell.classList.add(`sim-shell--timing-${timingFit}`);
  shell.classList.remove('sim-shell--race-data-auto', 'sim-shell--race-data-custom');
  shell.classList.add(`sim-shell--race-data-${raceDataSize}`);
  shell.dataset.layoutPreset = layoutPreset;
}
