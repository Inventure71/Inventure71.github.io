import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = new URL('../../', import.meta.url);

function readRepoFile(pathname) {
  return readFileSync(new URL(pathname, repoRoot), 'utf8');
}

function repoFileExists(pathname) {
  return existsSync(new URL(pathname, repoRoot));
}

function rootHtmlFiles() {
  return readdirSync(repoRoot)
    .filter((file) => file.endsWith('.html'))
    .filter((file) => !['f1-simulator.html', 'topbar-variants.html'].includes(file))
    .map((file) => ({ file, html: readRepoFile(file) }));
}

function projectDetailFiles() {
  const root = new URL('project_details/', repoRoot);
  return readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .map((file) => ({
      file: `project_details/${file}`,
      html: readFileSync(new URL(file, root), 'utf8'),
    }));
}

function playfolioHtmlFiles() {
  return [...rootHtmlFiles(), ...projectDetailFiles()];
}

describe('payload optimization contracts', () => {
  test('projects page does not eagerly request the simulator bundle or stylesheet', () => {
    const html = readRepoFile('projects.html');

    expect(html).not.toMatch(/<link[^>]+href="dist\/f1-simulator\/f1-simulator\.css/);
    expect(html).not.toMatch(/<script[^>]+src="dist\/f1-simulator\/f1-simulator\.js/);
    expect(html).toContain('dist/f1-simulator/paddock-placeholder.css?v=20260605-paddockjs-410');
    expect(html).toContain('data-paddock-script-src="dist/f1-simulator/f1-simulator.js?v=20260605-paddockjs-410"');
    expect(html).toContain('data-paddock-style-href="dist/f1-simulator/f1-simulator.css?v=20260605-paddockjs-410"');
    expect(html).toContain('data-paddock-auto-start="idle"');
    expect(html).toContain('data-paddock-auto-delay-ms="900"');
    expect(html).toContain('js/projects-race-loader.js');
  });

  test('projects page uses the package-owned startup placeholder for the pre-import gap', () => {
    const html = readRepoFile('projects.html');
    const css = readRepoFile('css/playfolio/race.css');

    expect(html).toContain('class="pf-paddock-preview paddock-placeholder"');
    expect(html).toContain('data-paddock-placeholder');
    expect(html).toContain('paddock-placeholder__lights');
    expect(html).toContain('paddock-placeholder__label');
    expect(css).toContain('--paddock-placeholder-min-height');
    expect(css).not.toContain('pf-paddock-preview__links');
  });

  test('projects race auto-starts after page load instead of blocking initial markup', () => {
    const loader = readRepoFile('js/projects-race-loader.js');

    expect(loader).toContain("window.addEventListener('load', callback, { once: true });");
    expect(loader).toContain("typeof window.requestIdleCallback === 'function'");
    expect(loader).toContain('scheduleAutoStart();');
    expect(loader).toContain("searchParams.get('raceAutoStart') === '0'");
  });

  test('home page does not ship an eager Codex ambassador WebM source', () => {
    const html = readRepoFile('index.html');

    expect(html).not.toMatch(/<source[^>]+\ssrc="\/assets\/brand\/codex\/codex-logo-ambassador-animated-compressed\.webm"/);
    expect(html).toContain('data-deferred-video');
    expect(html).toContain('data-src="/assets/brand/codex/codex-logo-ambassador-animated-compressed.webm"');
    expect(html).toContain('preload="none"');
  });

  test('Playfolio pages use site-core and route manifests instead of the full Bootstrap stylesheet', () => {
    const offenders = playfolioHtmlFiles()
      .filter(({ html }) => /href=["'](?:\.\.\/|\/)?css\/styles\.css/.test(html))
      .map(({ file }) => file);
    const missingCore = playfolioHtmlFiles()
      .filter(({ html }) => !/href=["'](?:\.\.\/|\/)?css\/site-core\.css/.test(html))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
    expect(missingCore).toEqual([]);
  });

  test('route CSS manifests stay scoped to their page surfaces', () => {
    const manifests = {
      'css/playfolio-home.css': ['motion.css', 'project-browse.css'],
      'css/playfolio-projects.css': ['race.css', 'project-race-guide.css'],
      'css/playfolio-project-detail.css': ['project-pages.css'],
      'css/playfolio-tags.css': ['tag-network.css'],
      'css/playfolio-directory.css': ['directory.css'],
      'css/playfolio-resume-page.css': ['resume.css'],
    };

    for (const [manifest, requiredImports] of Object.entries(manifests)) {
      expect(existsSync(join(repoRoot.pathname, manifest))).toBe(true);
      const css = readRepoFile(manifest);
      requiredImports.forEach((importPath) => expect(css).toContain(importPath));
    }

    expect(readRepoFile('css/playfolio-home.css')).not.toContain('race.css');
    expect(readRepoFile('css/playfolio-projects.css')).not.toContain('project-overrides.css');
    expect(readRepoFile('css/playfolio-project-detail.css')).not.toContain('project-overrides.css');
    expect(readRepoFile('css/playfolio-tags.css')).not.toContain('race.css');
  });

  test('shared command palette styles are available on every Playfolio route', () => {
    const routeManifests = [
      'css/playfolio-home.css',
      'css/playfolio-projects.css',
      'css/playfolio-project-detail.css',
      'css/playfolio-tags.css',
      'css/playfolio-directory.css',
      'css/playfolio-resume-page.css',
    ];

    routeManifests.forEach((manifest) => {
      expect(readRepoFile(manifest)).toContain('command-palette.css');
    });
    expect(readRepoFile('css/playfolio/command-palette.css')).toContain('.pf-command-overlay');
    expect(readRepoFile('css/playfolio/project-browse.css')).not.toContain('.pf-command-overlay');
  });

  test('legacy global stylesheets are not shipped', () => {
    const removedStylesheets = [
      'css/styles.css',
      'css/playfolio.css',
      'css/playfolio/vendor-overrides.css',
    ];

    const stillPresent = removedStylesheets.filter(repoFileExists);

    expect(stillPresent).toEqual([]);
  });

  test('restored source media is not referenced by Playfolio pages', () => {
    const sourceMedia = [
      '/assets/brand/codex/codex-logo-ambassador-animated.webm',
      '/assets/profile.png',
      '/assets/profile2.png',
      '/assets/profile_old.png',
      '/assets/brand/icons/ChatGPTIcon.png',
      '/assets/brand/icons/ClaudeIcon.png',
      '/assets/brand/icons/DeepSeek.png',
      '/assets/Cartoon Chaos Remix.png',
      '/assets/f1Car_base.png',
      '/assets/game/f1-broadcast-panel-surface.png',
      '/assets/game/f1-car-sprite-game.png',
      '/assets/game/f1-car-sprite.png',
      '/assets/game/f1-circuit-material-atlas.png',
      '/assets/game/f1-race-data-panel-base.png',
      '/assets/game/f1-safety-car-sprite.png',
      '/assets/game/f1-texture-asphalt.png',
      '/assets/game/f1-texture-grass.png',
      '/assets/game/f1-texture-gravel.png',
      '/assets/game/f1-texture-kerb.png',
      '/assets/game/f1Logo.png',
      '/assets/game/fia-f2-white.png',
      'assets/profile.png',
      'assets/profile2.png',
      'assets/profile_old.png',
      'assets/brand/icons/ChatGPTIcon.png',
      'assets/brand/icons/ClaudeIcon.png',
      'assets/brand/icons/DeepSeek.png',
      'assets/Cartoon Chaos Remix.png',
      'assets/f1Car_base.png',
      'assets/game/f1-broadcast-panel-surface.png',
      'assets/game/f1-car-sprite-game.png',
      'assets/game/f1-car-sprite.png',
      'assets/game/f1-circuit-material-atlas.png',
      'assets/game/f1-race-data-panel-base.png',
      'assets/game/f1-safety-car-sprite.png',
      'assets/game/f1-texture-asphalt.png',
      'assets/game/f1-texture-grass.png',
      'assets/game/f1-texture-gravel.png',
      'assets/game/f1-texture-kerb.png',
      'assets/game/f1Logo.png',
      'assets/game/fia-f2-white.png',
    ];
    const references = playfolioHtmlFiles().flatMap(({ file, html }) =>
      sourceMedia
        .filter((asset) => html.includes(asset))
        .map((asset) => `${file}: ${asset}`),
    );

    expect(references).toEqual([]);
  });
});
