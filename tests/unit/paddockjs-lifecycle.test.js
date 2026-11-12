import { afterEach, describe, expect, test, vi } from 'vitest';

const { createSimulator } = vi.hoisted(() => ({ createSimulator: vi.fn() }));
vi.mock('@inventure71/paddockjs', () => ({ createPaddockSimulator: createSimulator, mountF1Simulator: vi.fn() }));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
async function harness() {
  vi.resetModules();
  createSimulator.mockReset();
  const race = { querySelectorAll: () => [], replaceChildren: vi.fn() };
  const shell = { dataset: {}, setAttribute: vi.fn(), querySelector: selector => selector === '#paddock-race-root' ? race : null };
  vi.stubGlobal('document', { documentElement: { dataset: { theme: 'dark' } }, getElementById: () => null, querySelector: () => shell });
  vi.stubGlobal('MutationObserver', class { observe() {} disconnect() {} });
  const api = await import('../../js/paddockjs-portfolio.js');
  const simulator = (start) => ({ start, restart: vi.fn(), mountRaceTelemetryDrawer: vi.fn(), mountRaceCanvas: vi.fn(), getView: () => 'grid-walk', getSnapshot: () => ({ raceControl: {} }), destroy: vi.fn(), syncThemeFrom: vi.fn(() => vi.fn()) });
  return { shell, race, api, simulator };
}
afterEach(() => vi.unstubAllGlobals());

describe('host race lifecycle', () => {

  test('waits for startup then restarts once with the latest entrants, preserving the renderer', async () => {
    const h = await harness();
    const boot = deferred();
    const simulator = h.simulator(() => boot.promise);
    createSimulator.mockReturnValue(simulator);
    const starting = h.api.initializeProjectsRace(h.shell);
    await Promise.resolve();
    h.shell.dataset.raceSeries = 'F2';
    const intermediate = h.api.changeProjectsRaceSeries(h.shell);
    h.shell.dataset.raceSeries = 'F3';
    const latest = h.api.changeProjectsRaceSeries(h.shell);
    expect(simulator.restart).not.toHaveBeenCalled();
    boot.resolve();
    await Promise.all([starting, intermediate, latest]);
    expect(createSimulator).toHaveBeenCalledOnce();
    expect(simulator.destroy).not.toHaveBeenCalled();
    expect(simulator.restart).toHaveBeenCalledOnce();
    const options = simulator.restart.mock.calls[0][0];
    expect(options.assets).toBeUndefined();
    expect(options.drivers.map(driver => driver.id)).toContain('budget');
    expect(options.drivers.map(driver => driver.id)).not.toContain('noty');
    expect(options.entries.map(entry => entry.driverId)).toEqual(options.drivers.map(driver => driver.id));
  });

  test('starts one grid-first renderer and reuses it for repeated initialization', async () => {
    const h = await harness();
    const simulator = h.simulator(() => Promise.resolve());
    createSimulator.mockReturnValue(simulator);
    await h.api.initializeProjectsRace(h.shell);
    await h.api.initializeProjectsRace(h.shell);
    expect(createSimulator).toHaveBeenCalledOnce();
    expect(createSimulator.mock.calls[0][0].gridWalk).toEqual({ enabled: true, initialView: 'grid-walk' });
    expect(simulator.mountRaceTelemetryDrawer).toHaveBeenCalledOnce();
    expect(simulator.mountRaceCanvas).not.toHaveBeenCalled();
    expect(h.shell.dataset.raceView).toBe('grid-walk');
  });

  test('a failed series restart releases the renderer so Retry can create the selected grid', async () => {
    const h = await harness();
    const failed = h.simulator(() => Promise.resolve());
    const retry = h.simulator(() => Promise.resolve());
    createSimulator.mockReturnValueOnce(failed).mockReturnValueOnce(retry);
    await h.api.initializeProjectsRace(h.shell);
    failed.restart.mockImplementation(() => { throw new Error('restart failed'); });
    h.shell.dataset.raceSeries = 'F2';
    await expect(h.api.changeProjectsRaceSeries(h.shell)).rejects.toThrow('restart failed');
    expect(failed.destroy).toHaveBeenCalledOnce();
    expect(h.shell.dataset.simulatorState).toBe('error');
    await h.api.changeProjectsRaceSeries(h.shell);
    expect(createSimulator).toHaveBeenCalledTimes(2);
    expect(createSimulator.mock.calls[1][0].drivers.map(driver => driver.id)).toContain('project-unity');
    expect(h.shell.dataset.simulatorState).toBe('ready');
  });

  test('coalesces duplicate initialization, releases a failed partial mount, then creates a fresh instance', async () => {
    const h = await harness();
    const boot = deferred();
    const failed = h.simulator(() => boot.promise);
    const retry = h.simulator(() => Promise.resolve());
    createSimulator.mockReturnValueOnce(failed).mockReturnValueOnce(retry);
    const first = h.api.initializeProjectsRace(h.shell);
    expect(h.api.initializeProjectsRace(h.shell)).toBe(first);
    await Promise.resolve();
    expect(createSimulator).toHaveBeenCalledTimes(1);
    boot.reject(new Error('renderer failed'));
    await expect(first).rejects.toThrow('renderer failed');
    expect(failed.destroy).toHaveBeenCalledOnce();
    expect(h.race.replaceChildren).toHaveBeenCalledOnce();
    expect(h.shell.dataset.simulatorState).toBe('error');
    await h.api.initializeProjectsRace(h.shell);
    expect(createSimulator).toHaveBeenCalledTimes(2);
    expect(h.shell.dataset.simulatorState).toBe('ready');
    await h.api.initializeProjectsRace(h.shell);
    expect(createSimulator).toHaveBeenCalledTimes(2);
  });

  test('serializes teardown during startup before allowing another mount into the same root', async () => {
    const h = await harness();
    const boot = deferred();
    const first = h.simulator(() => boot.promise);
    const second = h.simulator(() => Promise.resolve());
    createSimulator.mockReturnValueOnce(first).mockReturnValueOnce(second);
    const starting = h.api.initializeProjectsRace(h.shell);
    await Promise.resolve();
    const stopping = h.api.destroyProjectsRace(h.shell);
    const next = h.api.initializeProjectsRace(h.shell);
    expect(first.destroy).not.toHaveBeenCalled();
    expect(createSimulator).toHaveBeenCalledTimes(1);
    boot.resolve();
    await starting;
    await stopping;
    await next;
    expect(first.destroy).toHaveBeenCalledOnce();
    expect(createSimulator).toHaveBeenCalledTimes(2);
    expect(second.mountRaceTelemetryDrawer).toHaveBeenCalledOnce();
    expect(h.shell.dataset.simulatorState).toBe('ready');
  });
});
