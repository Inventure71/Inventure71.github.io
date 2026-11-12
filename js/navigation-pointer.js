// Capture pointer movement before styles or deferred modules can delay startup.
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
})();
