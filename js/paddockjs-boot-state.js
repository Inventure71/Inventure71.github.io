export function setPaddockShellState(shell, state) {
  if (!shell) return;

  shell.dataset.simulatorState = state;
  shell.setAttribute('aria-busy', state === 'booting' || state === 'loading' ? 'true' : 'false');

  const busy = state === 'booting' || state === 'loading';
  // The host covers the import gap and series changes. Once mounted, PaddockJS
  // owns the boot screen. Keep its controls inert until startup completes.
  for (const [selector, visible] of [
    ['[data-paddock-preview]', state === 'preview' || state === 'loading'],
    ['[data-paddock-error]', state === 'error'],
    ['[data-paddock-root]', state === 'ready'],
  ]) {
    const layer = shell.querySelector(selector) || (selector === '[data-paddock-root]' ? shell.querySelector('#paddock-race-root') : null);
    if (!layer) continue;
    if (selector !== '[data-paddock-root]') layer.hidden = !visible;
    layer.inert = !visible;
    layer.setAttribute?.('aria-hidden', String(!visible));
    if (selector === '[data-paddock-preview]') layer.setAttribute('aria-busy', String(busy));
  }
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
