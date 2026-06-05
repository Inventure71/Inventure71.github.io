import { describe, expect, test } from 'vitest';
import { readFileSync, statSync } from 'node:fs';

const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const foundationCss = readFileSync(new URL('../css/playfolio/foundation.css', import.meta.url), 'utf8');
const utilitiesCss = readFileSync(new URL('../css/playfolio/utilities.css', import.meta.url), 'utf8');

function extractRule(source, selector) {
  const start = source.indexOf(selector);
  expect(start).toBeGreaterThanOrEqual(0);

  const openingBrace = source.indexOf('{', start);
  const closingBrace = source.indexOf('}', openingBrace);
  expect(openingBrace).toBeGreaterThanOrEqual(0);
  expect(closingBrace).toBeGreaterThan(openingBrace);

  return source.slice(openingBrace + 1, closingBrace);
}

function declarationValue(rule, property) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  return match?.[1].trim() ?? null;
}

describe('home page loading budget', () => {
  test('uses compressed portrait cycle images instead of multi-megabyte PNG sources', () => {
    const portraitMarkup = indexHtml.match(/<img[^>]+data-portrait-cycle[^>]+>/s)?.[0] || '';

    expect(portraitMarkup).toContain('/assets/profile.webp');
    expect(portraitMarkup).toContain('/assets/profile2.webp');
    expect(portraitMarkup).not.toContain('/assets/profile.png');
    expect(portraitMarkup).not.toContain('/assets/profile2.png');

    for (const asset of ['../assets/profile.webp', '../assets/profile2.webp']) {
      const size = statSync(new URL(asset, import.meta.url)).size;
      expect(size).toBeLessThan(700 * 1024);
    }
  });

  test('allows home hero columns to shrink inside narrow mobile shells', () => {
    const heroChildRule = extractRule(foundationCss, '.pf-hero-grid > *');
    const mobileRules = utilitiesCss.slice(utilitiesCss.indexOf('@media (max-width: 640px)'));
    const mobileTitleRule = extractRule(mobileRules, '.pf-title');

    expect(declarationValue(heroChildRule, 'min-width')).toBe('0');
    expect(declarationValue(mobileTitleRule, 'max-width')).toBe('100%');
    expect(declarationValue(mobileTitleRule, 'font-size')).toBe('clamp(3rem, 18vw, 5rem)');
  });
});
