import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/project-race-guide.css', import.meta.url), 'utf8');

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

function ruleIn(source, selector) {
  return extractBlock(source, selector);
}

function declarationValue(rule, property) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  return match?.[1].trim() ?? null;
}

describe('project race guide responsive layout', () => {
  test('keeps the flag attached to the guide copy on narrow screens', () => {
    const mobileRules = extractBlock(css, '@media (max-width: 720px)');
    const copyRule = ruleIn(mobileRules, '.pf-race-guide__copy');
    const markerRule = ruleIn(mobileRules, '.pf-race-guide__marker');
    const markerPoleRule = ruleIn(mobileRules, '.pf-race-guide__marker::after');

    expect(declarationValue(copyRule, 'grid-template-columns')).toBe('auto minmax(0, 1fr)');
    expect(declarationValue(copyRule, 'align-items')).toBe('start');
    expect(declarationValue(markerRule, 'width')).toMatch(/^clamp\(/);
    expect(declarationValue(markerRule, 'height')).toMatch(/^clamp\(/);
    expect(declarationValue(markerPoleRule, 'right')).toBe('-0.68rem');
  });
});
