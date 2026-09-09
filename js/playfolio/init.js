import { setupAiGuideCopy } from './ai-guide.js';
import { setupCommandPalette } from './command-palette.js';
import { setupReveals } from './reveal.js';
import { renderSharedFooter, renderSharedNavbar } from './shared-chrome.js';

export function initializePlayfolio(root = document) {
  renderSharedNavbar(root);
  renderSharedFooter(root);
  setupReveals(root);
  setupCommandPalette(root);
  setupAiGuideCopy(root);

  if (root.querySelector('[data-project-inspector]')) {
    import('./project-selection.js').then(({ setupProjectExplorer }) => {
      setupProjectExplorer(root);
    });
  }
  if (root.querySelector('[data-portrait-cycle], [data-codex-ambassador-logo]')) {
    import('./motion.js').then(({ setupPortraitCycle, setupCodexAmbassadorLogo }) => {
      setupPortraitCycle(root);
      setupCodexAmbassadorLogo(root);
    });
  }
}
