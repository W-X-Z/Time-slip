import { lerp, clamp } from '../core/math.js';
export class Replay {
  constructor() { this.frames = []; this.previous = []; this.nextSample = 0; }
  record(time, player) {
    if (time < this.nextSample) return;
    this.nextSample = time + 1 / 30;
    this.frames.push({ t: time, x: player.x, y: player.y, facing: player.facing });
    if (this.frames.length > 1800) this.frames.shift();
  }
  at(time, frames = this.previous) {
    if (!frames.length || time > frames[frames.length - 1].t) return null;
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (frames[mid].t < time) lo = mid + 1; else hi = mid; }
    const b = frames[lo], a = frames[Math.max(0, lo - 1)], t = clamp((time - a.t) / (b.t - a.t || 1), 0, 1);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), facing: b.facing };
  }
  commit() { this.previous = this.frames; this.frames = []; this.nextSample = 0; }
  clear() { this.frames = []; this.previous = []; this.nextSample = 0; }
}
