export function setupPortraitCycle(root = document) {
  const image = root.querySelector('[data-portrait-cycle]');
  if (!image) return;

  const sources = (image.dataset.cycleImages || '')
    .split(',')
    .map((source) => source.trim())
    .filter(Boolean);

  if (sources.length < 2) return;

  let index = Math.max(0, sources.indexOf(image.getAttribute('src')));

  sources.forEach((source) => {
    const preload = new Image();
    preload.src = source;
  });

  image.addEventListener('load', () => {
    image.classList.remove('is-switching');
  });

  window.setInterval(() => {
    image.classList.add('is-switching');
    window.setTimeout(() => {
      index = (index + 1) % sources.length;
      image.src = sources[index];
    }, 180);
  }, 2400);
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
  let frameId = 0;
  let ball = null;

  const loadAmbassadorVideo = () => {
    if (!video || !videoSource || videoLoaded || shouldSkipVideo()) return;

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
      const load = () => loadAmbassadorVideo();
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
    if (!ball) return;

    const dt = Math.min(0.032, (time - ball.lastTime) / 1000 || 0);
    ball.lastTime = time;

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x <= ball.bounds.minX || ball.x >= ball.bounds.maxX) {
      ball.x = Math.max(ball.bounds.minX, Math.min(ball.bounds.maxX, ball.x));
      ball.vx *= -1;
      ball.angle += ball.vy > 0 ? 58 : -58;
    }

    if (ball.y <= ball.bounds.minY || ball.y >= ball.bounds.maxY) {
      ball.y = Math.max(ball.bounds.minY, Math.min(ball.bounds.maxY, ball.y));
      ball.vy *= -1;
      ball.angle += ball.vx > 0 ? -43 : 43;
    }

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

  const startBall = () => {
    loadAmbassadorVideo();
    if (reducedMotionQuery.matches || ball) return;

    const stage = logo.closest('.pf-portrait-stage');
    if (!stage) return;

    const stageRect = stage.getBoundingClientRect();
    const rect = logo.getBoundingClientRect();
    const speed = Math.max(760, Math.min(stageRect.width, stageRect.height) * 1.9);
    const now = performance.now();
    const margin = Math.max(24, rect.width * 0.32);

    ball = {
      x: 0,
      y: 0,
      vx: speed,
      vy: -speed * 0.64,
      angle: 0,
      startedAt: now,
      lastTime: now,
      hasLeftHome: false,
      homeRadius: Math.max(34, rect.width * 0.55),
      bounds: {
        minX: stageRect.left + margin - rect.left,
        maxX: stageRect.right - margin - rect.right,
        minY: stageRect.top + margin - rect.top,
        maxY: stageRect.bottom - margin - rect.bottom,
      },
    };

    logo.classList.add('is-flying');
    frameId = window.requestAnimationFrame(tickBall);
  };

  queueAmbassadorVideoLoad();
  logo.addEventListener('pointerenter', startBall);
  logo.addEventListener('focus', startBall);
  logo.addEventListener('click', loadAmbassadorVideo);
  window.addEventListener('resize', stopBall);
}
