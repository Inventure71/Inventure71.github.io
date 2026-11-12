/* The site only needs navbar collapse, so keep its controller local and small. */
(() => {
  const desktop = window.matchMedia('(min-width: 992px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  document.querySelectorAll('.navbar-toggler[aria-controls]').forEach((toggle) => {
    const panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;

    let expanded = panel.classList.contains('show');
    let fallback;
    let isInline = () => desktop.matches;
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

      if (isInline() || reducedMotion.matches) {
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

    const navbar = toggle.closest?.('.navbar');
    const row = navbar?.querySelector('.container');
    const brand = navbar?.querySelector('.pf-brand-group');
    const content = panel.querySelector?.('.pf-nav-content');
    const command = content?.querySelector('[data-command-open]');
    const theme = content?.querySelector('[data-theme-toggle]');
    const tools = content?.querySelector('.pf-nav-tools');
    if (!row || !brand || !command || !theme || !tools) return;

    isInline = () => navbar.dataset.navLayout !== 'collapsed';
    let frame = 0;
    const fit = () => {
      frame = 0;
      // Use the real elements, out of flow and hidden only for this synchronous
      // measurement. No duplicate links, IDs or focus targets are introduced.
      navbar.setAttribute('data-nav-measuring', '');
      const padding = getComputedStyle(row);
      const available = row.clientWidth - parseFloat(padding.paddingLeft) - parseFloat(padding.paddingRight);
      const full = content.getBoundingClientRect().width;
      const compact = full - command.getBoundingClientRect().width - parseFloat(getComputedStyle(tools).columnGap);
      const required = brand.getBoundingClientRect().width + theme.getBoundingClientRect().width;
      const layout = available >= required + full ? 'full'
        : available >= required + compact ? 'compact' : 'collapsed';
      navbar.removeAttribute('data-nav-measuring');
      if (navbar.dataset.navLayout === layout) return;

      const focused = document.activeElement;
      navbar.dataset.navLayout = layout;
      settle();
      if (layout === 'compact' && focused === command) theme.focus({ preventScroll: true });
      else if (layout === 'collapsed' && !expanded && panel.contains(focused)) toggle.focus({ preventScroll: true });
      else if (layout !== 'collapsed' && focused === toggle) panel.querySelector('a')?.focus({ preventScroll: true });
    };
    const scheduleFit = () => {
      if (!frame) frame = window.requestAnimationFrame(fit);
    };
    fit();
    let observedWidth;
    new ResizeObserver(([entry]) => {
      if (entry.contentRect.width === observedWidth) return;
      observedWidth = entry.contentRect.width;
      scheduleFit();
    }).observe(row);
    document.fonts?.ready.then(scheduleFit);
    document.fonts?.addEventListener('loadingdone', scheduleFit);
    new MutationObserver(scheduleFit).observe(content, { childList: true, characterData: true, subtree: true });
  });
})();
