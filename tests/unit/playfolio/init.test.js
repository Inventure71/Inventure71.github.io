import { beforeEach, describe, expect, test, vi } from 'vitest';

const setup = vi.hoisted(() => ({
  motionModule: vi.fn(),
  selectionModule: vi.fn(),
  portrait: vi.fn(),
  codex: vi.fn(),
  preview: vi.fn(),
  explorer: vi.fn(),
  navbar: vi.fn(),
}));
vi.mock('../../../js/playfolio/motion.js', () => {
  setup.motionModule();
  return { setupPortraitCycle: setup.portrait, setupCodexAmbassadorLogo: setup.codex };
});
vi.mock('../../../js/playfolio/project-selection.js', () => {
  setup.selectionModule();
  return { setupProjectPreview: setup.preview, setupProjectExplorer: setup.explorer };
});
vi.mock('../../../js/playfolio/shared-chrome.js', () => ({
  renderSharedNavbar: setup.navbar,
  renderSharedFooter: vi.fn(),
}));
vi.mock('../../../js/playfolio/reveal.js', () => ({ setupReveals: vi.fn() }));
vi.mock('../../../js/playfolio/ai-guide.js', () => ({ setupAiGuideCopy: vi.fn() }));
vi.mock('../../../js/playfolio/command-palette.js', () => ({ setupCommandPalette: vi.fn() }));

describe('page-specific initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  test('keeps homepage modules out of routes without their components', async () => {
    const { initializePlayfolio } = await import('../../../js/playfolio/init.js');
    const root = { querySelector: () => null };
    initializePlayfolio(root);
    await vi.dynamicImportSettled();

    expect(setup.navbar).toHaveBeenCalledWith(root);
    expect(setup.motionModule).not.toHaveBeenCalled();
    expect(setup.selectionModule).not.toHaveBeenCalled();
  });

  test('loads and initializes the homepage components when present', async () => {
    const { initializePlayfolio } = await import('../../../js/playfolio/init.js');
    const root = { querySelector: () => ({}) };
    initializePlayfolio(root);
    await vi.dynamicImportSettled();

    expect(setup.portrait).toHaveBeenCalledWith(root);
    expect(setup.codex).toHaveBeenCalledWith(root);
    expect(setup.preview).toHaveBeenCalledWith(root);
    expect(setup.explorer).toHaveBeenCalledWith(root);
  });
});
