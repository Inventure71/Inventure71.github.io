import {
  CHAMPIONSHIP_ENTRY_BLUEPRINTS,
  DEMO_PROJECT_DRIVERS,
  mountF1Simulator,
} from '@inventure71/paddockjs';

const root = document.getElementById('f1-simulator-root');

if (root) {
  mountF1Simulator(root, {
    drivers: DEMO_PROJECT_DRIVERS,
    entries: CHAMPIONSHIP_ENTRY_BLUEPRINTS,
    title: 'F1 Simulator Lab',
    kicker: 'Race Control',
    backLinkHref: 'projects.html',
    backLinkLabel: 'Projects',
    onDriverOpen(driver) {
      if (driver.link) window.location.href = driver.link;
    },
  }).catch((error) => {
    root.dataset.simulatorState = 'error';
    console.error('PaddockJS failed to initialize.', error);
  });
}
