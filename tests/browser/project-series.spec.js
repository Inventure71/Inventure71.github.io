import { test, expect } from '@playwright/test';
import { projects, SERIES } from '../../js/playfolio/project-catalog.js';

async function liveGrid(page) {
  return page.evaluate(async () => {
    const shell = document.querySelector('[data-paddock-shell]');
    const integration = await import(new URL(shell.dataset.paddockScriptSrc, location.href).href);
    const simulator = await integration.initializeProjectsRace(shell);
    return simulator.getSnapshot().cars.map(car => car.id);
  });
}

const expectedGrid = series => projects.filter(project => project.tier === series)
  .sort((a, b) => a.priority - b.priority).map(project => project.raceId);

async function expectSeriesLogo(page, series) {
  const logos = page.locator('.broadcast-f1-logo');
  expect(await logos.count()).toBeGreaterThan(0);
  for (const logo of await logos.all()) {
    await expect(logo).toHaveAttribute('alt', series);
    await expect(logo).toHaveAttribute('src', series === 'F1' ? /\/f1Logo\.png$/ : new RegExp(`/f${series.slice(1)}-logo\\.svg$`));
    await expect.poll(() => logo.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  }
}

test('series switches replace actual race entrants and URL without replacing the canvas; Back restores the prior tier', async ({ page }) => {
  await page.goto('/projects.html?raceAutoStart=1');
  const shell = page.locator('[data-paddock-shell]');
  await expect(shell).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
  await page.evaluate(() => { window.seriesCanvas = document.querySelector('#paddock-race-root canvas'); });
  for (const { id } of SERIES) {
    const choice = page.locator(`[data-series-choice="${id}"]`);
    await choice.click();
    await expect(choice).toHaveAttribute('aria-current', 'true');
    await expect.poll(() => liveGrid(page)).toEqual(expectedGrid(id));
    await expectSeriesLogo(page, id);
    await expect(page.getByRole('button', { name: 'Start race', exact: true })).toBeEnabled();
    expect(await page.evaluate(() => document.querySelector('#paddock-race-root canvas') === window.seriesCanvas)).toBe(true);
    await expect(page.locator('#paddock-race-root canvas')).toHaveCount(1);
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  await page.goBack();
  await expect(page.locator('[data-series-choice="F2"]')).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => liveGrid(page)).toEqual(expectedGrid('F2'));
  await expectSeriesLogo(page, 'F2');
  await page.reload();
  await expect(shell).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
  await expect.poll(() => liveGrid(page)).toEqual(expectedGrid('F2'));
  await expectSeriesLogo(page, 'F2');
  await page.locator('[data-series-choice="F1"]').click();
  await expect.poll(() => liveGrid(page)).toEqual(expectedGrid('F1'));
  await expectSeriesLogo(page, 'F1');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

for (const series of ['F1', 'F2', 'F3']) {
  test(`standalone ${series} uses the selected championship logo and accessible label`, async ({ page }) => {
    await page.goto(`/f1-simulator.html?series=${series}`);
    await expect(page.locator('#f1-simulator-root canvas')).toHaveCount(1, { timeout: 30000 });
    await expectSeriesLogo(page, series);
    await expect(page).toHaveTitle(`${series} Project Race - Matteo Giorgetti`);
    await expect(page.getByRole('region', { name: `${series} project race simulator`, exact: true })).toBeAttached();
  });
}

test('invalid series falls back to F1; all project links remain available without JavaScript', async ({ page, browser }) => {
  await page.goto('/projects.html?series=unknown&raceAutoStart=0');
  await expect(page.locator('[data-series-choice="F1"]')).toHaveAttribute('aria-current', 'true');
  const context = await browser.newContext({ javaScriptEnabled: false });
  const noJs = await context.newPage();
  await noJs.goto('/projects.html');
  await expect(noJs.locator('.pf-project-fallback a')).toHaveCount(projects.length);
  await context.close();
});

test('one grid-first simulator starts, pauses and resumes exact progress with the same canvas', async ({ page }) => {
  await page.goto('/projects.html?raceAutoStart=1');
  const shell = page.locator('[data-paddock-shell]');
  await expect(shell).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
  await page.evaluate(async () => {
    const shell = document.querySelector('[data-paddock-shell]');
    const integration = await import('/' + shell.dataset.paddockScriptSrc);
    window.race = await integration.initializeProjectsRace(shell);
    window.canvas = document.querySelector('#paddock-race-root canvas');
  });
  expect(await page.evaluate(() => window.race.getSnapshot().time)).toBe(0);
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(shell).toHaveAttribute('data-race-view', 'race');
  await page.waitForFunction(() => window.race.getSnapshot().time > 1);
  await page.getByRole('button', { name: 'Back to grid', exact: true }).click();
  await expect(shell).toHaveAttribute('data-race-view', 'grid-walk');
  const paused = await page.evaluate(() => JSON.stringify(window.race.getSnapshot()));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => JSON.stringify(window.race.getSnapshot()))).toBe(paused);
  await page.getByRole('button', { name: 'Resume race', exact: true }).click();
  await page.waitForFunction(time => window.race.getSnapshot().time > time, JSON.parse(paused).time);
  expect(await page.evaluate(() => document.querySelector('#paddock-race-root canvas') === window.canvas)).toBe(true);
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('mobile grid presents the race action in the first viewport and opens selected projects', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/projects.html?raceAutoStart=1');
  const shell = page.locator('[data-paddock-shell]');
  await expect(shell).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
  const start = page.getByRole('button', { name: 'Start race', exact: true });
  const box = await start.boundingBox();
  expect(box.y + box.height).toBeLessThan(844);
  await page.locator('[data-series-choice="F3"]').click();
  await expect.poll(() => liveGrid(page)).toEqual(expectedGrid('F3'));
  await page.getByRole('combobox', { name: 'Jump to grid entry' }).selectOption('budget');
  await expect(page.locator('[data-grid-project-banner] a')).toHaveAttribute('href', '/project_details/project-budget-buddy.html');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await start.click();
  await expect(shell).toHaveAttribute('data-race-view', 'race');
  await page.getByRole('button', { name: 'Back to grid', exact: true }).click();
  await page.screenshot({ path: 'output/playwright/grid-first-mobile.png' });
});

test('series changes paint the existing loader and retain one canvas; controls and flags remain balanced', async ({ page }) => {
  await page.goto('/projects.html?raceAutoStart=1');
  const shell = page.locator('[data-paddock-shell]');
  await expect(shell).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
  await page.evaluate(() => {
    window.switchCanvas = document.querySelector('canvas');
    window.switchLoading = [];
    const shell = document.querySelector('[data-paddock-shell]');
    new MutationObserver(() => {
      if (shell.dataset.simulatorState !== 'loading') return;
      const loader = shell.querySelector('[data-paddock-preview]');
      window.switchLoading.push({ loaderVisible: !loader.hidden && getComputedStyle(loader).opacity === '1', busy: shell.getAttribute('aria-busy'),
        canvasInert: shell.querySelector('[data-paddock-root]').inert,
        actionDisabled: document.querySelector('[data-project-race-toggle]').disabled });
    }).observe(shell, { attributes: true, attributeFilter: ['data-simulator-state'] });
  });
  await page.locator('[data-series-choice="F2"]').click();
  await expect(shell).toHaveAttribute('data-simulator-state', 'ready');
  expect(await page.evaluate(() => window.switchLoading)).toContainEqual({ loaderVisible: true, busy: 'true', canvasInert: true, actionDisabled: true });
  expect(await page.evaluate(() => document.querySelector('canvas') === window.switchCanvas)).toBe(true);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const toolbar = document.querySelector('.pf-race-toolbar').getBoundingClientRect();
      const button = document.querySelector('[data-project-race-toggle]').getBoundingClientRect();
      const flags = [...document.querySelectorAll('.pf-race-guide__marker')].map(el => el.getBoundingClientRect());
      const guide = document.querySelector('.pf-race-guide').getBoundingClientRect();
      return { buttonWidth: button.width, toolbarWidth: toolbar.width, flagCount: flags.length,
        leftGap: flags[0].left - guide.left, rightGap: guide.right - flags[1].right,
        selectorGap: flags[0].top - document.querySelector('.pf-series-selector').getBoundingClientRect().bottom,
        heights: flags.map(rect => rect.height) };
    });
    expect(Math.abs(geometry.buttonWidth - geometry.toolbarWidth)).toBeLessThanOrEqual(1);
    expect(geometry.flagCount).toBe(2);
    expect(Math.abs(geometry.leftGap - geometry.rightGap)).toBeLessThanOrEqual(1);
    expect(geometry.heights[0]).toBe(geometry.heights[1]);
    expect(geometry.selectorGap).toBeGreaterThanOrEqual(0);
    expect(geometry.selectorGap).toBeLessThanOrEqual(12);
  }
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  const radii = await page.locator('.race-telemetry-drawer__toolbar').evaluate(el => {
    const style = getComputedStyle(el); return [style.borderTopLeftRadius, style.borderTopRightRadius,
      style.borderBottomLeftRadius, style.borderBottomRightRadius];
  });
  expect(radii).toEqual(['16px', '16px', '16px', '16px']);
});

