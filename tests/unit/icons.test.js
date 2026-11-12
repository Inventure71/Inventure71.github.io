import { describe, expect, test } from 'vitest';
import { iconMarkup } from '../../js/playfolio/icons.js';

describe('inline icons', () => {
  test.each(['command', 'sun', 'moon', 'file-text', 'download'])('%s renders without an icon font', (name) => {
    const markup = iconMarkup(name);

    expect(markup).toContain('<svg class="pf-icon"');
    expect(markup).toContain('stroke="currentColor"');
    expect(markup).toContain('aria-hidden="true" focusable="false"');
    expect(markup).toContain('<path ');
    expect(markup).not.toContain('class="bi');
  });

  test('retains escaped classes and data hooks without overriding decoration', () => {
    const markup = iconMarkup('sun', {
      class: 'extra"class',
      'data-theme-current-icon': true,
      'data-label': 'A&B',
      'aria-hidden': false,
    });

    expect(markup).toContain('class="pf-icon extra&quot;class"');
    expect(markup).toContain('data-theme-current-icon=""');
    expect(markup).toContain('data-label="A&amp;B"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('aria-hidden="false"');
  });
});
