const UINT32_RANGE = 0x100000000;

export function createFreshTrackSeed({
  cryptoSource = globalThis.crypto,
  now = Date.now,
  random = Math.random,
} = {}) {
  const values = new Uint32Array(1);

  try {
    cryptoSource?.getRandomValues?.(values);
  } catch {
    values[0] = 0;
  }

  const cryptoSeed = values[0] >>> 0;
  if (cryptoSeed > 0) return cryptoSeed;

  const timeSeed = Math.floor(now()) >>> 0;
  const randomSeed = Math.floor(random() * UINT32_RANGE) >>> 0;
  return ((timeSeed ^ randomSeed) || 1) >>> 0;
}
