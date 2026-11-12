import { initializePlayfolio } from './playfolio/init.js';
import './resume-page.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializePlayfolio(document));
} else {
  initializePlayfolio(document);
}
