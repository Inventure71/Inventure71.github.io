import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const projectPagesCss = readFileSync(
  new URL('../../css/project-pages.css', import.meta.url),
  'utf8'
);
const projectPagesJs = readFileSync(new URL('../../js/project-pages.js', import.meta.url), 'utf8');
const appsHtml = readFileSync(new URL('../../apps.html', import.meta.url), 'utf8');

function extractBlock(source, startToken) {
  const start = source.indexOf(startToken);
  expect(start).toBeGreaterThanOrEqual(0);

  const openingBrace = source.indexOf('{', start);
  expect(openingBrace).toBeGreaterThanOrEqual(0);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(openingBrace + 1, index);
    }
  }

  throw new Error(`No closing brace found for ${startToken}`);
}

function declarationValue(rule, property) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  return match?.[1].trim() ?? null;
}

function projectHtmlFiles() {
  const root = new URL('../../project_details/', import.meta.url);
  return readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .map((file) => ({
      file,
      html: readFileSync(new URL(file, root), 'utf8'),
    }));
}

describe('project detail responsive media', () => {
  test('reserves a proportional mobile frame for project media instead of a fixed tall block', () => {
    const mediaBlock = extractBlock(projectPagesCss, '@media (max-width: 640px)');
    const stageRule = extractBlock(
      mediaBlock,
      '.project-media-stage'
    );

    expect(declarationValue(stageRule, 'min-height')).toBe('0');
    expect(declarationValue(stageRule, 'aspect-ratio')).toBe('16 / 10');
  });

  test('does not ship unsupported iframe permission tokens that create console noise', () => {
    const offenders = projectHtmlFiles()
      .filter(({ html }) => /allow="[^"]*web-share/.test(html))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  test('uses privacy-enhanced YouTube embeds for project videos', () => {
    const directYoutubeEmbeds = projectHtmlFiles()
      .filter(({ html }) => /https:\/\/www\.youtube\.com\/embed\//.test(html))
      .map(({ file }) => file);
    const nocookieEmbeds = projectHtmlFiles()
      .filter(({ html }) => /https:\/\/www\.youtube-nocookie\.com\/embed\//.test(html))
      .map(({ file }) => file);

    expect(nocookieEmbeds.length).toBeGreaterThan(0);
    expect(directYoutubeEmbeds).toEqual([]);
  });

  test('defers below-the-fold project video embeds through the lazy video path', () => {
    const eagerVideoFrames = projectHtmlFiles()
      .filter(({ html }) => /class="project-video-frame"[\s\S]*?<iframe\s+src=/.test(html))
      .map(({ file }) => file);

    expect(projectPagesJs).toContain('.project-video-frame iframe[data-src]');
    expect(eagerVideoFrames).toEqual([]);
  });

  test('hides placeholder media and collapses empty media layouts', () => {
    const placeholderImages = projectHtmlFiles().flatMap(({ file, html }) =>
      [...html.matchAll(/<img[^>]+debug-placeholder\.svg[^>]*>/g)].map((match) => ({
        file,
        prefix: html.slice(Math.max(0, match.index - 240), match.index),
      })),
    );
    const unmarked = placeholderImages
      .filter(({ prefix }) => !/data-placeholder-media[^>]*hidden|hidden[^>]*data-placeholder-media/.test(prefix))
      .map(({ file }) => file);

    expect(placeholderImages).toEqual([]);
    expect(unmarked).toEqual([]);
    expect(projectPagesJs).toContain("placeholderMedia: '[data-placeholder-media]'");
    expect(projectPagesJs).toContain("panel.classList.toggle('project-media-panel--without-media', !visibleStage)");
    expect(projectPagesJs).toContain("section.hidden = true");
    expect(projectPagesCss).toContain('.project-media-panel--without-media');
  });

  test('uses one scoped case-study stylesheet and neutralizes global card spacing', () => {
    const manifest = readFileSync(
      new URL('../../css/playfolio-project-detail.css', import.meta.url),
      'utf8'
    );

    expect(manifest).toContain('project-pages.css');
    expect(manifest).not.toContain('project-overrides.css');
    expect(projectPagesCss).toContain('.playfolio-page.project-page main > section > .container');
    expect(projectPagesCss).toContain('background: transparent !important');
    expect(projectPagesCss).toContain('.project-shell > section');
    expect(projectPagesCss).toContain('padding-block: 0');
  });

  test('makes the gallery modal keyboard-operable and restores focus', () => {
    expect(projectPagesJs).toContain("item.setAttribute('role', 'button')");
    expect(projectPagesJs).toContain('item.tabIndex = 0');
    expect(projectPagesJs).toContain("stage.setAttribute('role', 'button')");
    expect(projectPagesJs).toContain("stage.setAttribute('aria-haspopup', 'dialog')");
    expect(projectPagesJs).toContain("stage.dataset.zoomReady = 'true'");
    expect(projectPagesJs).toContain("event.key === 'Escape'");
    expect(projectPagesJs).toContain("event.key !== 'Enter' && event.key !== ' '");
    expect(projectPagesJs).toContain('previousFocus.focus');
    expect(projectPagesJs).toContain("child.setAttribute('inert', '')");
  });

  test('keeps project headings in a valid h1 to h2 to h3 hierarchy', () => {
    const offenders = projectHtmlFiles().flatMap(({ file, html }) => {
      const levels = [...html.matchAll(/<h([1-6])(?:\s|>)/g)].map((match) => Number(match[1]));
      const hasJump = levels.some((level, index) => index > 0 && level - levels[index - 1] > 1);
      return hasJump ? [file] : [];
    });

    expect(offenders).toEqual([]);
  });

  test('keeps retired WIP and debug placeholder components out of project markup', () => {
    const offenders = projectHtmlFiles()
      .filter(({ html }) => html.includes('project-wip') || html.includes('debug-placeholder.svg'))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  test('keeps the canonical template wired to project behavior and reduced motion', () => {
    const template = projectHtmlFiles().find(({ file }) => file === '_template.html')?.html ?? '';

    expect(template).toContain('project-pages.js');
    expect(template).toContain('<dl class="hero-meta"');
    expect(template).toContain('project-skip-link');
    expect(projectPagesCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(projectPagesJs).toContain("matchMedia?.('(prefers-reduced-motion: reduce)')");
  });

  test('uses purposeful motion without turning passive content into false controls', () => {
    const reducedMotionBlock = extractBlock(projectPagesCss, '@media (prefers-reduced-motion: reduce)');

    expect(projectPagesCss).toContain('.project-reading-progress');
    expect(projectPagesCss).toContain('.project-motion-ready .project-shell > .is-project-visible');
    expect(projectPagesCss).not.toContain('.sidecard-highlight li:hover');
    expect(projectPagesCss).not.toContain('.project-flow-step:hover');
    expect(projectPagesCss).not.toContain(
      '.project-shell > .project-section:not(.project-spotlight)::after'
    );
    expect(reducedMotionBlock).toContain('.project-reading-progress');
    expect(reducedMotionBlock).toContain('display: none');
    expect(projectPagesJs).toContain('function initReadingProgress');
    expect(projectPagesJs).toContain("'--project-read-progress'");
    expect(projectPagesJs).toContain('function initMediaDepth');
    expect(projectPagesJs).toContain("matchMedia?.('(pointer: fine)')");
  });

  test('uses a media-led feature stage without generic floating UI', () => {
    expect(projectPagesCss).toContain('.project-intro-stage');
    expect(projectPagesCss).toContain('minmax(18rem, 0.78fr) minmax(0, 1.22fr)');
    expect(projectPagesCss).toContain('.project-intro-panel');
    expect(projectPagesCss).toContain('.project-gallery');
    expect(projectPagesCss).toContain('scroll-snap-type: x mandatory');
    expect(projectPagesCss).not.toContain('counter-reset: project-chapter');
    expect(projectPagesCss).not.toContain('counter(project-item');
    expect(projectPagesCss).not.toContain('radial-gradient');
    expect(projectPagesCss).not.toContain('--project-glow-x');
    expect(projectPagesCss).not.toContain('.project-section-nav');
    expect(projectPagesJs).toContain('function initProjectIntroStage');
    expect(projectPagesJs).toContain("stage.className = 'project-intro-stage'");
    expect(projectPagesJs).toContain("adjacentPanel.classList.add('project-intro-panel')");
    expect(projectPagesJs).toContain('adjacentPanel.insertBefore(meta, sidecard || null)');
    expect(projectPagesJs).not.toContain('function initSectionNavigation');
    expect(projectPagesJs).not.toContain('function initInteractiveSurfaces');
  });

  test('keeps spotlight and inline-code colors inside the shared theme contract', () => {
    expect(projectPagesCss).toContain('--project-accent-text:');
    expect(projectPagesCss).toContain(
      '.playfolio-page.project-page .project-shell > .project-spotlight'
    );
    expect(projectPagesCss).toContain('.project-page :not(pre) > code');
    expect(projectPagesCss).toContain('color: var(--pf-ink)');
  });

  test('ships the researched case studies without synthetic placeholders or unsafe repository links', () => {
    const pages = new Map(projectHtmlFiles().map(({ file, html }) => [file, html]));
    const newCaseStudies = [
      'project-noty.html',
      'project-paddockjs.html',
      'project-dream2detect.html',
      'project-vigil.html',
      'project-contextkey.html',
      'project-unity.html',
      'project-mattyflow.html',
      'project-mosaic.html',
      'project-databases-ie.html',
      'project-ghoststroke.html',
    ];

    newCaseStudies.forEach((file) => {
      expect(pages.get(file)).toContain('project-page');
      expect(pages.get(file)).not.toContain('debug-placeholder.svg');
    });

    expect(pages.get('project-noty.html')).not.toContain('github.com/Inventure71/Noty');
    expect(pages.get('project-vigil.html')).not.toContain('github.com/Inventure71/VIGIL');
    expect(pages.get('project-contextkey.html')).not.toContain('github.com/Inventure71/ContextKey');
    expect(pages.get('project-unity.html')).not.toContain('github.com/Inventure71/ProjectUnity');
    expect(pages.get('project-mattyflow.html')).not.toContain('github.com/Inventure71/LocalFlow');
    expect(pages.get('project-mosaic.html')).toContain('github.com/Inventure71/SwarmProjectV1');
    expect(pages.get('project-databases-ie.html')).toContain('databases-project-ie.vercel.app');
    expect(pages.get('project-ghoststroke.html')).toContain('Notarized macOS utility');
    expect(pages.get('project-ghoststroke.html')).toContain('Gatekeeper');
    expect(pages.get('project-ghoststroke.html')).not.toContain('github.com/Inventure71/Ghoststroke');
    projectHtmlFiles().forEach(({ html }) => {
      expect(html).not.toContain('Creator Profile');
      expect(html).not.toContain('href="https://github.com/Inventure71"');
    });
  });

  test('lists Ghoststroke and Noty without exposing private or unavailable downloads', () => {
    expect(appsHtml).toContain('View Ghoststroke project');
    expect(appsHtml).toContain('View Noty project');
    expect(appsHtml).toContain('macOS · Notarized');
    expect(appsHtml).toContain('macOS · Release candidate');
    expect(appsHtml).not.toContain('github.com/Inventure71/Ghoststroke');
    expect(appsHtml).not.toContain('github.com/Inventure71/Noty');
  });
});
