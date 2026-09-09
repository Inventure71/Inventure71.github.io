// A guided explanation of the recorded experiment, not a model simulation.
export function initExperimentWalkthrough(root) {
  if (!root || root.dataset.walkthroughReady === 'true') return;
  const controls = root.querySelector('[data-step-controls]');
  const tabs = [...root.querySelectorAll('[data-step]')];
  const panels = [...root.querySelectorAll('[data-step-panel]')];
  const footer = root.querySelector('[data-step-footer]');
  const position = root.querySelector('[data-step-position]');
  const next = root.querySelector('[data-step-next]');
  const results = root.querySelector('[data-step-results]');
  if (!controls || !footer || !position || !next || !results || tabs.length !== 3 || panels.length !== tabs.length) return;
  if (tabs.some((tab, index) => tab.dataset.step !== panels[index].dataset.stepPanel)) return;
  let current = 0;

  function selectStep(index, moveFocus = false) {
    if (!Number.isInteger(index) || index < 0 || index >= tabs.length) return;
    current = index;
    tabs.forEach((tab, item) => {
      const selected = item === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[item].hidden = !selected;
    });
    position.textContent = `Step ${index + 1} of ${tabs.length}`;
    const isLast = index === tabs.length - 1;
    next.hidden = isLast;
    results.hidden = !isLast;
    if (!isLast) next.textContent = `Next: ${index === 0 ? 'Review labels' : 'Test on real photos'} →`;
    if (moveFocus) tabs[index].focus();
  }

  controls.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
    tab.addEventListener('click', () => selectStep(index));
    tab.addEventListener('keydown', (event) => {
      const destinations = {
        ArrowRight: (index + 1) % tabs.length,
        ArrowLeft: (index + tabs.length - 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1,
      };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      selectStep(destinations[event.key], true);
    });
  });
  // Move focus out of the Next control when it is replaced by the results link.
  next.addEventListener('click', () => selectStep(current + 1, true));
  selectStep(0);
  controls.hidden = false;
  footer.hidden = false;
  root.dataset.walkthroughReady = 'true';
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('[data-experiment-walkthrough]').forEach(initExperimentWalkthrough);
}
