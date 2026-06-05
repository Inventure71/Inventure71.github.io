import { describe, expect, test } from 'vitest';
import { buildProjectRaceGuideMarkup } from '../../js/project-race-guide.js';

describe('project race guide component', () => {
  test('renders the default project race explanation and hints', () => {
    const markup = buildProjectRaceGuideMarkup();

    expect(markup).toContain('class="pf-race-guide"');
    expect(markup).toContain('Each car is a project.');
    expect(markup).toContain('<strong>Click a car</strong>');
    expect(markup).toContain('Cars = projects');
    expect(markup).toContain('Click / hover for details');
    expect(markup).not.toContain('Leaderboard = quick links');
    expect(markup).toContain('Pick a car from the grid');
  });

  test('escapes custom copy before rendering', () => {
    const markup = buildProjectRaceGuideMarkup({
      lead: '<script>bad()</script>',
      action: 'Click & inspect',
      tail: 'then read "notes"',
      cue: "Driver's pick",
      hints: [{ icon: '<', text: 'Cars > cards' }],
    });

    expect(markup).toContain('&lt;script&gt;bad()&lt;/script&gt;');
    expect(markup).toContain('Click &amp; inspect');
    expect(markup).toContain('then read &quot;notes&quot;');
    expect(markup).toContain('Driver&#39;s pick');
    expect(markup).toContain('&lt;');
    expect(markup).toContain('Cars &gt; cards');
  });
});
