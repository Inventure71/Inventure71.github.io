export const TWO_PI = Math.PI * 2;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function normalizeAngle(angle) {
  let value = ((angle + Math.PI) % TWO_PI) - Math.PI;
  if (value < -Math.PI) value += TWO_PI;
  return value;
}

export function createMulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(random, min, max) {
  return min + (max - min) * random();
}

export function wrapDistance(value, length) {
  return ((value % length) + length) % length;
}
