import { LEVEL, RULES } from './level.js';
export function freshProgress(best = null) { return { version: 1, shards: [], anchors: [], loops: 0, deaths: 0, totalTime: 0, best }; }
export function capacity(progress) { return RULES.baseTime + progress.shards.length * RULES.shardBonus; }
export function collect(progress, id) {
  if (!LEVEL.shards.some(s => s.id === id) || progress.shards.includes(id)) return false;
  progress.shards.push(id); return true;
}
export function sanitizeProgress(raw) {
  const p = freshProgress();
  if (!raw || raw.version !== 1) return p;
  const valid = (items, allowed) => Array.isArray(items) ? [...new Set(items.filter(id => allowed.some(s => s.id === id)))] : [];
  p.shards = valid(raw.shards, LEVEL.shards); p.anchors = valid(raw.anchors, LEVEL.anchors);
  for (const key of ['loops', 'deaths', 'totalTime']) if (Number.isFinite(raw[key]) && raw[key] >= 0) p[key] = Math.min(1e7, raw[key]);
  p.loops = Math.floor(p.loops); p.deaths = Math.floor(p.deaths);
  if (raw.best && Number.isFinite(raw.best.time) && raw.best.time > 0 && Number.isInteger(raw.best.loops) && raw.best.loops > 0) p.best = { time: raw.best.time, loops: raw.best.loops };
  return p;
}
