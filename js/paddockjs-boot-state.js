export function setPaddockShellState(shell, state) {
  if (!shell) return;

  shell.dataset.simulatorState = state;
  shell.setAttribute('aria-busy', state === 'booting' || state === 'loading' ? 'true' : 'false');

  const busy = state === 'booting' || state === 'loading';
  // Keep the mount measurable during startup; inert/aria-hidden remove its UI
  // until ready. The placeholder supplies both preview and loading animation.
  for (const [selector, visible] of [
    ['[data-paddock-preview]', state === 'preview' || busy],
    ['[data-paddock-loading]', busy],
    ['[data-paddock-error]', state === 'error'],
    ['#paddock-race-root', state === 'ready'],
  ]) {
    const layer = shell.querySelector(selector);
    if (!layer) continue;
    if (selector !== '#paddock-race-root') layer.hidden = !visible;
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