test('transparent import placeholder reserves space before handing off to one package loader', async ({ page }) => {
  let release, releaseModule;
  const assetsReady = new Promise(resolve => { release = resolve; });
  const moduleReady = new Promise(resolve => { releaseModule = resolve; });
  await page.route('**/f1-simulator.js*', async route => {
    await moduleReady;
    await route.continue();
  });
  await page.route('**/f1-car-sprite-game.png', async route => {
    await assetsReady;
    await route.continue();
  });
  try {
    await page.goto('/projects.html?raceAutoStart=1');
    const shell = page.locator('[data-paddock-shell]');
    await expect(shell).toHaveAttribute('data-simulator-state', 'loading');
    await expect(shell.locator('[data-paddock-preview]')).toHaveCSS('opacity', '0');
    const placeholderBounds = await shell.locator('[data-paddock-preview]').boundingBox();
    expect(placeholderBounds.width).toBeGreaterThan(0);
    expect(placeholderBounds.height).toBeGreaterThan(0);
    await expect(shell.locator('[data-paddock-root]')).toBeEmpty();
    releaseModule();
    await expect(shell).toHaveAttribute('data-simulator-state', 'booting', { timeout: 30000 });
    await expect(shell.locator('[data-paddock-preview]')).toBeHidden();
    await expect(shell.locator('[data-paddock-root]')).toHaveCSS('opacity', '1');
    await expect(shell.locator('[data-paddock-root]')).toHaveAttribute('inert', '');
    const internal = shell.locator('[data-paddock-root] [data-paddock-loading]');
    const outer = shell.locator('[data-race-telemetry-drawer] > [data-paddock-loading]');
    await expect(outer).toBeVisible();
    await expect(internal.filter({ visible: true })).toHaveCount(1);
    const bounds = await shell.locator('[data-paddock-root]').boundingBox();
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    release();
    await expect(shell).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
    await expect(shell.locator('[data-paddock-preview]')).toBeHidden();
    await expect(shell.locator('[data-paddock-root]')).toHaveCSS('opacity', '1');
    await expect(shell.locator('canvas')).toHaveCount(1);
  } finally { releaseModule(); release(); }
});
