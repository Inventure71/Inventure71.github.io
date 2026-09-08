// Keep decorative work idle when its element or document cannot be seen.
export function observeElementActivity(element, onChange) {
  const document = element.ownerDocument;
  const window = document.defaultView;
  let intersects = typeof window.IntersectionObserver !== 'function';
  let active;

  const update = () => {
    const next = intersects && document.visibilityState !== 'hidden';
    if (next === active) return;
    active = next;
    onChange(active);
  };

  if (typeof window.IntersectionObserver === 'function') {
    const observer = new window.IntersectionObserver((entries) => {
      intersects = entries.some((entry) => entry.target === element && entry.isIntersecting);
      update();
    });
    observer.observe(element);
  }

  document.addEventListener('visibilitychange', update);
  update();
}
