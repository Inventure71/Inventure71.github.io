import { describe, expect, test } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { initExperimentWalkthrough } from '../../../js/project-demos/dream2detect.js';

function element(properties = {}) {
  const attributes = new Map();
  const handlers = new Map();
  return {
    dataset: {}, ...properties,
    setAttribute: (key, value) => attributes.set(key, value),
    getAttribute: (key) => attributes.get(key),
    addEventListener: (key, handler) => handlers.set(key, handler),
    emit: (key, event = {}) => handlers.get(key)?.(event),
    focus() { this.focused = true; },
    attributes, handlers,
  };
}

function harness({ missingPanel = false, mismatchedPanel = false } = {}) {
  const stages = ['generate', 'review', 'evaluate'];
  const controls = element({ hidden: true });
  const footer = element({ hidden: true });
  const position = element();
  const next = element();
  const results = element({ hidden: true });
  const tabs = stages.map((step) => element({ id: `experiment-tab-${step}`, dataset: { step } }));
  const panels = stages.map((stepPanel) => element({ dataset: { stepPanel }, hidden: false }));
  if (missingPanel) panels.pop();
  if (mismatchedPanel) panels[1].dataset.stepPanel = 'unknown';
  const elements = {
    '[data-step-controls]': controls, '[data-step-footer]': footer,
    '[data-step-position]': position, '[data-step-next]': next,
    '[data-step-results]': results,
  };
  const root = {
    dataset: {}, querySelector: (selector) => elements[selector],
    querySelectorAll: (selector) => selector === '[data-step]' ? tabs : panels,
  };
  initExperimentWalkthrough(root);
  return { root, controls, footer, position, next, results, tabs, panels };
}

function expectSelected(view, index) {
  expect(view.panels.map((panel) => panel.hidden)).toEqual([0, 1, 2].map((item) => item !== index));
  expect(view.tabs.map((tab) => tab.getAttribute('aria-selected'))).toEqual([0, 1, 2].map((item) => String(item === index)));
  expect(view.tabs.map((tab) => tab.tabIndex)).toEqual([0, 1, 2].map((item) => item === index ? 0 : -1));
  expect(view.position.textContent).toBe(`Step ${index + 1} of 3`);
}

describe('Dream2Detect experiment walkthrough', () => {
  test('each step button exposes the matching evidence panel and maintains accessible tab state', () => {
    const view = harness();
    expectSelected(view, 0);
    view.tabs[1].emit('click');
    expectSelected(view, 1);
    view.tabs[2].emit('click');
    expectSelected(view, 2);
    view.panels.forEach((panel, index) => {
      expect(panel.getAttribute('aria-labelledby')).toBe(view.tabs[index].id);
      expect(panel.getAttribute('role')).toBe('tabpanel');
    });
  });

  test('next progresses through the explanation then offers results without leaving focus on a hidden control', () => {
    const view = harness();
    expect(view.next.textContent).toContain('Review labels');
    view.next.emit('click');
    expectSelected(view, 1);
    expect(view.tabs[1].focused).toBe(true);
    expect(view.next.textContent).toContain('Test on real photos');
    view.next.emit('click');
    expectSelected(view, 2);
    expect(view.tabs[2].focused).toBe(true);
    expect(view.next.hidden).toBe(true);
    expect(view.results.hidden).toBe(false);
    view.tabs[0].emit('click');
    expect(view.next.hidden).toBe(false);
    expect(view.results.hidden).toBe(true);
  });

  test('keyboard arrows wrap, Home and End select endpoints, and ordinary keys retain browser behavior', () => {
    const view = harness();
    const key = (tab, key) => {
      const event = { key, prevented: false, preventDefault() { this.prevented = true; } };
      view.tabs[tab].emit('keydown', event);
      return event;
    };
    expect(key(0, 'ArrowLeft').prevented).toBe(true);
    expectSelected(view, 2);
    expect(view.tabs[2].focused).toBe(true);
    key(2, 'ArrowRight');
    expectSelected(view, 0);
    key(0, 'End');
    expectSelected(view, 2);
    key(2, 'Home');
    expectSelected(view, 0);
    expect(key(0, 'Tab').prevented).toBe(false);
    expectSelected(view, 0);
  });

  test('reveals working controls only after valid initialization and does not install duplicate handlers', () => {
    const view = harness();
    expect(view.controls.hidden).toBe(false);
    expect(view.footer.hidden).toBe(false);
    expect(view.controls.getAttribute('role')).toBe('tablist');
    const handler = view.tabs[0].handlers.get('click');
    initExperimentWalkthrough(view.root);
    expect(view.tabs[0].handlers.get('click')).toBe(handler);
    expect(() => initExperimentWalkthrough(null)).not.toThrow();
  });

  test('incomplete or mismatched markup leaves the static explanation readable', () => {
    for (const options of [{ missingPanel: true }, { mismatchedPanel: true }]) {
      const view = harness(options);
      expect(view.controls.hidden).toBe(true);
      expect(view.footer.hidden).toBe(true);
      expect(view.panels.every((panel) => !panel.hidden)).toBe(true);
      expect(view.root.dataset.walkthroughReady).toBeUndefined();
    }
  });

  test('static evidence uses real source assets and all three explanatory panels are available without JavaScript', () => {
    const html = readFileSync(new URL('../../../project_details/project-dream2detect.html', import.meta.url), 'utf8');
    const panels = [...html.matchAll(/<div[^>]+data-step-panel="([^"]+)"[^>]*>/g)];
    expect(panels.map((match) => match[1])).toEqual(['generate', 'review', 'evaluate']);
    expect(panels.every((match) => !match[0].includes('hidden'))).toBe(true);
    const images = [...html.matchAll(/src="\.\.\/assets\/project-media\/dream2detect\/([^"]+)"/g)];
    expect(images.length).toBe(3);
    images.forEach(([, file]) => expect(existsSync(new URL(`../../../assets/project-media/dream2detect/${file}`, import.meta.url))).toBe(true));
    expect(html).toContain('human-reviewed label');
    expect(html).not.toContain('data-severity');
    expect(html).not.toMatch(/<br\b/);
  });
});
