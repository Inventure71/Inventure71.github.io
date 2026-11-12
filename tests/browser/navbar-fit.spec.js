import { test, expect } from '@playwright/test';

const routes = ['/', '/projects.html?raceAutoStart=0', '/apps.html', '/resume.html', '/contact.html'];

for (const route of routes) test(`navbar uses available space on ${route}`, async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(route);
  await page.evaluate(() => document.fonts.ready);
  const nav = page.locator('.navbar');
  const command = nav.getByRole('button', { name: 'Open command menu' });
  const toggle = nav.getByRole('button', { name: 'Toggle navigation' });
  for (const [width, layout] of [[850, 'full'], [700, 'compact'], [650, 'collapsed'], [390, 'collapsed'], [700, 'compact'], [850, 'full']]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(nav).toHaveAttribute('data-nav-layout', layout);
    if (layout === 'collapsed') {
      await expect(toggle).toBeVisible();
      await expect(nav.getByRole('link', { name: 'Projects', exact: true })).toBeHidden();
    } else {
      await expect(toggle).toBeHidden();
      if (layout === 'full') await expect(command).toBeVisible();
      else await expect(command).toBeHidden();
      const boxes = await nav.evaluate(n => {
        const ask = n.querySelector('[data-ai-guide-copy]').getBoundingClientRect();
        const links = [...n.querySelectorAll('.nav-link')].map(el => el.getBoundingClientRect());
        const theme = n.querySelector('[data-theme-toggle]').getBoundingClientRect();
        return { gap: links[0].left - ask.right, reserve: theme.width, tops: links.map(r => r.top) };
      });
      expect(boxes.gap).toBeGreaterThanOrEqual(boxes.reserve - 1);
      expect(new Set(boxes.tops).size).toBe(1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

test('navbar chooses both boundaries from the rendered contents, with no dead band', async ({ page }) => {
  await page.goto('/contact.html');
  await page.evaluate(() => document.fonts.ready);
  const sizes = await page.locator('.navbar').evaluate(n => {
    const row = n.querySelector('.container');
    const content = n.querySelector('.pf-nav-content');
    const tools = n.querySelector('.pf-nav-tools');
    const command = n.querySelector('[data-command-open]');
    const padding = getComputedStyle(row);
    return {
      full: content.getBoundingClientRect().width,
      command: command.getBoundingClientRect().width + parseFloat(getComputedStyle(tools).columnGap),
      brand: n.querySelector('.pf-brand-group').getBoundingClientRect().width,
      reserve: n.querySelector('[data-theme-toggle]').getBoundingClientRect().width,
      padding: parseFloat(padding.paddingLeft) + parseFloat(padding.paddingRight),
    };
  });
  // Find the actual available width in the browser; margins and scrollbar lanes
  // belong to shared CSS and can vary with the platform.
  for (const width of [780, 750, 745, 740, 730, 710, 700, 695, 690, 680, 670]) {
    await page.setViewportSize({ width, height: 900 });
    const available = await page.locator('.navbar > .container').evaluate(row => row.clientWidth);
    const room = available - sizes.padding - sizes.brand - sizes.reserve;
    const expected = room >= sizes.full ? 'full' : room >= sizes.full - sizes.command ? 'compact' : 'collapsed';
    await expect(page.locator('.navbar')).toHaveAttribute('data-nav-layout', expected);
  }
});

test('resize keeps keyboard focus on a visible control and preserves an open menu', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 850, height: 900 });
  await page.goto('/contact.html');
  const nav = page.locator('.navbar');
  const command = nav.getByRole('button', { name: 'Open command menu' });
  const theme = nav.locator('[data-theme-toggle]');
  const toggle = nav.getByRole('button', { name: 'Toggle navigation' });
  await expect(nav).toHaveAttribute('data-nav-layout', 'full');
  await command.focus();
  await page.setViewportSize({ width: 700, height: 900 });
  await expect(theme).toBeFocused();
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.locator('[data-command-palette]')).toBeVisible();
  await page.keyboard.press('Escape');
  await theme.focus();
  await page.setViewportSize({ width: 650, height: 900 });
  await expect(toggle).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(command).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Apps', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 850, height: 900 });
  await expect(nav.getByRole('link', { name: 'Home', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 650, height: 900 });
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('link', { name: 'Apps', exact: true })).toBeVisible();
  await toggle.click();
  await expect(nav.getByRole('link', { name: 'Apps', exact: true })).toBeHidden();
});

test('navbar remeasures after its label changes and when enlarged text no longer fits', async ({ page }) => {
  await page.setViewportSize({ width: 850, height: 900 });
  await page.goto('/contact.html');
  const nav = page.locator('.navbar');
  await expect(nav).toHaveAttribute('data-nav-layout', 'full');
  await nav.locator('.nav-link').first().evaluate(link => { link.textContent = 'Home and a much longer translated label'; });
  await expect(nav).toHaveAttribute('data-nav-layout', 'collapsed');
  await nav.locator('.nav-link').first().evaluate(link => { link.textContent = 'Home'; });
  await expect(nav).toHaveAttribute('data-nav-layout', 'full');
  await page.evaluate(() => { document.documentElement.style.fontSize = '24px'; });
  await expect(nav).toHaveAttribute('data-nav-layout', 'collapsed');
});

for (const [width, target] of [[700, '[data-theme-toggle]'], [650, '.navbar-toggler']]) test(`closing the command menu returns focus after resizing to ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width: 850, height: 900 });
  await page.goto('/contact.html');
  const nav = page.locator('.navbar');
  await expect(nav).toHaveAttribute('data-nav-layout', 'full');
  await nav.getByRole('button', { name: 'Open command menu' }).click();
  await page.setViewportSize({ width, height: 900 });
  await expect(nav).toHaveAttribute('data-nav-layout', width === 700 ? 'compact' : 'collapsed');
  await page.keyboard.press('Escape');
  await expect(nav.locator(target)).toBeFocused();
});
