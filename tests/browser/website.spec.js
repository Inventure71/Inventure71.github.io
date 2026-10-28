import { test, expect } from '@playwright/test';

const routes = ['/', '/projects.html?raceAutoStart=0', '/apps.html', '/resume.html', '/contact.html', '/tags.html'];
const quietNavigation = async (page, route) => {
  await page.goto(route, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-command-palette]')).toBeAttached();
};

async function trackMapFrames(page) {
  await page.addInitScript(() => {
    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.id === 'neuron-canvas') window.networkFrames = (window.networkFrames || 0) + 1;
      return clearRect.apply(this, args);
    };
  });
}
const mapFrames = page => page.evaluate(() => window.networkFrames || 0);

for (const width of [1440, 390]) {
  for (const theme of ['light', 'dark']) {
    test(`shared routes: ${width}px ${theme}, navigation, skip, command and theme`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.addInitScript((theme) => localStorage.setItem('mg-color-theme', theme), theme);
      for (const route of routes) {
        await quietNavigation(page, route);
        await page.evaluate(theme => window.MGTheme?.apply?.(theme), theme);
        await expect(page.locator('h1')).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
        await page.keyboard.press('Tab');
        await expect(skip).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#main-content')).toBeFocused();
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => Boolean(document.activeElement.closest('nav.navbar')))).toBe(false);
        if (width < 992) {
          const toggle = page.getByRole('button', { name: 'Toggle navigation' });
          await toggle.click();
          await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        }
        const nav = page.locator('nav.navbar');
        await expect(nav.getByRole('link', { name: 'Resume', exact: true })).toBeVisible();
        const before = await nav.boundingBox();
        const opener = page.getByRole('button', { name: 'Open command menu' });
        await opener.click();
        await expect(page.getByRole('dialog', { name: 'Command menu' })).toBeVisible();
        const during = await nav.boundingBox();
        expect(Math.abs(before.width - during.width)).toBeLessThanOrEqual(1);
        await page.keyboard.press('Escape');
        await expect(opener).toBeFocused();
        await expect(page.locator('html')).not.toHaveClass(/pf-command-open/);
        const currentTheme = await page.locator('html').getAttribute('data-theme');
        await page.locator('[data-theme-toggle]').click();
        await expect(page.locator('html')).toHaveAttribute('data-theme', currentTheme === 'dark' ? 'light' : 'dark');
      }
    });
  }
}

test('command search, arrow focus on real links, empty state, containment and navigation', async ({ page }) => {
  await quietNavigation(page, '/');
  await page.keyboard.press('Control+k');
  const search = page.getByRole('searchbox', { name: 'Search pages and projects' });
  await search.fill('university');
  const university = page.locator('[data-command-item]:visible');
  await expect(university).toHaveCount(1);
  await expect(university).toHaveAttribute('href', 'https://github.com/Inventure72');
  await search.press('ArrowDown');
  await expect(university).toBeFocused();
  await university.press('ArrowUp');
  await expect(university).toBeFocused();
  await university.press('Tab');
  await expect(search).toBeFocused();
  await search.fill('no-such-topic-765');
  await expect(page.getByText('No results. Try another project name or topic.')).toBeVisible();
  await search.press('Tab');
  await expect(search).toBeFocused();
  await search.fill('contact');
  await search.press('Enter');
  await expect(page).toHaveURL(/contact.html$/);
});

test('project image opens by keyboard, traps focus, Escape restores trigger and scrolling', async ({ page }) => {
  await quietNavigation(page, '/project_details/project-holovinyl.html');
  const image = page.getByRole('button', { name: /View larger image/ }).first();
  await image.focus();
  await image.press('Enter');
  const modal = page.getByRole('dialog', { name: 'Image preview' });
  const close = page.getByRole('button', { name: 'Close image preview' });
  await expect(modal).toBeVisible();
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await expect(page.locator('main')).toHaveAttribute('inert', '');
  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
  await expect(image).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert', '');
  expect(await page.locator('body').evaluate(el => el.style.overflow)).toBe('');
});

