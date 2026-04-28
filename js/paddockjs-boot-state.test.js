import { describe, expect, test } from 'vitest';
import { setPaddockShellState } from './paddockjs-boot-state.js';

function createNode() {
  return { hidden: false };
}

function createShell() {
  const nodes = {
    '[data-paddock-loading]': createNode(),
    '[data-paddock-error]': createNode(),
  };

  return {
    dataset: {},
    attributes: {},
    querySelector(selector) {
      return nodes[selector] ?? null;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

describe('setPaddockShellState', () => {
  test('shows boot loading state while simulator is initializing', () => {
    const shell = createShell();

    setPaddockShellState(shell, 'booting');

    expect(shell.dataset.simulatorState).toBe('booting');
    expect(shell.attributes['aria-busy']).toBe('true');
    expect(shell.querySelector('[data-paddock-loading]').hidden).toBe(false);
    expect(shell.querySelector('[data-paddock-error]').hidden).toBe(true);
  });

  test('hides loading chrome when simulator is ready', () => {
    const shell = createShell();

    setPaddockShellState(shell, 'ready');

    expect(shell.dataset.simulatorState).toBe('ready');
    expect(shell.attributes['aria-busy']).toBe('false');
    expect(shell.querySelector('[data-paddock-loading]').hidden).toBe(true);
    expect(shell.querySelector('[data-paddock-error]').hidden).toBe(true);
  });
});
