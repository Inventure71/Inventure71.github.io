import { describe, expect, test } from 'vitest';
import { setPaddockShellState } from '../../js/paddockjs-boot-state.js';

function createNode() {
  return { hidden: false, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
}

function createShell() {
  const nodes = {
    '[data-paddock-preview]': createNode(),
    '[data-paddock-root]': createNode(),
    '[data-paddock-error]': createNode(),
    // Package-owned descendants must never have their lifecycle changed by the host.
    '[data-paddock-loading]': createNode(),
  };
  return {
    dataset: {}, attributes: {},
    querySelector: selector => nodes[selector] ?? null,
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}

describe('setPaddockShellState', () => {
  test('hands import loading to package boot while keeping unfinished controls inert', () => {
    const shell = createShell();
    const preview = shell.querySelector('[data-paddock-preview]');
    const root = shell.querySelector('[data-paddock-root]');
    const packageLoader = shell.querySelector('[data-paddock-loading]');

    setPaddockShellState(shell, 'loading');
    expect(preview.hidden).toBe(false);
    expect(root.inert).toBe(true);
    setPaddockShellState(shell, 'booting');
    expect(preview.hidden).toBe(true);
    expect(root.hidden).toBe(false);
    expect(root.inert).toBe(true);
    expect(shell.attributes['aria-busy']).toBe('true');
    expect(packageLoader).toEqual({ hidden: false, attributes: {}, setAttribute: packageLoader.setAttribute });

    setPaddockShellState(shell, 'ready');
    expect(preview.hidden).toBe(true);
    expect(root.inert).toBe(false);
    expect(root.attributes['aria-hidden']).toBe('false');
    expect(shell.attributes['aria-busy']).toBe('false');
  });

  test('replaces failed startup with an error and restores import loading on retry', () => {
    const shell = createShell();
    const error = shell.querySelector('[data-paddock-error]');
    const preview = shell.querySelector('[data-paddock-preview]');
    setPaddockShellState(shell, 'error');
    expect(error.hidden).toBe(false);
    expect(error.inert).toBe(false);
    expect(preview.hidden).toBe(true);
    expect(shell.querySelector('[data-paddock-root]').inert).toBe(true);
    setPaddockShellState(shell, 'loading');
    expect(error.hidden).toBe(true);
    expect(preview.hidden).toBe(false);
  });
});
