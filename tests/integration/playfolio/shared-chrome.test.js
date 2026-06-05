import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { syncSharedNavbar } from '../../../scripts/sync-shared-chrome.mjs';
import {
  buildSharedFooterMarkup,
  buildSharedNavbarMarkup,
  currentNavKey,
} from '../../../js/playfolio/shared-chrome.js';

function collectHtmlFiles(dir, root = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || ['dist', 'node_modules'].includes(entry.name)) return [];

    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectHtmlFiles(absolutePath, root);
    if (!entry.isFile() || !entry.name.endsWith('.html')) return [];

    return [path.relative(root, absolutePath)];
  });
}

describe('playfolio shared chrome', () => {
  test('maps project-like routes to the projects nav key', () => {
    expect(currentNavKey('/project_details/project-victoria.html')).toBe('projects');
    expect(currentNavKey('/projects.html')).toBe('projects');
    expect(currentNavKey('/tags.html')).toBe('projects');
  });

  test('maps simple page routes to their own nav keys', () => {
    expect(currentNavKey('/resume.html')).toBe('resume');
    expect(currentNavKey('/contact.html')).toBe('contact');
    expect(currentNavKey('/')).toBe('home');
  });

  test('builds the shared navbar with active state and shared controls', () => {
    const markup = buildSharedNavbarMarkup('apps');

    expect(markup).toContain('Ask AI');
    expect(markup).toContain('data-command-open');
    expect(markup).toContain('data-theme-toggle');
    expect(markup).toContain('data-glass-group');
    expect(markup).toContain('data-glass-item');
    expect(markup).toContain('data-glass-tone="brand">MG</a>');
    expect(markup).toContain('data-glass-tone="mode-preview"');
    expect(markup).toContain('data-theme-current-icon');
    expect(markup).toContain('data-theme-preview-icon');
    expect(markup).not.toContain('pf-glass-mode-bead');
    expect(markup).toContain('href="/apps.html" data-glass-item data-glass-tone="blue">Apps</a>');
    expect(markup).toContain('nav-link active');
  });

  test('all Playfolio pages use the shared navbar render path', () => {
    const playfolioPages = collectHtmlFiles(process.cwd()).filter((file) => {
      const html = readFileSync(path.join(process.cwd(), file), 'utf8');
      return html.includes('playfolio-page');
    });
    const violations = playfolioPages.filter((file) => {
      const html = readFileSync(path.join(process.cwd(), file), 'utf8');
      return !html.includes('<nav class="navbar navbar-expand-lg pf-reactive-glass pf-reactive-glass--site-bloom"') ||
        !html.includes('data-glass-item') ||
        !html.includes('data-theme-toggle') ||
        !/src=["'][^"']*js\/playfolio\.js(?:\?[^"']*)?["']/.test(html);
    });

    expect(playfolioPages.length).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });

  test('static Playfolio navbars are synced from the shared markup builder', () => {
    const result = syncSharedNavbar({ write: false });

    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.missing).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  test('site core reserves the vertical scrollbar gutter for stable centered chrome', () => {
    const siteCoreCss = readFileSync(path.join(process.cwd(), 'css/site-core.css'), 'utf8');

    expect(siteCoreCss).toMatch(/html\s*{[\s\S]*scrollbar-gutter:\s*stable/);
    expect(siteCoreCss).toMatch(/html\s*{[\s\S]*overflow-y:\s*scroll/);
  });

  test('builds the shared footer with the canonical shared links', () => {
    const markup = buildSharedFooterMarkup();

    expect(markup).toContain('GitHub');
    expect(markup).toContain('LinkedIn');
    expect(markup).toContain('Resume PDF');
  });
});
