import { describe, expect, test } from 'vitest';
import { buildProjectRaceGuideMarkup } from '../../js/project-race-guide.js';

describe('project race guide component', () => {
  test('explains car selection with compact decorative flags and no mode-switch copy', () => {
    const markup = buildProjectRaceGuideMarkup();

    expect(markup).toContain('class="pf-race-guide"');
    expect(markup).toContain('Each car is a project.');
    expect(markup).toContain('<strong>Click a car</strong>');
    expect(markup).toContain('to explore it.');
    expect(markup).not.toContain('Stop race');
    expect(markup).not.toContain('Start race');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('pf-race-guide__hints');
  });

  test('escapes custom copy before rendering', () => {
    const markup = buildProjectRaceGuideMarkup({
      lead: '<script>bad()</script>',
      action: 'Click & inspect',
      tail: 'then read "notes"',
    });

    expect(markup).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(markup).toContain('Click &amp; inspect');
    expect(markup).toContain('then read &quot;notes&quot;');
  });
});
