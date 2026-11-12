import { test, expect } from '@playwright/test';
import { projects } from '../../js/playfolio/project-catalog.js';

test('public agent resources are served as text and discovered without visible navigation', async ({ request, page }) => {
  const index = await request.get('/llms.txt');
  expect(index.ok()).toBe(true);
  expect(index.headers()['content-type']).toContain('text/plain');
  const directory = await index.text();
  const profile = await request.get('/profile.md');
  expect(profile.ok()).toBe(true);
  expect(profile.headers()['content-type']).toContain('text/markdown');
  expect(await profile.text()).toContain('https://www.linkedin.com/in/matteo-giorgetti-026172247/');
  for (const project of projects) {
    const path = `/projects/${project.id}.md`;
    expect(directory).toContain(path);
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    const text = await response.text();
    expect(text).toContain(`# ${project.label}`);
    expect(text).toContain('## Contribution');
    expect(text).toContain('## Results and limitations');
    expect(text).not.toMatch(/\/Users\/|career-materials|file:\/\//);
  }
  for (const route of ['/', '/projects.html?raceAutoStart=0', '/resume.html', projects[0].href]) {
    await page.goto(route);
    await expect(page.locator('head link[rel="describedby"][href="https://mgiorgetti.com/llms.txt"]')).toHaveCount(1);
    await expect(page.locator('body a[href$=".md"], body a[href$="llms.txt"]')).toHaveCount(0);
  }
});
