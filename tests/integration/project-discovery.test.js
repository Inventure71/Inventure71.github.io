import { readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { projectCommandItems } from '../../js/playfolio/catalog.js';
import { projectMapItems } from '../../js/project-map-data.js';
import { PORTFOLIO_DRIVERS } from '../../js/portfolio-race-data.js';

describe('project discovery consistency', () => {
  test('every published project is reachable exactly once through the catalog, map and race', () => {
    const pages = readdirSync(new URL('../../project_details/', import.meta.url))
      .filter((file) => file.startsWith('project-') && file.endsWith('.html'))
      .map((file) => `/project_details/${file}`).sort();
    expect(projectCommandItems.map((item) => item.href).sort()).toEqual(pages);
    expect(projectMapItems.map((item) => `/${item.url}`).sort()).toEqual(pages);
    expect(PORTFOLIO_DRIVERS.map((driver) => driver.link).sort()).toEqual(pages);
  });

  test('the map and race use current portfolio labels rather than package demo copy', () => {
    for (const project of projectCommandItems) {
      const mapItem = projectMapItems.find((item) => `/${item.url}` === project.href);
      const driver = PORTFOLIO_DRIVERS.find((item) => item.link === project.href);
      expect(mapItem.title).toBe(project.label);
      expect(mapItem.desc).toBe(project.description);
      expect(driver.name).toBe(project.label);
    }
    expect(PORTFOLIO_DRIVERS.find((driver) => driver.id === 'evolve').raceData)
      .not.toContain('Creature cards');
    expect(projectMapItems.find((item) => item.id === 'evolve').tags)
      .not.toContain('Unreal Engine');
  });
});
