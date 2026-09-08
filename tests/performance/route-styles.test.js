import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { renderRouteStyles, syncRouteStyles } from '../../scripts/sync-route-styles.mjs';

const fixtures = [];
afterEach(() => fixtures.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

test('all route links match their manifests without adding a CSS discovery waterfall', () => {
  const result = syncRouteStyles();
  expect(result.count).toBe(27);
  expect(result.changed).toEqual([]);
});

test('regeneration preserves cascade order, resolves nested paths and detects changed dependencies', () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'route-styles-'));
  fixtures.push(rootDir);
  mkdirSync(path.join(rootDir, 'css'));
  mkdirSync(path.join(rootDir, 'project_details'));
  for (const name of ['first.css', 'second.css']) writeFileSync(path.join(rootDir, 'css', name), 'body {}');
  const manifest = path.join(rootDir, 'css/playfolio-test.css');
  writeFileSync(manifest, '@import url("./first.css");\n@import url("./second.css?v=2");');
  const page = path.join(rootDir, 'project_details/project-test.html');
  writeFileSync(page, '<link href="../css/playfolio-test.css?old=1" rel="stylesheet" /><body class="playfolio-page"></body>');
  expect(syncRouteStyles({ rootDir }).changed).toEqual(['project_details/project-test.html']);
  syncRouteStyles({ rootDir, write: true });
  const html = readFileSync(page, 'utf8');
  expect(html.indexOf('/css/first.css')).toBeLessThan(html.indexOf('/css/second.css?v=2'));
  expect(html).not.toContain('href="../css/playfolio-test.css');
  expect(syncRouteStyles({ rootDir }).changed).toEqual([]);
  writeFileSync(manifest, '@import url("./second.css?v=3");');
  expect(syncRouteStyles({ rootDir }).changed).toHaveLength(1);
  writeFileSync(manifest, '@import url("./missing.css");');
  expect(() => renderRouteStyles('/css/playfolio-test.css', rootDir)).toThrow('Missing local stylesheet');
  writeFileSync(manifest, '@import url("./first.css"); body { color: red; }');
  expect(() => renderRouteStyles('/css/playfolio-test.css', rootDir)).toThrow('import-only');
});
