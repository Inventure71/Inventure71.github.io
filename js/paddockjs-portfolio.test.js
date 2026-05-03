import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const sourcePath = fileURLToPath(new URL('./paddockjs-portfolio.js', import.meta.url));
const cssPath = fileURLToPath(new URL('../css/playfolio.css', import.meta.url));

describe('PaddockJS project race integration', () => {
  test('uses the package-owned telemetry drawer instead of detached safety controls', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('mountRaceTelemetryDrawer');
    expect(source).toContain('raceDataTelemetryDetail');
    expect(source).toContain("enabled: ['project', 'radio']");
    expect(source).not.toContain('mountRaceCanvas');
    expect(source).not.toContain('mountSafetyCarControl');
    expect(source).not.toContain('mountTimingTower');
    expect(source).not.toContain('paddock-safety-root');
  });

  test('lets the package drawer controls stay anchored while the race fills the host mount', () => {
    const css = readFileSync(cssPath, 'utf8');

    expect(css).toContain('.pf-paddock-grid');
    expect(css).toContain('display: grid');
    expect(css).toContain('.pf-paddock-race .race-telemetry-drawer');
    expect(css).toContain('padding: 0 !important');
    expect(css).not.toContain('.race-telemetry-drawer.is-telemetry-open .race-telemetry-drawer__controls');
    expect(css).not.toContain('right: calc(var(--telemetry-drawer-width) + 1rem)');
  });

});
