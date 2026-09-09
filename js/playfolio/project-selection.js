import { readProjectData, setImage } from './dom.js';

export function setupProjectExplorer(root = document) {
  const rows = Array.from(root.querySelectorAll('[data-project-row]'));
  const filters = Array.from(root.querySelectorAll('[data-project-filter]'));
  const nodes = Array.from(root.querySelectorAll('[data-project-node]'));
  const inspector = root.querySelector('[data-project-inspector]');
  if (!rows.length || !inspector) return;

  const fields = {
    title: inspector.querySelector('[data-inspector-title]'),
    summary: inspector.querySelector('[data-inspector-summary]'),
    type: inspector.querySelector('[data-inspector-type]'),
    stack: inspector.querySelector('[data-inspector-stack]'),
    status: inspector.querySelector('[data-inspector-status]'),
    year: inspector.querySelector('[data-inspector-year]'),
    link: inspector.querySelector('[data-inspector-link]'),
    media: inspector.querySelector('[data-inspector-media]'),
  };

  const activate = (row) => {
    rows.forEach((item) => {
      const active = item === row;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    nodes.forEach((node) => {
      node.classList.toggle('is-active', node.dataset.target === row.dataset.projectId);
    });

    const data = readProjectData(row);
    if (fields.title) fields.title.textContent = data.title;
    if (fields.summary) fields.summary.textContent = data.summary;
    if (fields.type) fields.type.textContent = data.type || 'Project';
    if (fields.stack) fields.stack.textContent = data.stack || 'Mixed stack';
    if (fields.status) fields.status.textContent = data.status || 'Built';
    if (fields.year) fields.year.textContent = data.year || '2026';
    if (fields.link) fields.link.href = data.href;
    setImage(fields.media, data.image, data.fallback || data.title);
  };

  const applyFilter = (filter) => {
    filters.forEach((button) => {
      const active = button.dataset.projectFilter === filter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    let firstVisible = null;
    rows.forEach((row) => {
      const tags = (row.dataset.tags || '').split(',').map((tag) => tag.trim());
      const visible = filter === 'all' || tags.includes(filter);
      row.hidden = !visible;
      if (visible && !firstVisible) firstVisible = row;
    });

    nodes.forEach((node) => {
      const target = rows.find((row) => row.dataset.projectId === node.dataset.target);
      node.hidden = target ? target.hidden : false;
    });

    if (firstVisible) activate(firstVisible);
  };

  rows.forEach((row) => {
    row.addEventListener('pointerenter', () => {
      if (!row.hidden) activate(row);
    });
    row.addEventListener('focus', () => {
      if (!row.hidden) activate(row);
    });
    row.addEventListener('click', () => activate(row));
  });

  nodes.forEach((node) => {
    node.addEventListener('click', () => {
      const row = rows.find((item) => item.dataset.projectId === node.dataset.target);
      if (row && !row.hidden) {
        activate(row);
        row.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    });
  });

  filters.forEach((button) => {
    button.addEventListener('click', () => applyFilter(button.dataset.projectFilter || 'all'));
  });

  activate(rows.find((row) => row.classList.contains('is-active')) || rows[0]);
}