test('map topics share scene selection, keyboard focus, links, touch, readable geometry and reduced motion', async ({ page, browser }) => {
  await trackMapFrames(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await quietNavigation(page, '/tags.html');
  const topics = page.locator('.neuron-topic');
  expect(await topics.count()).toBeGreaterThan(50);
  await expect(topics.first()).toBeVisible();
  const geometry = await topics.evaluateAll(elements => {
    const rects = elements.map(el => el.getBoundingClientRect());
    const intro = document.querySelector('.neuron-ui').getBoundingClientRect();
    return { clearIntro: rects.every(r => r.top > intro.bottom), inBounds: rects.every(r => r.left >= 0 && r.right <= innerWidth), overlaps: rects.some((a, i) => rects.slice(i + 1).some(b => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top)) };
  });
  expect(geometry).toEqual({ clearIntro: true, inBounds: true, overlaps: false });
  await topics.first().focus();
  await topics.first().press('Enter');
  const panel = page.getByRole('dialog', { name: await topics.first().textContent() });
  const close = page.getByRole('button', { name: 'Close panel' });
  await expect(panel).toBeVisible();
  await expect(close).toBeFocused();
  await expect(panel.getByRole('link').first()).toHaveAttribute('href', /project_details\//);
  await close.press('Shift+Tab');
  await expect(panel.getByRole('link').last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(topics.first()).toBeFocused();
  await page.evaluate(async () => { await document.fonts.ready; await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
  const frames = await mapFrames(page);
  await page.waitForTimeout(300);
  expect(await mapFrames(page)).toBe(frames);
  await page.screenshot({ path: 'output/playwright/map-mobile-reduced.png' });

  const touch = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const touchPage = await touch.newPage();
  await quietNavigation(touchPage, '/tags.html');
  await touchPage.locator('.neuron-topic').first().tap();
  await expect(touchPage.getByRole('button', { name: 'Close panel' })).toBeFocused();
  await touchPage.getByRole('button', { name: 'Close panel' }).tap();
  await expect(touchPage.locator('.neuron-topic').first()).toBeFocused();
  await touch.close();

  // The canvas must not select another node behind a desktop dialog and
  // overwrite the background's original inert state.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await quietNavigation(page, '/tags.html');
  const firstTopic = page.locator('.neuron-topic').first();
  const topicBox = await firstTopic.boundingBox();
  await firstTopic.click();
  await page.mouse.move(topicBox.x + topicBox.width / 2, topicBox.y + 42);
  await page.mouse.click(topicBox.x + topicBox.width / 2, topicBox.y + 42);
  await page.keyboard.press('Escape');
  await expect(firstTopic).toBeFocused();
  await expect(page.locator('nav.navbar')).not.toHaveAttribute('inert', '');
  await expect(page.locator('.neuron-topics')).not.toHaveAttribute('inert', '');
  await expect(page.locator('#neuron-canvas')).not.toHaveAttribute('inert', '');
});

test('map nodes float gently in place at a bounded frame rate and pause offscreen', async ({ page }) => {
  await trackMapFrames(page);
  await quietNavigation(page, '/tags.html');
  const map = page.locator('.neuron-container');
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => await mapFrames(page)).toBeGreaterThan(20);
  await page.waitForTimeout(2200);
  const before = await page.locator('.neuron-topic').evaluateAll(elements => elements.map(el => {
    const box = el.getBoundingClientRect(); return { x: box.x, y: box.y };
  }));
  const floating = await mapFrames(page);
  await page.waitForTimeout(750);
  const draws = await mapFrames(page) - floating;
  expect(draws).toBeGreaterThan(2);
  expect(draws).toBeLessThanOrEqual(25);
  const displacement = await page.locator('.neuron-topic').evaluateAll((elements, before) => elements.map((el, i) => {
    const box = el.getBoundingClientRect(); return Math.hypot(box.x - before[i].x, box.y - before[i].y);
  }), before);
  expect(displacement.some(distance => distance > 0.1)).toBe(true);
  expect(Math.max(...displacement)).toBeLessThan(16);
  await page.evaluate(() => { document.querySelector('footer').style.minHeight = '1200px'; window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }); });
  await expect.poll(async () => { const box = await map.boundingBox(); return box.y + box.height; }).toBeLessThanOrEqual(0);
  const offscreen = await mapFrames(page);
  await page.waitForTimeout(300);
  expect(await mapFrames(page)).toBe(offscreen);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(async () => await mapFrames(page)).toBeGreaterThan(offscreen);
  console.log(`map float: ${draws} draws in 750ms; zero draws while offscreen`);
});

test('dragged map topics push their neighbors and both return home without opening a panel', async ({ page }) => {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    await page.emulateMedia({ reducedMotion });
    await quietNavigation(page, '/tags.html');
    const topic = page.locator('.neuron-topic').first();
    await expect(topic).toBeVisible();
    // Late font stylesheets can reflow the intro and move the whole graph.
    await page.waitForLoadState('load');
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const original = await topic.boundingBox();
    const neighbor = page.locator('.neuron-topic').nth(1);
    const neighborOriginal = await neighbor.boundingBox();
    const x = original.x + original.width / 2, y = original.y + 42;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(neighborOriginal.x + neighborOriginal.width / 2 - 20, neighborOriginal.y + 42, { steps: 8 });
    await expect.poll(async () => (await topic.boundingBox()).x - original.x).toBeGreaterThan(100);
    const neighborDistance = async () => {
      const current = await neighbor.boundingBox();
      return Math.hypot(current.x - neighborOriginal.x, current.y - neighborOriginal.y);
    };
    await expect.poll(neighborDistance).toBeGreaterThan(25);
    await page.mouse.up();
    await expect(page.locator('.neuron-overlay')).not.toHaveClass(/active/);
    const distance = async () => {
      const current = await topic.boundingBox();
      return Math.hypot(current.x - original.x, current.y - original.y);
    };
    if (reducedMotion === 'no-preference') expect(await distance()).toBeGreaterThan(50);
    await expect.poll(distance).toBeLessThan(14);
    await expect.poll(neighborDistance).toBeLessThan(14);
  }
});

test('Ghostyper pause survives visibility changes and resumes; reduced motion shows static original', async ({ page }) => {
  await quietNavigation(page, '/project_details/project-ghoststroke.html');
  const demo = page.locator('[data-gs-demo]');
  const toggle = page.locator('[data-gs-toggle]');
  await demo.scrollIntoViewIfNeeded();
  await expect(demo).toHaveAttribute('data-playing', 'true');
  await toggle.click();
  await expect(demo).toHaveAttribute('data-playing', 'false');
  await expect(toggle).toHaveText('Resume demonstration');
  const text = await page.locator('[data-gs-text]').textContent();
  await page.waitForTimeout(500);
  expect(await page.locator('[data-gs-text]').textContent()).toBe(text);
  await page.locator('footer').scrollIntoViewIfNeeded();
  await toggle.scrollIntoViewIfNeeded();
  await expect(demo).toHaveAttribute('data-playing', 'false');
  await toggle.click();
  await expect(demo).toHaveAttribute('data-playing', 'true');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(demo).toHaveAttribute('data-playing', 'false');
  await expect(toggle).toBeDisabled();
  await expect(page.locator('[data-gs-text]')).toHaveText(await page.locator('[data-gs-original]').textContent());
});

test('actual renderer startup failure releases controls; retry reuses cached module and creates a working race', async ({ page }) => {
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  let imports = 0;
  page.on('request', req => { if (req.url().includes('/f1-simulator.js')) imports++; });
  await page.addInitScript(() => {
    window.failRaceRenderer = true;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (window.failRaceRenderer && /webgl/.test(type)) throw new Error('Controlled renderer failure');
      return getContext.call(this, type, ...args);
    };
  });
  await quietNavigation(page, '/projects.html?raceAutoStart=1');
  const shell = page.locator('[data-paddock-shell]');
  await expect(shell).toHaveAttribute('data-simulator-state', 'error', { timeout: 20000 });
  await expect(shell).toHaveAttribute('aria-busy', 'false');
  const retry = page.getByRole('button', { name: 'Retry live race' });
  await expect(retry).toBeVisible();
  await expect(retry).toBeEnabled();
  await expect(page.locator('[data-paddock-preview]')).toBeHidden();
  await expect(page.locator('#paddock-race-root')).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('#paddock-race-root')).toBeEmpty();
  await page.evaluate(() => { window.failRaceRenderer = false; });
  await retry.click();
  await expect(shell).toHaveAttribute('data-simulator-state', 'ready', { timeout: 30000 });
  await expect(shell).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('[data-paddock-error]')).toBeHidden();
  await expect(page.locator('[data-paddock-preview]')).toBeHidden();
  await expect(page.locator('#paddock-race-root')).toHaveAttribute('aria-hidden', 'false');
  await expect(page.locator('#paddock-race-root canvas')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Start race', exact: true })).toBeEnabled();
  await expect(page.getByRole('combobox', { name: 'Jump to grid entry' })).toHaveValue('core');
  await expect(page.locator('[data-grid-project-banner] a')).toHaveAttribute('href', '/project_details/project-gengame.html');
  expect(imports).toBe(1);
  expect(errors.some(message => message.includes('Controlled renderer failure'))).toBe(true);
  expect(errors.some(message => message.includes('cleanup failed'))).toBe(false);
  await page.screenshot({ path: 'output/playwright/race-retry.png' });
});

