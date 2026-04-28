export function setPaddockShellState(shell, state) {
  if (!shell) return;

  shell.dataset.simulatorState = state;
  shell.setAttribute('aria-busy', state === 'booting' ? 'true' : 'false');

  const loading = shell.querySelector('[data-paddock-loading]');
  if (loading) loading.hidden = state !== 'booting';

  const error = shell.querySelector('[data-paddock-error]');
  if (error) error.hidden = state !== 'error';
}
