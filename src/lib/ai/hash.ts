function fnv1a(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function hashToUnit(seed: string): number {
  return fnv1a(seed) / 0xffffffff;
}

export function hashInRange(seed: string, min: number, max: number): number {
  return min + hashToUnit(seed) * (max - min);
}
