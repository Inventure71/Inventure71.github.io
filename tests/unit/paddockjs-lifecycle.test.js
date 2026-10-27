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
  const race = { replaceChildren: vi.fn() };
  const shell = { dataset: {}, setAttribute: vi.fn(), querySelector: selector => selector === '#paddock-race-root' ? race : null };
  vi.stubGlobal('document', { documentElement: { dataset: { theme: 'dark' } }, getElementById: () => null, querySelector: () => shell });
  const api = await import('../../js/paddockjs-portfolio.js');
  const simulator = (start) => ({ start, mountRaceTelemetryDrawer: vi.fn(), destroy: vi.fn(), syncThemeFrom: vi.fn(() => vi.fn()) });
  return { shell, race, api, simulator };
}
afterEach(() => vi.unstubAllGlobals());

describe('host race lifecycle', () => {
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
