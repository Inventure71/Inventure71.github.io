import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { renderSiteIcons, syncSiteIcons } from '../../scripts/sync-site-icons.mjs';
import { iconMarkup } from '../../js/playfolio/icons.js';

const temporaryRoots = [];
afterEach(() => temporaryRoots.splice(0).forEach((root) => rmSync(root, { recursive: true, force: true })));

describe('site icon migration', () => {
  test('converts decorative icons and removes only their font stylesheet', () => {
    const html = '<link href="/css/site-core.css" rel="stylesheet" />\n' +
      '<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.8.1/font/bootstrap-icons.css" rel="stylesheet" />\n' +
      '<a aria-label="View GitHub"><i class="bi bi-github extra" data-contact-icon></i></a>';
    const converted = renderSiteIcons(html);

    expect(converted).toBe('<link href="/css/site-core.css" rel="stylesheet" />\n' +
      `<a aria-label="View GitHub">${iconMarkup('github', { class: 'extra', 'data-contact-icon': true })}</a>`);
    expect(renderSiteIcons(converted)).toBe(converted);
  });

  test('rejects an unsupported icon before removing its stylesheet', () => {
    expect(() => renderSiteIcons('<i class="bi bi-not-a-site-icon"></i>')).toThrow('Unknown icon');
    expect(() => renderSiteIcons('<i class="bi bi-flag">unconverted</i>')).toThrow('Unconverted');
  });

  test('limits migration to public Playfolio routes and supports a read-only check', () => {
    const rootDir = mkdtempSync(path.join(os.tmpdir(), 'site-icons-'));
    temporaryRoots.push(rootDir);
    const source = '<body class="playfolio-page"><i class="bi bi-arrow-right"></i></body>';
    const excluded = ['topbar-variants.html', 'f1-simulator.html', 'output/example.html', 'experiments/example.html', 'node_modules/package/index.html'];
    for (const file of ['index.html', 'project_details/project-example.html', ...excluded]) {
      mkdirSync(path.dirname(path.join(rootDir, file)), { recursive: true });
      writeFileSync(path.join(rootDir, file), source);
    }
    writeFileSync(path.join(rootDir, 'plain.html'), '<body><i class="bi bi-arrow-right"></i></body>');

    const checked = syncSiteIcons({ rootDir });
    expect(checked.pages.sort()).toEqual(['index.html', 'project_details/project-example.html']);
    expect(checked.changed).toHaveLength(2);
    expect(readFileSync(path.join(rootDir, 'index.html'), 'utf8')).toBe(source);

    syncSiteIcons({ rootDir, write: true });
    expect(syncSiteIcons({ rootDir }).ok).toBe(true);
    excluded.forEach((file) => expect(readFileSync(path.join(rootDir, file), 'utf8')).toBe(source));
  });
});
