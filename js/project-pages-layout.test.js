import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

const projectOverridesCss = readFileSync(
  new URL('../css/playfolio/project-overrides.css', import.meta.url),
  'utf8'
);
const projectPagesJs = readFileSync(new URL('./project-pages.js', import.meta.url), 'utf8');

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
  const root = new URL('../project_details/', import.meta.url);
  return readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .map((file) => ({
      file,
      html: readFileSync(new URL(file, root), 'utf8'),
    }));
}

describe('project detail responsive media', () => {
  test('reserves a proportional mobile frame for project media instead of a fixed tall block', () => {
    const mediaBlock = extractBlock(projectOverridesCss, '@media (max-width: 640px)');
    const stageRule = extractBlock(
      mediaBlock,
      '.playfolio-page.project-page .project-media-stage'
    );

    expect(declarationValue(stageRule, 'min-height')).toBe('0');
    expect(declarationValue(stageRule, 'aspect-ratio')).toBe('16 / 9');
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
});
