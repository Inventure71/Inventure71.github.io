const DEFAULT_TONES = {
  amber: { color: 'var(--pf-glass-tone-amber)', ink: 'var(--pf-ink)' },
  blue: { color: 'var(--pf-glass-tone-blue)', ink: 'var(--pf-ink)' },
  brand: { color: 'var(--pf-glass-tone-brand)', ink: 'var(--pf-glass-tone-brand-ink)' },
  coral: { color: 'var(--pf-glass-tone-coral)', ink: 'var(--pf-ink)' },
  green: { color: 'var(--pf-glass-tone-green)', ink: 'var(--pf-ink)' },
  mode: { color: 'var(--pf-glass-tone-mode)', ink: 'var(--pf-glass-tone-mode-ink)' },
  neutral: { color: 'var(--pf-glass-tone-neutral)', ink: 'var(--pf-glass-tone-neutral-ink)' },
};

const DEFAULT_OPTIONS = {
  itemSelector: '[data-glass-item]',
  groupSelector: '[data-glass-group]',
  gapDelayMs: 55,
  tones: DEFAULT_TONES,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isTouchPointer(event) {
  return event.pointerType === 'touch';
}

function clearTimer(surface) {
  if (surface._reactiveGlassClearTimer) {
    globalThis.clearTimeout(surface._reactiveGlassClearTimer);
    surface._reactiveGlassClearTimer = null;
  }
}

function setPointerVars(surface, event) {
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = clamp(event.clientX - rect.left, 0, rect.width);
  const y = clamp(event.clientY - rect.top, 0, rect.height);
  const px = clamp(x / rect.width, 0, 1);
  const py = clamp(y / rect.height, 0, 1);

  surface.style.setProperty('--pf-glass-x', `${x.toFixed(2)}px`);
  surface.style.setProperty('--pf-glass-y', `${y.toFixed(2)}px`);
  surface.style.setProperty('--pf-glass-px', px.toFixed(4));
  surface.style.setProperty('--pf-glass-py', py.toFixed(4));
  surface.style.setProperty('--pf-glass-dx', `${((px - 0.5) * 100).toFixed(2)}px`);
  surface.style.setProperty('--pf-glass-dy', `${((py - 0.5) * 100).toFixed(2)}px`);
}

function resetPointerVars(surface) {
  surface.style.setProperty('--pf-glass-x', '50%');
  surface.style.setProperty('--pf-glass-y', '50%');
  surface.style.setProperty('--pf-glass-px', '0.5000');
  surface.style.setProperty('--pf-glass-py', '0.5000');
  surface.style.setProperty('--pf-glass-dx', '0.00px');
  surface.style.setProperty('--pf-glass-dy', '0.00px');
}

function clearTarget(surface) {
  const target = surface._reactiveGlassTarget || surface.querySelector?.('.is-glass-target');
  target?.classList.remove('is-glass-target');
  surface._reactiveGlassTarget = null;
}

function applyIdle(surface) {
  clearTimer(surface);
  surface.classList.remove('is-glass-bar-hovering', 'is-glass-item-hovering');
  surface.style.removeProperty('--pf-glass-item-color');
  surface.style.removeProperty('--pf-glass-item-ink');
  clearTarget(surface);
  resetPointerVars(surface);
}

function applyBarHover(surface) {
  surface.classList.add('is-glass-bar-hovering');
  surface.classList.remove('is-glass-item-hovering');
  surface.style.removeProperty('--pf-glass-item-color');
  surface.style.removeProperty('--pf-glass-item-ink');
  clearTarget(surface);
}

function resolveTargetTone(surface, target, options) {
  const tone = target.dataset?.glassTone;

  if (tone) {
    return options.tones[tone] || options.tones.green;
  }

  if (surface.dataset?.glassAccent) {
    return {
      color: surface.dataset.glassAccent,
      ink: 'var(--pf-ink)',
    };
  }

  return options.tones.green;
}

function findGlassTarget(surface, event, options) {
  const target = event.target?.closest?.(options.itemSelector) || null;
  if (target && typeof surface.contains === 'function' && !surface.contains(target)) {
    return null;
  }

  return target;
}

function isInsideControlGroup(event, options) {
  return Boolean(event.target?.closest?.(options.groupSelector));
}

function applyTarget(surface, target, options) {
  surface.classList.add('is-glass-item-hovering');
  surface.classList.remove('is-glass-bar-hovering');

  if (surface._reactiveGlassTarget === target) return;

  surface._reactiveGlassTarget?.classList.remove('is-glass-target');
  surface._reactiveGlassTarget = target;
  target.classList.add('is-glass-target');
  const targetTone = resolveTargetTone(surface, target, options);
  const color = typeof targetTone === 'string' ? targetTone : targetTone.color;
  const ink = typeof targetTone === 'string' ? 'var(--pf-ink)' : targetTone.ink;

  surface.style.setProperty('--pf-glass-item-color', color);
  surface.style.setProperty('--pf-glass-item-ink', ink);
}

function applyPhase(surface, target, event, options) {
  if (target) {
    clearTimer(surface);
    applyTarget(surface, target, options);
    return;
  }

  if (surface._reactiveGlassTarget) {
    clearTimer(surface);

    if (!isInsideControlGroup(event, options)) {
      applyBarHover(surface);
      return;
    }

    surface._reactiveGlassClearTimer = globalThis.setTimeout(() => {
      if (!surface._reactiveGlassPendingTarget) {
        applyBarHover(surface);
      }
    }, options.gapDelayMs);
    return;
  }

  applyBarHover(surface);
}

export function installReactiveGlassSurface(surface, options = {}) {
  if (!surface || surface.dataset.reactiveGlassBound === 'true') return;

  const resolvedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    tones: {
      ...DEFAULT_TONES,
      ...(options.tones || {}),
    },
  };

  const handlePointerMove = (event) => {
    if (isTouchPointer(event)) return;

    setPointerVars(surface, event);
    surface._reactiveGlassPendingTarget = findGlassTarget(surface, event, resolvedOptions);
    applyPhase(surface, surface._reactiveGlassPendingTarget, event, resolvedOptions);
    surface._reactiveGlassPendingTarget = null;
  };

  const handlePointerLeave = () => {
    applyIdle(surface);
  };

  surface.dataset.reactiveGlassBound = 'true';
  surface.addEventListener('pointerenter', handlePointerMove);
  surface.addEventListener('pointermove', handlePointerMove);
  surface.addEventListener('pointerleave', handlePointerLeave);
  surface.addEventListener('pointercancel', handlePointerLeave);
  resetPointerVars(surface);
}