test('standalone simulator still auto-mounts', async ({ page }) => {
  await page.goto('/f1-simulator.html');
  await expect(page.locator('#f1-simulator-root canvas')).toHaveCount(1, { timeout: 30000 });
  expect(await page.locator('#f1-simulator-root').getAttribute('data-simulator-state')).not.toBe('error');
  await expect(page.getByRole('button', { name: 'Start race', exact: true })).toBeEnabled();
});

test('mobile navigation follows the real Apps anchor and closes correctly on the new route', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await quietNavigation(page, '/');
  const toggle = page.getByRole('button', { name: 'Toggle navigation' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.navbar').getByRole('link', { name: 'Apps', exact: true }).click();
  await expect(page).toHaveURL(/apps.html$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Apps' })).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#navbarSupportedContent')).toBeHidden();
});

test('corrected dates and Ghostyper controls at desktop/narrow sizes in both themes', async ({ page }) => {
  for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme: theme });
    await page.addInitScript(theme => localStorage.setItem('mg-color-theme', theme), theme);
    await quietNavigation(page, '/project_details/project-drsorrisodonations.html');
    await expect(page.locator('.story-meta')).toContainText('March 2023–February 2025');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await quietNavigation(page, '/project_details/project-ghoststroke.html');
    const toggle = page.locator('[data-gs-toggle]');
    await toggle.scrollIntoViewIfNeeded();
    await toggle.focus();
    await toggle.press('Enter');
    await expect(page.locator('[data-gs-demo]')).toHaveAttribute('data-playing', 'false');
    await expect(toggle).toHaveText('Resume demonstration');
    await page.screenshot({ path: `output/playwright/ghostyper-${width}-${theme}.png` });
    await toggle.press('Enter');
    await expect(page.locator('[data-gs-demo]')).toHaveAttribute('data-playing', 'true');
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await expect(toggle).toBeDisabled();
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'no-preference' });
  }
});

test('sitemap routes, canonical URLs and social images resolve; templates and Matrices retain indexing policy', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBe(true);
  const xml = await sitemap.text();
  expect(xml).not.toContain('lastmod');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(urls).toHaveLength(27);
  expect(urls).toContain('https://mgiorgetti.com/');
  for (const url of urls) {
    expect(url.startsWith('https://mgiorgetti.com/')).toBe(true);
    const response = await request.get(new URL(url).pathname);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain(`<link rel="canonical" href="${url}"`);
    expect(html).toContain(`<meta property="og:url" content="${url}"`);
    const image = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
    expect(image?.startsWith('https://mgiorgetti.com/assets/')).toBe(true);
    expect((await request.get(new URL(image).pathname)).ok()).toBe(true);
  }
  expect(await (await request.get('/project_details/_template.html')).text()).toContain('content="noindex, nofollow"');
  expect(await (await request.get('/MatricesProject/')).text()).toContain('rel="canonical" href="https://inventure72.github.io/MatricesProject/"');
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://mgiorgetti.com/sitemap.xml');
});
