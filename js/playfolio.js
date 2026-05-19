import { initializePlayfolio } from './playfolio/init.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializePlayfolio(document));
} else {
  initializePlayfolio(document);
}
