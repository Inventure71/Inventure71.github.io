import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { syncSiteRuntime } from '../../scripts/sync-site-runtime.mjs';

const fixtures = [];
afterEach(() => fixtures.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

test('all public page runtime links match the current build', () => {
  expect(syncSiteRuntime()).toEqual({ count: 32, changed: [] });
});

test('runtime regeneration supports nested routes and invalidates changed startup assets', () => {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'site-runtime-'));
  fixtures.push(rootDir);
  for (const dir of ['dist/site', 'js', 'project_details']) mkdirSync(path.join(rootDir, dir), { recursive: true });
  const bundle = path.join(rootDir, 'dist/site/playfolio.js');
  const boot = path.join(rootDir, 'js/theme-boot.js');
  writeFileSync(bundle, 'console.log("runtime");');
  writeFileSync(boot, 'document.documentElement.classList.add("has-js");');
  writeFileSync(path.join(rootDir, 'js/navigation-pointer.js'), 'window.MGNavigationPointer = { current: null };');
  const filename = path.join(rootDir, 'project_details/project-example.html');
  writeFileSync(filename, `<head><meta charset="utf-8"><script src="../js/theme-boot.js"></script></head><body class="playfolio-page">
<script type="module" src="../js/playfolio.js"></script>
<script type="module" src="../js/resume-page.js"></script></body>`);
  expect(syncSiteRuntime({ rootDir }).changed).toEqual(['project_details/project-example.html']);
  syncSiteRuntime({ rootDir, write: true });
  const generated = readFileSync(filename, 'utf8');
  expect(generated).toMatch(/src="\/dist\/site\/playfolio\.js\?v=[a-f0-9]{12}"/);
  expect(generated).toContain('<!-- site-boot -->');
  expect(generated).toContain('window.MGNavigationPointer');
  expect(generated.indexOf('<!-- site-boot -->')).toBeLessThan(generated.indexOf('</head>'));
  expect(generated).not.toContain('src="../js/theme-boot.js"');
  expect(generated).not.toContain('resume-page.js');
  expect(syncSiteRuntime({ rootDir }).changed).toEqual([]);
  writeFileSync(bundle, 'console.log("changed runtime");');
  expect(syncSiteRuntime({ rootDir }).changed).toHaveLength(1);
  syncSiteRuntime({ rootDir, write: true });
  writeFileSync(boot, 'console.log("changed boot");');
  expect(syncSiteRuntime({ rootDir }).changed).toHaveLength(1);
});
