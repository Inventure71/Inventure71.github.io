import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import { PORTFOLIO_DRIVERS, PORTFOLIO_ENTRIES } from '../../js/portfolio-race-data.js';

const sourcePath = fileURLToPath(new URL('../../js/paddockjs-portfolio.js', import.meta.url));
const themeSyncPath = fileURLToPath(new URL('../../js/paddockjs-theme-sync.js', import.meta.url));
const bootStatePath = fileURLToPath(new URL('../../js/paddockjs-boot-state.js', import.meta.url));
const projectsCssPath = fileURLToPath(new URL('../../css/playfolio-projects.css', import.meta.url));
const raceCssPath = fileURLToPath(new URL('../../css/playfolio/race.css', import.meta.url));

describe('PaddockJS project race integration', () => {
  test('includes the researched portfolio entries without private Safeway data', () => {
    const driverIds = PORTFOLIO_DRIVERS.map((driver) => driver.id);
    const entryIds = PORTFOLIO_ENTRIES.map((entry) => entry.driverId);

    expect(driverIds).toEqual(expect.arrayContaining([
      'noty',
      'paddockjs',
      'dream2detect',
      'vigil',
      'contextkey',
      'project-unity',
      'mattyflow',
      'mosaic',
      'databases-ie',
      'typecraft',
    ]));
    expect(entryIds).toEqual(expect.arrayContaining(driverIds));
    expect(driverIds).not.toContain('safeway');
    expect(new Set(PORTFOLIO_ENTRIES.map((entry) => entry.driverNumber)).size)
      .toBe(PORTFOLIO_ENTRIES.length);
  });

  test('uses the package-owned telemetry drawer instead of detached safety controls', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('simulator.mountRaceTelemetryDrawer(raceRoot');
    expect(source).toContain('mountRaceTelemetryDrawer');
    expect(source).not.toContain('mountRaceTelemetryDrawer,');
    expect(source).not.toContain('mountRaceTelemetryDrawer(raceRoot, simulator');
    expect(source).toContain('raceDataTelemetryDetail');
    expect(source).toContain("enabled: ['project', 'radio']");
    expect(source).toContain("initial: 'project'");
    expect(source).not.toContain('mountRaceCanvas');
    expect(source).not.toContain('mountSafetyCarControl');
    expect(source).not.toContain('mountTimingTower');
    expect(source).not.toContain('paddock-safety-root');
  });

  test('uses the custom race rules setup from the package snippet', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain("ruleset: 'custom'");
    expect(source).toMatch(/pitStops:\s*{\s*enabled:\s*true,\s*}/);
    expect(source).toMatch(/stalledDnf:\s*{\s*enabled:\s*true,\s*}/);
    expect(source).toMatch(/tireStrategy:\s*{\s*enabled:\s*true,\s*mandatoryDistinctDryCompounds:\s*2,\s*}/);
    expect(source).toContain("collision: {\n        strictness: 1");
    expect(source).toContain("trackLimits: {\n        strictness: 1");
    expect(source).toContain('rules: raceRules');
  });

  test('enables penalty banners and timing badges for stewarded rules', () => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain('penaltyBanners: true');
    expect(source).toContain('timingPenaltyBadges: true');
  });

  test('keeps the project race in display mode while syncing the package theme to the site', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const themeSync = readFileSync(themeSyncPath, 'utf8');

    expect(source).toContain("physicsMode: 'arcade'");
    expect(source).toContain('theme: getPaddockTheme()');
    expect(source).toContain('installPaddockThemeSync(simulator)');
    expect(themeSync).toContain('simulator.syncThemeFrom');
    expect(themeSync).toContain("attribute: 'data-theme'");
    expect(themeSync).not.toContain('--paddock-');
    expect(source).not.toContain('driverCamera');
    expect(source).not.toContain('initialCameraMode');
    expect(source).not.toContain('expert:');
  });

  test('lets the package drawer controls stay anchored while the race fills the host mount', () => {
    const projectsCss = readFileSync(projectsCssPath, 'utf8');
    const raceCss = readFileSync(raceCssPath, 'utf8');
    const bootState = readFileSync(bootStatePath, 'utf8');

    expect(projectsCss).toContain('@import url("./playfolio/race.css");');
    expect(raceCss).toContain('.pf-paddock-layout');
    expect(raceCss).toContain('.pf-paddock-preview');
    expect(raceCss).toContain('grid-row: 1');
    expect(raceCss).not.toContain('.pf-paddock-layout[data-simulator-state="booting"] .pf-paddock-race');
    expect(raceCss).toContain('.pf-paddock-grid');
    expect(raceCss).toContain('display: grid');
    expect(raceCss).toContain('.pf-paddock-race .race-telemetry-drawer');
    expect(raceCss).toContain('padding: 0 !important');
    expect(raceCss).toContain('.project-race-page .pf-paddock-race .sim-canvas-panel--with-timing-tower > .sim-timing');
    expect(raceCss).toContain('@media (max-width: 520px)');
    expect(raceCss).toContain('visibility: hidden');
    expect(raceCss).toContain('.project-race-page .pf-paddock-race .race-telemetry-drawer.is-telemetry-open .telemetry-drawer');
    expect(raceCss).toContain('visibility: visible');
    expect(bootState).toContain('dataset.layoutPreset');
    expect(bootState).toContain('dataset.timingFit');
    expect(bootState).toContain('dataset.raceDataSize');
    expect(bootState).not.toContain('classList.toggle');
    expect(bootState).not.toContain('sim-shell--left-tower-overlay');
    expect(bootState).not.toContain('sim-shell--timing-');
    expect(bootState).not.toContain('sim-shell--race-data-');
    expect(raceCss).not.toContain('.race-telemetry-drawer.is-telemetry-open .race-telemetry-drawer__controls');
    expect(raceCss).not.toContain('right: calc(var(--telemetry-drawer-width) + 1rem)');
  });

});
