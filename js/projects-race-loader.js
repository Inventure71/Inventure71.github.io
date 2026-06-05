const selectors = {
  shell: '[data-paddock-shell]',
  start: '[data-paddock-start]',
  retry: '[data-paddock-retry]',
};

function setShellState(shell, state) {
  shell.dataset.simulatorState = state;
  shell.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');

  const loading = shell.querySelector('[data-paddock-loading]');
  if (loading) loading.hidden = state !== 'loading';

  const error = shell.querySelector('[data-paddock-error]');
  if (error) error.hidden = state !== 'error';
}

function ensureStylesheet(href) {
  if (!href) return Promise.resolve();

  const absoluteHref = new URL(href, window.location.href).href;
  const existing = [...document.styleSheets].some((sheet) => sheet.href === absoluteHref);
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.paddockLazyStyle = 'true';
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => reject(new Error(`Failed to load ${href}`)), { once: true });
    document.head.append(link);
  });
}

function setControlsDisabled(shell, disabled) {
  shell.querySelectorAll(`${selectors.start}, ${selectors.retry}`).forEach((button) => {
    button.disabled = disabled;
  });
}

function parseDelay(value, fallback) {
  const delay = Number(value);
  return Number.isFinite(delay) && delay >= 0 ? delay : fallback;
}

function afterPageLoad(callback) {
  if (document.readyState === 'complete') {
    callback();
    return;
  }

  window.addEventListener('load', callback, { once: true });
}

function onIdle(callback, timeout = 1500) {
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(callback, { timeout });
    return;
  }

  window.setTimeout(callback, 0);
}

export function installProjectsRaceLoader(root = document) {
  const shell = root.querySelector(selectors.shell);
  if (!shell || shell.dataset.paddockLoaderBound === 'true') return null;

  const scriptSrc = shell.dataset.paddockScriptSrc;
  const styleHref = shell.dataset.paddockStyleHref;
  const searchParams = new URLSearchParams(window.location.search);

  async function startRace() {
    if (!scriptSrc || shell.dataset.simulatorState === 'loading' || shell.dataset.simulatorState === 'ready') return;

    setControlsDisabled(shell, true);
    setShellState(shell, 'loading');

    try {
      await ensureStylesheet(styleHref);
      await import(new URL(scriptSrc, window.location.href).href);
    } catch (error) {
      console.error('Project race failed to load.', error);
      setControlsDisabled(shell, false);
      setShellState(shell, 'error');
    }
  }

  function scheduleAutoStart() {
    if (!shell.dataset.paddockAutoStart || searchParams.get('raceAutoStart') === '0') return;

    const delay = parseDelay(shell.dataset.paddockAutoDelayMs, 900);
    afterPageLoad(() => {
      window.setTimeout(() => onIdle(startRace), delay);
    });
  }

  shell.dataset.paddockLoaderBound = 'true';
  setShellState(shell, shell.dataset.simulatorState || 'preview');
  shell.querySelectorAll(`${selectors.start}, ${selectors.retry}`).forEach((button) => {
    button.addEventListener('click', startRace);
  });

  if (searchParams.get('raceAutoStart') === '1') {
    startRace();
  } else {
    scheduleAutoStart();
  }

  return { startRace };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => installProjectsRaceLoader(document), { once: true });
} else {
  installProjectsRaceLoader(document);
}
