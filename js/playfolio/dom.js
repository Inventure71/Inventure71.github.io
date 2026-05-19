export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function isTypingTarget(element) {
  if (!element) return false;
  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || element.isContentEditable;
}

export function readProjectData(element) {
  return {
    title: element.dataset.title || element.querySelector('.pf-project-name, .pf-row-title')?.textContent || '',
    type: element.dataset.type || '',
    summary: element.dataset.summary || element.querySelector('.pf-row-summary')?.textContent || '',
    stack: element.dataset.stack || '',
    status: element.dataset.status || '',
    year: element.dataset.year || '',
    href: element.dataset.href || element.getAttribute('href') || '#',
    image: element.dataset.image || '',
    fallback: element.dataset.fallback || element.dataset.title || '',
  };
}

export function setImage(container, image, fallback) {
  if (!container) return;
  const img = container.querySelector('img');
  container.dataset.fallback = fallback || '';
  container.classList.toggle('has-image', Boolean(image));
  if (!img) return;

  if (image) {
    img.src = image;
    img.alt = `${fallback} preview`;
    return;
  }

  img.removeAttribute('src');
  img.alt = '';
}
