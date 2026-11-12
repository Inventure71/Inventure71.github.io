import { test, expect } from '@playwright/test';

test('the playing Codex logo retains transparency throughout its animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const video = page.locator('[data-codex-ambassador-logo] video');
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate(v => v.readyState >= 2 && !v.paused), { timeout: 15000 }).toBe(true);
  const frames = await video.evaluate(async v => {
    v.pause();
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const context = canvas.getContext('2d');
    const samples = [];
    for (const time of [0.1, 5, 18, 35]) {
      await new Promise(resolve => { v.addEventListener('seeked', resolve, { once: true }); v.currentTime = time; });
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(v, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0, opaque = 0;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparent++;
        if (pixels[i] === 255) opaque++;
      }
      samples.push({ time, transparent, opaque });
    }
    return samples;
  });
  for (const frame of frames) {
    expect(frame.transparent, `transparent pixels at ${frame.time}s`).toBeGreaterThan(1000);
    expect(frame.opaque, `visible logo pixels at ${frame.time}s`).toBeGreaterThan(1000);
  }
});

test('site fonts load locally once without an external font or icon stylesheet', async ({ page }) => {
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/contact.html');
  await page.evaluate(() => document.fonts.ready);
  expect(requests.some(url => /fonts\.(googleapis|gstatic)\.com|bootstrap-icons/.test(url))).toBe(false);
  expect(requests.filter(url => url.includes('/assets/fonts/plus-jakarta-sans-v12-latin.woff2'))).toHaveLength(1);
  expect(await page.evaluate(() => document.fonts.check('400 16px "Plus Jakarta Sans"'))).toBe(true);
});

test('the map race link stays beside its introduction while graph data loads', async ({ page }) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route('**/neuron-brain-*.js', async route => { await ready; await route.continue(); });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tags.html', { waitUntil: 'commit' });
    const link = page.locator('.neuron-controls a');
    await expect(link).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const before = await link.boundingBox();
    const footerBefore = await page.locator('footer').boundingBox();
    expect(footerBefore.y).toBeGreaterThanOrEqual(844);
    release();
    await expect(page.getByRole('group', { name: 'Project topics' }).getByRole('button')).toHaveCount(62);
    const after = await link.boundingBox();
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await link.click();
    await expect(page).toHaveURL(/projects.html$/);
  } finally { release(); }
});

for (const width of [1440, 390]) test(`Dream2Detect keeps its first-step geometry during delayed enhancement at ${width}px`, async ({ page }) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route('**/js/project-demos/dream2detect.js*', async route => { await ready; await route.continue(); });
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/project_details/project-dream2detect.html', { waitUntil: 'commit' });
    const walkthrough = page.locator('[data-experiment-walkthrough]');
    await expect(walkthrough.locator('[data-step-panel="generate"]')).toBeVisible();
    await expect(walkthrough.locator('[data-step-panel="review"]')).toBeHidden();
    await page.evaluate(() => document.fonts.ready);
    const before = await walkthrough.boundingBox();
    release();
    await expect(walkthrough).toHaveAttribute('data-walkthrough-ready', 'true');
    const after = await walkthrough.boundingBox();
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    await walkthrough.getByRole('tab', { name: /Review labels/ }).click();
    await expect(walkthrough.locator('[data-step-panel="review"]')).toBeVisible();
  } finally { release(); }
});

test('Dream2Detect keeps every walkthrough step readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4317/project_details/project-dream2detect.html');
    for (const panel of await page.locator('[data-step-panel]').all()) await expect(panel).toBeVisible();
    await expect(page.locator('[data-step-controls]')).toBeHidden();
  } finally { await context.close(); }
});

test('the race guide is present before upgrade and preserves the launch position', async ({ page }) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  await page.route('**/js/project-race-guide.js*', async route => { await ready; await route.continue(); });
  try {
    await page.goto('/projects.html?raceAutoStart=0', { waitUntil: 'commit' });
    await expect(page.locator('project-race-guide .pf-race-guide__headline')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const button = page.locator('[data-project-race-toggle]');
    const before = await button.boundingBox();
    await page.evaluate(() => { window.originalRaceGuide = document.querySelector('.pf-race-guide'); });
    release();
    await expect(page.locator('project-race-guide')).toHaveAttribute('data-rendered', 'true');
    const after = await button.boundingBox();
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => window.originalRaceGuide === document.querySelector('.pf-race-guide'))).toBe(true);
  } finally { release(); }
});

test('simulator code downloads while its stylesheet is pending, then mounts after both finish', async ({ page }) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  let stylesheetRequested = false;
  let moduleRequested = false;
  await page.route('**/f1-simulator.css*', async route => { stylesheetRequested = true; await ready; await route.continue(); });
  await page.route('**/f1-simulator.js*', async route => { moduleRequested = true; await route.continue(); });
  try {
    await page.goto('/projects.html?raceAutoStart=1', { waitUntil: 'commit' });
    await expect.poll(() => stylesheetRequested).toBe(true);
    await expect.poll(() => moduleRequested).toBe(true);
    await expect(page.locator('[data-paddock-root] canvas')).toHaveCount(0);
    release();
    await expect(page.locator('[data-paddock-shell]')).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
    await expect(page.locator('[data-paddock-root] canvas')).toHaveCount(1);
  } finally { release(); }
});

for (const reducedMotion of ['reduce', 'no-preference']) test(`the mobile map draws the scrolled topics with a viewport-sized canvas (${reducedMotion})`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion });
  await page.goto('/tags.html');
  const topics = page.getByRole('group', { name: 'Project topics' }).getByRole('button');
  await expect(topics).toHaveCount(62);
  const last = topics.last();
  await expect(last).toHaveAttribute('style', /transform: translate/);
  await last.scrollIntoViewIfNeeded();
  await expect.poll(() => last.evaluate(topic => {
    const canvas = document.getElementById('neuron-canvas');
    const bounds = canvas.getBoundingClientRect();
    const target = topic.getBoundingClientRect();
    const x = (target.x + target.width / 2 - bounds.x) * canvas.width / bounds.width;
    const y = (target.y + 42 - bounds.y) * canvas.height / bounds.height;
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return false;
    return canvas.getContext('2d').getImageData(Math.floor(x), Math.floor(y), 1, 1).data[3] > 0;
  })).toBe(true);
  const dimensions = await page.locator('#neuron-canvas').evaluate(canvas => ({
    height: canvas.height,
    limit: innerHeight * Math.min(devicePixelRatio, 2),
    graphHeight: canvas.closest('.neuron-container').getBoundingClientRect().height,
    viewport: innerHeight,
  }));
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.limit);
  expect(dimensions.graphHeight).toBeGreaterThan(dimensions.viewport * 2);
});
