// Small seedable random number generator (mulberry32), so shop rolls and
// opponent picks can be replayed in tests.
export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Integer in [0, max). */
    int: (max) => Math.floor(next() * max),
    /** Eight lowercase hex characters, like the Guid fragment Unity appends to unit names. */
    hex8: () => Array.from({ length: 8 }, () => Math.floor(next() * 16).toString(16)).join(""),
  };
}
