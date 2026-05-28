import { describe, expect, test } from 'vitest';
import { buildSharedFooterMarkup, buildSharedNavbarMarkup, currentNavKey } from './shared-chrome.js';

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
    expect(markup).toContain('href="/apps.html">Apps</a>');
    expect(markup).toContain('nav-link active');
  });

  test('builds the shared footer with the canonical shared links', () => {
    const markup = buildSharedFooterMarkup();

    expect(markup).toContain('GitHub');
    expect(markup).toContain('LinkedIn');
    expect(markup).toContain('Resume PDF');
  });
});
