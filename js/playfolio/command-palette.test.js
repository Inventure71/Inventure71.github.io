import { describe, expect, test } from 'vitest';
import { buildCommandPaletteMarkup } from './command-palette.js';

describe('playfolio command palette markup', () => {
  test('escapes labels, hrefs, and keywords before rendering', () => {
    const markup = buildCommandPaletteMarkup([
      {
        label: 'A&B',
        description: '<desc>',
        href: '/path?a=1&b=2',
        keywords: 'alpha < beta',
      },
    ]);

    expect(markup).toContain('A&amp;B');
    expect(markup).toContain('&lt;desc&gt;');
    expect(markup).toContain('/path?a=1&amp;b=2');
    expect(markup).toContain('alpha &lt; beta');
  });
});
