import { observeElementActivity } from './visibility.js';

const WALL_PARTICLE_SPREADS = [-0.82, -0.52, -0.25, 0, 0.25, 0.52, 0.82];
const CODEX_SPEED_ACCELERATION_PER_SECOND = 0.52;
const CODEX_MAX_SPEED_MULTIPLIER = 2.45;
const MAX_ACTIVE_WALL_BURSTS = 4;
const LAUNCH_MIN_VERTICAL_ABS = 0.34;
const MIN_APPROACH_VECTOR_LENGTH = 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value) {
  return `${clamp(value, 0, 100).toFixed(2)}%`;
}

function normalizeVector(x, y) {
  const length = Math.hypot(x, y) || 1;

  return { x: x / length, y: y / length };
}

function accelerateBall(ball, dt) {
  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  if (!currentSpeed || currentSpeed >= ball.maxSpeed) return;

  const nextSpeed = Math.min(
    ball.maxSpeed,
    currentSpeed * (1 + CODEX_SPEED_ACCELERATION_PER_SECOND * dt),
  );
  const scale = nextSpeed / currentSpeed;
  ball.vx *= scale;
  ball.vy *= scale;
}

function createRandomLaunchVelocity(speed) {
  const angle = Math.random() * Math.PI * 2;
  let x = Math.cos(angle);
  let y = Math.sin(angle);

  if (x < 0 && y > 0) {
    x *= -1;
  }

  if (Math.abs(y) < LAUNCH_MIN_VERTICAL_ABS) {
    y = y < 0 ? -LAUNCH_MIN_VERTICAL_ABS : LAUNCH_MIN_VERTICAL_ABS;
  }

  const direction = normalizeVector(x, y);

  return {
    vx: direction.x * speed,
    vy: direction.y * speed,
  };
}

function createApproachLaunchVelocity(speed, rect, event) {
  if (!rect || !Number.isFinite(event?.clientX) || !Number.isFinite(event?.clientY)) return null;

  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const x = centerX - event.clientX;
  const y = centerY - event.clientY;
  if (Math.hypot(x, y) < MIN_APPROACH_VECTOR_LENGTH) return null;

  const direction = normalizeVector(x, y);

  return {
    vx: direction.x * speed,
    vy: direction.y * speed,
  };
}

export function createCodexWallHitParticles(stage, {
  x,
  y,
  normalX,
  normalY,
  speed,
  skipMotion = false,
} = {}) {
  if (!stage || skipMotion) return null;

  const activeBursts = Array.from(stage.querySelectorAll?.('.pf-codex-wall-burst') || []);
  const staleBurstCount = activeBursts.length - MAX_ACTIVE_WALL_BURSTS + 1;
  if (staleBurstCount > 0) {
    activeBursts.slice(0, staleBurstCount).forEach((activeBurst) => activeBurst.remove());
  }

  const ownerDocument = stage.ownerDocument || document;
  const burst = ownerDocument.createElement('span');
  const intensity = clamp((Number(speed) || 0) / 900, 0.7, 1.45);
  const distance = 28 + intensity * 4;
  const normal = normalizeVector(Number(normalX) || 0, Number(normalY) || 0);
  const tangent = { x: -normal.y, y: normal.x };

  burst.classList.add('pf-codex-wall-burst');
  burst.setAttribute?.('aria-hidden', 'true');
  burst.style.setProperty('--burst-x', formatPercent(x));
  burst.style.setProperty('--burst-y', formatPercent(y));
  burst.style.setProperty('--burst-intensity', intensity.toFixed(2));

  WALL_PARTICLE_SPREADS.forEach((spread, index) => {
    const particle = ownerDocument.createElement('span');
    const direction = normalizeVector(
      normal.x + tangent.x * spread,
      normal.y + tangent.y * spread,
    );

    particle.classList.add('pf-codex-wall-particle');
    particle.style.setProperty('--particle-dx', direction.x.toFixed(4));
    particle.style.setProperty('--particle-dy', direction.y.toFixed(4));
    particle.style.setProperty('--particle-distance', `${distance.toFixed(2)}px`);
    particle.style.setProperty('--particle-tx', `${(direction.x * distance).toFixed(2)}px`);
    particle.style.setProperty('--particle-ty', `${(direction.y * distance).toFixed(2)}px`);
    particle.style.setProperty('--particle-delay', `${index * 12}ms`);
    particle.style.setProperty('--particle-size', `${(3.5 + intensity * 1.6 - Math.abs(spread)).toFixed(2)}px`);
    particle.style.setProperty('--particle-glow', `${(8 * intensity).toFixed(2)}px`);
    particle.style.setProperty('--particle-aura', `${(18 * intensity).toFixed(2)}px`);
    burst.appendChild(particle);
  });

  burst.addEventListener('animationend', () => burst.remove(), { once: true });
  stage.appendChild(burst);

  return burst;
}

