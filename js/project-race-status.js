export function getProjectRaceStatus({ raceControl }) {
  if (raceControl.finished) return { state: 'finished', label: 'Finished' };
  if (raceControl.redFlag || raceControl.mode === 'red-flag') return { state: 'red-flag', label: 'Red flag' };
  if (raceControl.mode === 'safety-car') return { state: 'safety-car', label: 'Safety car' };
  if (raceControl.mode === 'pre-start') return { state: 'starting', label: 'Starting' };
  return { state: 'racing', label: 'Racing' };
}

export function updateProjectRaceStatus(shell, snapshot) {
  const indicator = shell?.parentElement?.querySelector('[data-race-status]');
  if (!indicator) return;
  const { state, label } = getProjectRaceStatus(snapshot);
  if (indicator.dataset.raceStatus === state) return;
  indicator.dataset.raceStatus = state;
  indicator.querySelector('[data-race-status-label]').textContent = label;
}

export function observeProjectRaceStatus(shell, simulator, root) {
  if (!shell?.parentElement?.querySelector('[data-race-status]')) return () => {};
  // Public control calls can change race control without emitting a step event.
  // The package updates its tower and safety-car button classes for them too.
  const observer = new MutationObserver(() => updateProjectRaceStatus(shell, simulator.getSnapshot()));
  for (const surface of root.querySelectorAll('.sim-timing, [data-safety-car]')) {
    observer.observe(surface, { attributes: true, attributeFilter: ['class'] });
  }
  updateProjectRaceStatus(shell, simulator.getSnapshot());
  return () => observer.disconnect();
}
