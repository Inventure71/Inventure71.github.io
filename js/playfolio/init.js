import { setupAiGuideCopy } from './ai-guide.js';
import { setupCommandPalette } from './command-palette.js';
import { setupCodexAmbassadorLogo, setupPortraitCycle } from './motion.js';
import { setupProjectExplorer, setupProjectPreview } from './project-selection.js';
import { setupReveals } from './reveal.js';
import { renderSharedFooter, renderSharedNavbar } from './shared-chrome.js';

export function initializePlayfolio(root = document) {
  renderSharedNavbar(root);
  renderSharedFooter(root);
  setupReveals(root);
  setupProjectPreview(root);
  setupProjectExplorer(root);
  setupCommandPalette(root);
  setupPortraitCycle(root);
  setupCodexAmbassadorLogo(root);
  setupAiGuideCopy(root);
}
