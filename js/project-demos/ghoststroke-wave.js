/** Fixed time bins keep the wave legible; activity is emitted characters per second. */
export function activitySamples(plan, count = 160) {
  const total = plan.reduce((sum, event) => sum + event.duration, 0);
  if (!total || count < 1) return [];
  const bins = Array.from({ length: count }, () => ({ activity: 0, kind: 'pause' }));
  let elapsed = 0;
  for (const event of plan) {
    const start = elapsed;
    elapsed += event.duration;
    if (event.kind === 'pause' || event.kind === 'consider') continue;
    const first = Math.floor(start / total * count);
    const last = Math.min(count - 1, Math.floor(elapsed / total * count));
    for (let i = first; i <= last; i++) {
      const overlap = Math.max(0, Math.min(elapsed, (i + 1) * total / count) - Math.max(start, i * total / count));
      bins[i].activity += overlap / (total / count) * (1000 / event.duration);
      if (overlap) bins[i].kind = event.kind;
    }
  }
  return bins.map((bin, i) => ({ ...bin, x: (i + .5) / count * 1000 }));
}

export function drawActivityWave(svg, plan) {
  const fragment = document.createDocumentFragment();
  for (const sample of activitySamples(plan)) {
    const height = 2 + Math.min(1, sample.activity / 38) * 68;
    const bar = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bar.setAttribute('x', sample.x - 1.65);
    bar.setAttribute('y', (80 - height) / 2);
    bar.setAttribute('width', '3.3');
    bar.setAttribute('height', height);
    bar.setAttribute('rx', '1.65');
    bar.setAttribute('fill', ['alternative', 'correction'].includes(sample.kind) ? '#e8c891' : '#f2ede3');
    bar.setAttribute('opacity', sample.activity ? '.9' : '.2');
    fragment.append(bar);
  }
  svg.replaceChildren(fragment);
}