export function setupPortraitCycle(root = document) {
  const image = root.querySelector('[data-portrait-cycle]');
  if (!image) return;

  const sources = (image.dataset.cycleImages || '')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);

  if (sources.length < 2) return;

  let index = Math.max(0, sources.indexOf(image.getAttribute('src')));
  let interval = 0;
  let switchTimer = 0;
  let preloaded = false;
  let active = false;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  image.addEventListener('load', () => {
    image.classList.remove('is-switching');
  });

  const sync = () => {
    window.clearInterval(interval);
    window.clearTimeout(switchTimer);
    image.classList.remove('is-switching');
    if (!active || reducedMotion.matches) return;

    if (!preloaded) {
      sources.forEach((source) => {
        const preload = new Image();
        preload.src = source;
      });
      preloaded = true;
    }
    interval = window.setInterval(() => {
      image.classList.add('is-switching');
      switchTimer = window.setTimeout(() => {
        index = (index + 1) % sources.length;
        image.src = sources[index];
      }, 180);
    }, 2400);
  };
  reducedMotion.addEventListener?.('change', sync);
  observeElementActivity(image, (visible) => {
    active = visible;
    sync();
  });
}

export function setupCodexAmbassadorLogo(root = document) {
  const logo = root.querySelector('[data-codex-ambassador-logo]');
  if (!logo) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const video = logo.querySelector('[data-deferred-video]');
  const videoSource = video?.querySelector('source[data-src]');
  const shouldSkipVideo = () => reducedMotionQuery.matches || Boolean(navigator.connection?.saveData);
  let videoLoadQueued = false;
  let videoLoaded = false;
  let videoLoadDue = false;
  let active = false;
  let frameId = 0;
  let ball = null;

  const emitWallParticles = ({ normalX, normalY, speed }) => {
    if (!ball?.stage) return;
    const currentLeft = ball.originX + ball.x;
    const currentTop = ball.originY + ball.y;
    const impactX = normalX < 0
      ? currentLeft + ball.logoWidth
      : normalX > 0
        ? currentLeft
        : currentLeft + ball.logoWidth / 2;
    const impactY = normalY < 0
      ? currentTop + ball.logoHeight
      : normalY > 0
        ? currentTop
        : currentTop + ball.logoHeight / 2;

    createCodexWallHitParticles(ball.stage, {
      x: (impactX / ball.stageWidth) * 100,
      y: (impactY / ball.stageHeight) * 100,
      normalX,
      normalY,
      speed,
      skipMotion: reducedMotionQuery.matches,
    });
  };

  const loadAmbassadorVideo = () => {
    if (!video || !videoSource || videoLoaded || !active || shouldSkipVideo()) return;

    videoLoaded = true;
    videoSource.src = videoSource.dataset.src;
    video.load();
    video.play().catch(() => {
      // Autoplay can be denied in some browser modes; the poster remains usable.
    });
  };

  const queueAmbassadorVideoLoad = () => {
    if (!video || videoLoadQueued || videoLoaded || shouldSkipVideo()) return;

    videoLoadQueued = true;
    const delay = Number(video.dataset.loadDelayMs || 3500);
    window.setTimeout(() => {
      const load = () => {
        videoLoadDue = true;
        loadAmbassadorVideo();
      };
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(load, { timeout: 1200 });
      } else {
        load();
      }
    }, delay);
  };

  const stopBall = () => {
    if (frameId) window.cancelAnimationFrame(frameId);
    frameId = 0;
    ball = null;
    logo.classList.remove('is-flying');
    logo.style.transform = '';
  };

  const applyBallTransform = () => {
    if (!ball) return;
    logo.style.transform = `translate3d(${ball.x}px, ${ball.y}px, 0) rotate(${ball.angle}deg)`;
  };

  const isNearHome = () => {
    if (!ball) return false;
    return Math.hypot(ball.x, ball.y) < ball.homeRadius;
  };

  const tickBall = (time) => {
    frameId = 0;
    if (!ball || !active) return;

    const dt = Math.min(0.032, (time - ball.lastTime) / 1000 || 0);
    ball.lastTime = time;
    if (dt <= 0) {
      frameId = window.requestAnimationFrame(tickBall);
      return;
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= ball.bounds.minX || ball.x >= ball.bounds.maxX) {
      const normalX = ball.vx > 0 ? -1 : 1;
      const impactSpeed = Math.hypot(ball.vx, ball.vy);

      ball.x = Math.max(ball.bounds.minX, Math.min(ball.bounds.maxX, ball.x));
      ball.vx *= -1;
      ball.angle += ball.vy > 0 ? 58 : -58;
      emitWallParticles({ normalX, normalY: 0, speed: impactSpeed });
    }

    if (ball.y <= ball.bounds.minY || ball.y >= ball.bounds.maxY) {
      const normalY = ball.vy > 0 ? -1 : 1;
      const impactSpeed = Math.hypot(ball.vx, ball.vy);

      ball.y = Math.max(ball.bounds.minY, Math.min(ball.bounds.maxY, ball.y));
      ball.vy *= -1;
      ball.angle += ball.vx > 0 ? -43 : 43;
      emitWallParticles({ normalX: 0, normalY, speed: impactSpeed });
    }

    accelerateBall(ball, dt);
    ball.angle += (ball.vx > 0 ? 460 : -460) * dt;

    if (!ball.hasLeftHome && !isNearHome()) {
      ball.hasLeftHome = true;
    }

    if (ball.hasLeftHome && time - ball.startedAt > 700 && isNearHome()) {
      stopBall();
      return;
    }

    applyBallTransform();
    frameId = window.requestAnimationFrame(tickBall);
  };

  const startBall = (event) => {
    loadAmbassadorVideo();
    if (!active || reducedMotionQuery.matches || ball) return;

    const stage = logo.closest('.pf-portrait-stage');
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    const rect = logo.getBoundingClientRect();
    const speed = Math.max(760, Math.min(stageRect.width, stageRect.height) * 1.9);
    const launchVelocity = createApproachLaunchVelocity(speed, rect, event) || createRandomLaunchVelocity(speed);
    const now = performance.now();

    ball = {
      x: 0,
      y: 0,
      vx: launchVelocity.vx,
      vy: launchVelocity.vy,
      maxSpeed: speed * CODEX_MAX_SPEED_MULTIPLIER,
      angle: 0,
      startedAt: now,
      lastTime: now,
      hasLeftHome: false,
      stage,
      stageWidth: stageRect.width,
      stageHeight: stageRect.height,
      originX: rect.left - stageRect.left,
      originY: rect.top - stageRect.top,
      logoWidth: rect.width,
      logoHeight: rect.height,
      homeRadius: Math.max(34, rect.width * 0.55),
      bounds: {
        minX: stageRect.left - rect.left,
        maxX: stageRect.right - rect.right,
        minY: stageRect.top - rect.top,
        maxY: stageRect.bottom - rect.bottom,
      },
    };

    logo.classList.add('is-flying');
    frameId = window.requestAnimationFrame(tickBall);
  };

  const syncActivity = () => {
    if (!active || shouldSkipVideo()) {
      video?.pause();
    } else if (videoLoaded) {
      video.play().catch(() => {});
    } else if (videoLoadDue) {
      loadAmbassadorVideo();
    }

    if (reducedMotionQuery.matches) {
      stopBall();
    } else if (!active) {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (ball && !frameId) {
      ball.lastTime = performance.now();
      frameId = window.requestAnimationFrame(tickBall);
    }
  };

  observeElementActivity(logo.closest('.pf-portrait-stage') || logo, (visible) => {
    active = visible;
    syncActivity();
  });
  reducedMotionQuery.addEventListener?.('change', syncActivity);
  queueAmbassadorVideoLoad();
  logo.addEventListener('pointerenter', startBall);
  logo.addEventListener('focus', startBall);
  logo.addEventListener('click', loadAmbassadorVideo);
  window.addEventListener('resize', stopBall);
}
