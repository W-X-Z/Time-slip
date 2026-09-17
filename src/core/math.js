export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const approach = (value, target, amount) => value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
export const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function circleRect(circle, rect) {
  return Math.hypot(circle.x - clamp(circle.x, rect.x, rect.x + rect.w), circle.y - clamp(circle.y, rect.y, rect.y + rect.h)) < circle.r;
}
/** Deterministic scenery: never shares randomness with gameplay. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; };
}
