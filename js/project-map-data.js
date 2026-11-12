import { projects } from './playfolio/project-catalog.js';

const legacyIds = {
  "noty": "noty",
  "paddockjs": "paddockjs",
  "vigil": "vigil",
  "project-unity": "project-unity",
  "dream2detect": "dream2detect",
  "victoria": "victoria",
  "core-conflict": "core-conflict",
  "mosaic-swarm": "mosaic",
  "dottor-sorriso": "drsorriso",
  "clipclop": "clipclop",
  "mattyflow": "mattyflow",
  "ghostyper": "ghoststroke",
  "contextkey": "contextkey",
  "holovinyl": "holovinyl",
  "neural-noir": "neural-noir",
  "tcgnet": "databases-ie",
  "algorithms-game": "algorithms-project",
  "reminderz": "remainder",
  "evolve": "evolve",
  "budget-buddy": "budget-buddy"
};

export const projectMapItems = projects.map((project) => ({
  id: legacyIds[project.id] || project.id,
  url: project.href.slice(1),
  title: project.label,
  desc: project.description,
  tags: project.tags,
}));
