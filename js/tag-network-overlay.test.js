import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../tags.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/tag-network.css', import.meta.url), 'utf8');
const script = readFileSync(new URL('./neuron-brain.js', import.meta.url), 'utf8');

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
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }

  throw new Error(`No closing brace found for ${startToken}`);
}

function declarationValue(rule, property) {
  const match = rule.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  return match?.[1].trim() ?? null;
}

describe('tag network overlay closed state', () => {
  test('starts hidden from assistive tech and focus order', () => {
    expect(html).toContain('id="neuron-overlay" aria-hidden="true" aria-labelledby="overlay-title" inert');
  });

  test('does not accept pointer interaction while closed', () => {
    const closedRule = extractBlock(css, '.neuron-overlay');
    const activeRule = extractBlock(css, '.neuron-overlay.active');

    expect(declarationValue(closedRule, 'pointer-events')).toBe('none');
    expect(declarationValue(activeRule, 'pointer-events')).toBe('auto');
  });

  test('toggles accessibility state with the visible panel state', () => {
    expect(script).toContain("overlay.removeAttribute('aria-hidden');");
    expect(script).toContain('overlay.inert = false;');
    expect(script).toContain("overlay.setAttribute('aria-hidden', 'true');");
    expect(script).toContain('overlay.inert = true;');
  });
});
