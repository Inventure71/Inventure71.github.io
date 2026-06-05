/**
 * Global theme toggler with persistence.
 * Applies a `data-theme` attribute on the <html> element and keeps buttons in sync.
 */
(function () {
  const THEME_KEY = 'mg-color-theme';
  const root = document.documentElement;
  const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  const getStoredTheme = () => localStorage.getItem(THEME_KEY);
  const storeTheme = (theme) => localStorage.setItem(THEME_KEY, theme);

  const labelForTheme = (theme) => (theme === 'dark' ? 'dark mode' : 'light mode');

  const updateToggleButtons = (theme) => {
    const currentTheme = theme === 'dark' ? 'dark' : 'light';
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.dataset.themeCurrent = currentTheme;
      button.dataset.themePreview = nextTheme;
      button.setAttribute('aria-pressed', currentTheme === 'dark');
      button.setAttribute(
        'aria-label',
        `Switch to ${labelForTheme(nextTheme)}`
      );
    });
  };

  const applyTheme = (theme, persist = false) => {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';
    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    if (persist) {
      storeTheme(nextTheme);
    }
    updateToggleButtons(nextTheme);
  };

  const initTheme = () => {
    const stored = getStoredTheme();
    const prefersDark = mediaQuery ? mediaQuery.matches : false;
    const initialTheme = stored || (prefersDark ? 'dark' : 'light');
    applyTheme(initialTheme, Boolean(stored));
  };

  window.MGTheme = {
    apply: applyTheme,
    sync: () => updateToggleButtons(root.dataset.theme || 'light'),
  };

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
  });

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme-toggle]');
    if (!button) return;
    const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme, true);
  });

  const handlePreferenceChange = (event) => {
    if (!getStoredTheme()) {
      applyTheme(event.matches ? 'dark' : 'light');
    }
  };

  if (mediaQuery) {
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handlePreferenceChange);
    } else if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handlePreferenceChange);
    }
  }
})();
