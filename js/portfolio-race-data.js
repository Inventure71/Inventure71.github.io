import { DriverData, VehicleData } from '@inventure71/paddockjs/data';
import { projects, SERIES } from './playfolio/project-catalog.js';

const colors = ['#f59e0b', '#8b5cf6', '#c084fc', '#4f7cff', '#14b8a6', '#e56d2f', '#ec4899'];

// Editorial priority sets the initial grid only. All projects receive the same
// ratings; race performance is not a career-quality score.
export const PORTFOLIO_DRIVERS = [...projects]
  .sort((a, b) => a.priority - b.priority)
  .map((project, index) => ({
    id: project.raceId,
    name: project.label,
    color: colors[index % colors.length],
    link: project.href,
    raceData: [project.description, project.stack, project.status],
  }));

export const PORTFOLIO_ENTRIES = PORTFOLIO_DRIVERS.map((driver, index) => ({
  driverId: driver.id,
  driverNumber: index + 1,
  timingName: driver.name,
  driver: new DriverData({
    pace: 68, racecraft: 74, aggression: 56, riskTolerance: 58,
    patience: 67, consistency: 72,
  }),
  vehicle: new VehicleData({
    id: `portfolio-${driver.id}`,
    name: driver.name,
    power: 67, braking: 66, aero: 65, dragEfficiency: 64,
    mechanicalGrip: 68, weightControl: 63, tireCare: 70,
  }),
  presentation: {
    name: driver.name,
    summary: projects.find((project) => project.raceId === driver.id).description,
    href: driver.link,
    linkLabel: 'View project',
  },
}));

export function normalizeSeries(value) {
  return SERIES.some((series) => series.id === value) ? value : 'F1';
}

export function getPortfolioGrid(series = 'F1') {
  const selected = normalizeSeries(series);
  const ids = new Set(projects.filter((project) => project.tier === selected).map((project) => project.raceId));
  return {
    drivers: PORTFOLIO_DRIVERS.filter((driver) => ids.has(driver.id)),
    entries: PORTFOLIO_ENTRIES.filter((entry) => ids.has(entry.driverId)),
  };
}
