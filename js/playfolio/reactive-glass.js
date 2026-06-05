const DEFAULT_TONES = {
  amber: { color: 'var(--pf-glass-tone-amber)', ink: 'var(--pf-ink)' },
  blue: { color: 'var(--pf-glass-tone-blue)', ink: 'var(--pf-ink)' },
  brand: { color: 'var(--pf-glass-tone-brand)', ink: 'var(--pf-glass-tone-brand-ink)' },
  coral: { color: 'var(--pf-glass-tone-coral)', ink: 'var(--pf-ink)' },
  green: { color: 'var(--pf-glass-tone-green)', ink: 'var(--pf-ink)' },
  mode: { color: 'var(--pf-glass-tone-mode)', ink: 'var(--pf-glass-tone-mode-ink)' },
  'mode-preview': { color: 'var(--pf-glass-tone-mode-preview)', ink: 'var(--pf-glass-tone-mode-preview-ink)' },
  neutral: { color: 'var(--pf-glass-tone-neutral)', ink: 'var(--pf-glass-tone-neutral-ink)' },
};

const DEFAULT_OPTIONS = {
  itemSelector: '[data-glass-item]',
  groupSelector: '[data-glass-group]',
  gapDelayMs: 55,
  tones: DEFAULT_TONES,
};
const POINTER_STORAGE_KEY = 'pfReactiveGlassPointer';
const POINTER_STORAGE_TTL_MS = 4000;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isTouchPointer(event) {
  return event.pointerType === 'touch';
}

function isModifiedClick(event) {
  return event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function windowFor(surface) {
  return surface.ownerDocument?.defaultView || globalThis;
}

function takeStoredPointer(surface) {
  try {
    const storage = windowFor(surface).sessionStorage;
    const value = storage?.getItem?.(POINTER_STORAGE_KEY);
    if (!value) return null;
    storage?.removeItem?.(POINTER_STORAGE_KEY);

    const pointer = JSON.parse(value);
    if (!Number.isFinite(pointer?.x) || !Number.isFinite(pointer?.y)) return null;
    if (Date.now() - Number(pointer.time || 0) > POINTER_STORAGE_TTL_MS) return null;

    return pointer;
  } catch {
    return null;
  }
}

function findSameTabLink(surface, event) {
  const link = event.target?.closest?.('a[href]');
  if (!link || (typeof surface.contains === 'function' && !surface.contains(link))) return null;

  const target = link.getAttribute?.('target');
  return !target || target === '_self' ? link : null;
}

function writeStoredPointer(surface, event) {
  try {
    windowFor(surface).sessionStorage?.setItem?.(
      POINTER_STORAGE_KEY,
      JSON.stringify({ x: event.clientX, y: event.clientY, time: Date.now() })
    );
  } catch {
    // Storage can be unavailable in strict browser modes; live pointer events still drive the effect.
  }
}

function clearTimer(surface) {
  if (surface._reactiveGlassClearTimer) {
    globalThis.clearTimeout(surface._reactiveGlassClearTimer);
    surface._reactiveGlassClearTimer = null;
  }
}

function setPointerVarsAt(surface, clientX, clientY) {
  const rect = surface.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = clamp(clientX - rect.left, 0, rect.width);
  const y = clamp(clientY - rect.top, 0, rect.height);
  const px = clamp(x / rect.width, 0, 1);
  const py = clamp(y / rect.height, 0, 1);

  surface.style.setProperty('--pf-glass-x', `${x.toFixed(2)}px`);
  surface.style.setProperty('--pf-glass-y', `${y.toFixed(2)}px`);
  surface.style.setProperty('--pf-glass-px', px.toFixed(4));
  surface.style.setProperty('--pf-glass-py', py.toFixed(4));
  surface.style.setProperty('--pf-glass-dx', `${((px - 0.5) * 100).toFixed(2)}px`);
  surface.style.setProperty('--pf-glass-dy', `${((py - 0.5) * 100).toFixed(2)}px`);
}

function setPointerVars(surface, event) {
  setPointerVarsAt(surface, event.clientX, event.clientY);
}

function setPointerVarsFromElementCenter(surface, element) {
  const rect = element.getBoundingClientRect?.();
  if (!rect?.width || !rect?.height) return;

  setPointerVarsAt(surface, rect.left + rect.width / 2, rect.top + rect.height / 2);
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

function findCurrentlyHoveredTarget(surface, options) {
  const hoveredElements = surface.ownerDocument?.querySelectorAll?.(':hover');
  if (!hoveredElements) return null;

  for (let index = hoveredElements.length - 1; index >= 0; index -= 1) {
    const target = hoveredElements[index]?.closest?.(options.itemSelector);
    if (target && typeof surface.contains === 'function' && surface.contains(target)) {
      return target;
    }
  }

  return null;
}

function primeStoredPointerState(surface, options) {
  const pointer = takeStoredPointer(surface);
  if (!pointer) return false;

  const element = surface.ownerDocument?.elementFromPoint?.(pointer.x, pointer.y);
  const target = element?.closest?.(options.itemSelector);
  if (target && typeof surface.contains === 'function' && surface.contains(target)) {
    setPointerVarsAt(surface, pointer.x, pointer.y);
    applyTarget(surface, target, options);
    return true;
  }

  if (element && typeof surface.contains === 'function' && surface.contains(element)) {
    setPointerVarsAt(surface, pointer.x, pointer.y);
    applyBarHover(surface);
    return true;
  }

  return false;
}

function primeCurrentHoverState(surface, options) {
  if (primeStoredPointerState(surface, options)) return;

  const target = findCurrentlyHoveredTarget(surface, options);
  if (target) {
    setPointerVarsFromElementCenter(surface, target);
    applyTarget(surface, target, options);
    return;
  }

  if (surface.matches?.(':hover')) {
    setPointerVarsFromElementCenter(surface, surface);
    applyBarHover(surface);
  }
}

function scheduleHoverPrime(surface, options) {
  const scheduler = surface.ownerDocument?.defaultView?.requestAnimationFrame || globalThis.requestAnimationFrame;
  if (typeof scheduler === 'function') {
    scheduler(() => primeCurrentHoverState(surface, options));
    return;
  }

  primeCurrentHoverState(surface, options);
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

  const handleVisibilityChange = () => {
    if (surface.ownerDocument?.visibilityState === 'hidden') {
      applyIdle(surface);
    }
  };

  const handleClick = (event) => {
    if (isTouchPointer(event) || isModifiedClick(event) || !findSameTabLink(surface, event)) return;

    writeStoredPointer(surface, event);
  };

  surface.dataset.reactiveGlassBound = 'true';
  surface.addEventListener('pointerenter', handlePointerMove);
  surface.addEventListener('pointermove', handlePointerMove);
  surface.addEventListener('click', handleClick);
  surface.addEventListener('pointerleave', handlePointerLeave);
  surface.addEventListener('pointercancel', handlePointerLeave);
  windowFor(surface).addEventListener?.('blur', handlePointerLeave);
  surface.ownerDocument?.addEventListener?.('visibilitychange', handleVisibilityChange);
  resetPointerVars(surface);
  scheduleHoverPrime(surface, resolvedOptions);
}
