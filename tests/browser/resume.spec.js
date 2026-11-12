import { test, expect } from '@playwright/test';

for (const width of [1440, 390]) test(`delayed Resume startup preserves layout and visible content at ${width}px without an icon font`, async ({ page }) => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.route('**/dist/site/playfolio.js*', async route => {
    await ready;
    await route.continue();
  });
  try {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/resume.html', { waitUntil: 'commit' });
    await expect(page.locator('.pf-resume-top')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const before = await page.evaluate(() => ({
      top: document.querySelector('.pf-resume-layout').getBoundingClientRect().top,
      filterHeight: document.querySelector('[data-resume-filter]').getBoundingClientRect().height,
      visibility: getComputedStyle(document.querySelector('[data-resume-filter]')).visibility,
    }));
    expect(before.filterHeight).toBeGreaterThan(40);
    expect(before.visibility).toBe('hidden');
    await expect(page.locator('.pf-resume-top')).toHaveCSS('opacity', '1');
    release();
    await expect(page.locator('[data-resume-filter]')).toHaveAttribute('data-bound', 'true');
    await expect(page.locator('[data-command-palette]')).toBeAttached();
    const after = await page.locator('.pf-resume-layout').evaluate(el => el.getBoundingClientRect().top);
    expect(Math.abs(after - before.top)).toBeLessThanOrEqual(1);
    await expect(page.locator('.pf-resume-top')).not.toHaveClass(/is-reveal-ready/);
    await expect(page.locator('#projects')).toHaveClass(/is-reveal-ready/);
    await expect(page.locator('svg.pf-icon')).toHaveCount(5);
    expect(requests.some(url => /bootstrap-icons|\.woff2?/.test(url) && !url.includes('/assets/fonts/plus-jakarta-sans-v12-'))).toBe(false);
    expect(requests.filter(url => url.includes('/dist/site/playfolio.js'))).toHaveLength(1);
    expect(requests.some(url => /\/js\/playfolio\//.test(url))).toBe(false);
  } finally { release(); }
});

test('resume roles filter projects and sections while retaining essential details and the generic PDF', async ({ page }) => {
  await page.goto('/resume.html');
  const robotics = page.getByRole('button', { name: 'Robotics', exact: true });
  const download = page.getByRole('link', { name: 'Download CV', exact: true });
  const genericPdf = await download.getAttribute('href');
  await robotics.focus();
  await page.keyboard.press('Enter');
  await expect(robotics).toBeFocused();
  await expect(robotics).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-resume-entry="noty"]')).toBeHidden();
  await expect(page.locator('[data-resume-entry="vigil"]')).toBeVisible();
  await expect(page.locator('[data-resume-entry="ie-university"]')).toBeVisible();
  await expect(page.locator('[data-resume-entry="languages"]')).toBeVisible();
  await expect(download).toHaveAttribute('href', genericPdf);

  await page.getByRole('button', { name: 'Native apps', exact: true }).click();
  await expect(page.locator('#experience')).toBeHidden();
  await expect(page.locator('[data-resume-section-link="experience"]')).toBeHidden();
  await expect(page.locator('[data-resume-entry="noty"]')).toBeVisible();
  await expect(page.locator('[data-resume-entry="vigil"]')).toBeHidden();
  await page.getByRole('button', { name: 'All roles', exact: true }).click();
  await expect(page.locator('#experience')).toBeVisible();
  await expect(page.locator('[data-resume-section-link="experience"]')).toBeVisible();
});

test('resume role links survive reload and Back/Forward without losing other URL parameters', async ({ page }) => {
  await page.goto('/resume.html?source=application&role=robotics');
  await expect(page.getByRole('button', { name: 'Robotics', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-resume-entry="noty"]')).toBeHidden();
  await page.getByRole('button', { name: 'Native apps', exact: true }).click();
  await expect(page).toHaveURL(/source=application&role=native-apps/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Native apps', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Robotics', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goForward();
  await expect(page.getByRole('button', { name: 'Native apps', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'All roles', exact: true }).click();
  await expect(page).toHaveURL(/resume.html\?source=application$/);
});

test('unknown resume role falls back to the complete document', async ({ page }) => {
  await page.goto('/resume.html?role=unknown-role');
  await expect(page.getByRole('button', { name: 'All roles', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-resume-entry="noty"]')).toBeVisible();
  await expect(page.locator('[data-resume-entry="vigil"]')).toBeVisible();
});

test('resume content and PDF links remain available without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4317/resume.html?role=robotics');
  await expect(page.locator('[data-resume-filter]')).toBeHidden();
  await expect(page.locator('[data-resume-entry="noty"]')).toBeAttached();
  await expect(page.locator('[data-resume-entry="vigil"]')).toBeAttached();
  expect(await page.locator('[data-resume-entry][hidden]').count()).toBe(0);
  await expect(page.getByRole('link', { name: 'Download CV', exact: true })).toHaveAttribute('href', '/assets/docs/matteo-giorgetti-resume-current.pdf');
  await context.close();
});

test('resume header and role controls stay compact across desktop and mobile', async ({ page }) => {
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/resume.html');
    await expect(page.locator('[data-resume-filter]')).toBeVisible();
    const layout = await page.evaluate(() => {
      const header = document.querySelector('.pf-resume-top');
      const label = document.querySelector('.pf-resume-filter-label').getBoundingClientRect();
      const firstButton = document.querySelector('[data-resume-role]').getBoundingClientRect();
      const announcement = document.querySelector('[data-resume-filter-status]').getBoundingClientRect();
      const style = getComputedStyle(header);
      const subtitle = header.querySelector('p').getBoundingClientRect();
      const actions = header.querySelector('.pf-resume-actions').getBoundingClientRect();
      return {
        mobileActionsBelowSubtitle: actions.y >= subtitle.bottom,
        paddingTop: parseFloat(style.paddingTop),
        paddingBottom: parseFloat(style.paddingBottom),
        labelCenter: label.y + label.height / 2,
        buttonCenter: firstButton.y + firstButton.height / 2,
        announcementArea: announcement.width * announcement.height,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
      };
    });
    expect.soft(layout.paddingTop, `${width}px header top padding`).toBeLessThanOrEqual(1);
    expect.soft(layout.paddingBottom, `${width}px header bottom padding`).toBeLessThanOrEqual(24);
    if (width >= 1024) expect.soft(Math.abs(layout.labelCenter - layout.buttonCenter), `${width}px filter label aligns with buttons`).toBeLessThanOrEqual(2);
    expect.soft(layout.announcementArea, `${width}px live announcement has no visible layout`).toBeLessThanOrEqual(1);
    expect.soft(layout.overflow, `${width}px horizontal overflow`).toBe(false);
    if (width < 640) expect.soft(layout.mobileActionsBelowSubtitle, 'Mobile CV actions remain below the subtitle').toBe(true);
  }
});
