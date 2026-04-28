import { lerp, normalizeAngle } from './simMath.js';

function interpolateAngle(previous, current, amount) {
  if (!Number.isFinite(previous)) return current;
  return previous + normalizeAngle(current - previous) * amount;
}

function interpolateMovingEntity(entity, alpha) {
  return {
    ...entity,
    x: lerp(entity.previousX ?? entity.x, entity.x, alpha),
    y: lerp(entity.previousY ?? entity.y, entity.y, alpha),
    heading: interpolateAngle(entity.previousHeading ?? entity.heading, entity.heading, alpha),
  };
}

export function createRenderSnapshot(snapshot, alpha) {
  return {
    ...snapshot,
    cars: snapshot.cars.map((car) => interpolateMovingEntity(car, alpha)),
    safetyCar: interpolateMovingEntity(snapshot.safetyCar, alpha),
  };
}
