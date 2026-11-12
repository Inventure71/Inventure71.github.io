export function setupReveals(root = document) {
  const revealItems = root.querySelectorAll('.pf-reveal');
  if (!revealItems.length) return;

  if (!('IntersectionObserver' in window) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  // Initialization can arrive after the first paint or a restored scroll.
  // Only arm content below the viewport; never hide something already shown.
  const viewportHeight = window.innerHeight;
  const positions = [...revealItems].map(item => ({ item, top: item.getBoundingClientRect().top }));
  const pending = positions.filter(({ item, top }) => {
    if (top < viewportHeight) {
      item.classList.add('is-visible');
      return false;
    }
    return true;
  }).map(({ item }) => item);
  if (!pending.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  pending.forEach((item) => {
    item.classList.add('is-reveal-ready');
    observer.observe(item);
  });
}
