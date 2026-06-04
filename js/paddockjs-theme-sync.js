export function getPortfolioThemeMode() {
  const pageTheme = document.documentElement.dataset.theme;
  if (pageTheme === 'dark' || pageTheme === 'light') return pageTheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getPaddockTheme() {
  return { mode: getPortfolioThemeMode() };
}

export function installPaddockThemeSync(simulator) {
  if (!simulator || typeof simulator.syncThemeFrom !== 'function') return () => {};

  return simulator.syncThemeFrom(document.documentElement, {
    attribute: 'data-theme',
    map: {
      light: 'light',
      dark: 'dark',
    },
  });
}
