/* The site only needs navbar collapse, so keep its controller local and small. */
(() => {
  // Install before module/simulator startup: native :hover can reset across
  // documents, while the pointer may move before the full glass UI is bound.
  const pointerState = { current: null };
  window.MGNavigationPointer = pointerState;
  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch') return;
    pointerState.current = { x: event.clientX, y: event.clientY };
  }, { capture: true, passive: true });
  window.addEventListener('pagehide', () => {
    // Include any movement during a pending navigation in its one-shot handoff.
    // Ordinary pointer movement does not write to storage.
    if (!pointerState.current) return;
    try {
      const key = 'pfReactiveGlassPointer';
      const saved = JSON.parse(sessionStorage.getItem(key) || 'null');
      if (saved && Date.now() - saved.time <= 4000) {
        sessionStorage.setItem(key, JSON.stringify({ ...saved, ...pointerState.current }));
      }
    } catch { /* Storage can be unavailable; live tracking still works. */ }
  });

  const desktop = window.matchMedia('(min-width: 992px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('.navbar-toggler[aria-controls]').forEach((toggle) => {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;

    let expanded = panel.classList.contains('show');
    let fallback;
    const settle = () => {
      window.clearTimeout(fallback);
      panel.classList.remove('collapsing');
      panel.classList.add('collapse');
      panel.classList.toggle('show', expanded);
      panel.style.removeProperty('height');
    };

    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.addEventListener('click', () => {
      const currentHeight = panel.getBoundingClientRect().height;
      expanded = !expanded;
      toggle.setAttribute('aria-expanded', String(expanded));
      window.clearTimeout(fallback);

      if (desktop.matches || reducedMotion.matches) {
        settle();
        return;
      }

      // Start at the current visual height so a second click reverses smoothly.
      panel.style.height = `${currentHeight}px`;
      panel.classList.remove('collapse', 'show');
      panel.classList.add('collapsing');
      void panel.offsetHeight;
      panel.style.height = expanded ? `${panel.scrollHeight}px` : '0px';
      // transitionend may be skipped when a tab is hidden or styles change.
      fallback = window.setTimeout(settle, 300);
    });

    panel.addEventListener('transitionend', (event) => {
      if (event.target === panel && event.propertyName === 'height') settle();
    });
    desktop.addEventListener('change', settle);
    reducedMotion.addEventListener('change', settle);
  });
})();
