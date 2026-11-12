import { SERIES } from './playfolio/project-catalog.js';

export function setupProjectSeries(root = document) {
  const choices = [...root.querySelectorAll('[data-series-choice]')];
  const shell = root.querySelector('[data-paddock-shell]');
  if (!choices.length || !shell) return;

  function applySeries() {
    const selected = new URL(window.location.href).searchParams.get('series');
    const series = SERIES.some(item => item.id === selected) ? selected : 'F1';
    choices.forEach(choice => {
      if (choice.dataset.seriesChoice === series) choice.setAttribute('aria-current', 'true');
      else choice.removeAttribute('aria-current');
    });
    shell.dataset.raceSeries = series;
    shell.dispatchEvent(new CustomEvent('portfolio:serieschange'));
  }

  choices.forEach(choice => choice.addEventListener('click', event => {
    // Preserve ordinary modified-click and open-in-new-tab behavior.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(window.location.href);
    const series = choice.dataset.seriesChoice;
    if (series === 'F1') url.searchParams.delete('series');
    else url.searchParams.set('series', series);
    if (url.href !== window.location.href) window.history.pushState(null, '', url);
    applySeries();
  }));
  window.addEventListener('popstate', applySeries);
  applySeries();
}

setupProjectSeries();
