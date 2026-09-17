import { circleRect, overlaps } from '../core/math.js';
import { RULES, LEVEL, zoneAt, droneAt } from './level.js';
import { freshProgress, capacity, collect } from './progress.js';
import { createPlayer, movePlayer } from './physics.js';
import { Replay } from './replay.js';
export const IDLE_INPUT = Object.freeze({ move: 0, jumpPressed: false, jumpDown: false, interactPressed: false, rewindPressed: false });
export class GameModel {
  constructor(progress = freshProgress()) {
    this.progress = progress; this.player = createPlayer(); this.replay = new Replay(); this.mode = 'title';
    this.loopTime = 0; this.loopLimit = capacity(progress); this.rewindTime = 0; this.events = []; this.exitHintCooldown = 0; this.zone = 0;
  }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  drainEvents() { const events = this.events; this.events = []; return events; }
  get remaining() { return Math.max(0, this.loopLimit - this.loopTime); }
  get nextLimit() { return capacity(this.progress); }
  get activeAnchor() { return [...LEVEL.anchors].reverse().find(a => this.progress.anchors.includes(a.id)); }
  get canTravel() { return !!this.activeAnchor && Math.abs(this.player.x - LEVEL.spawn.x) < 145 && this.player.y > 460; }
  start(fresh = false) {
    if (fresh) { this.progress = freshProgress(this.progress.best); this.replay.clear(); }
    this.beginLoop();
  }
  beginLoop() {
    this.player = createPlayer(); this.loopTime = 0; this.loopLimit = capacity(this.progress); this.rewindTime = 0; this.zone = 0;
    this.progress.loops++; this.mode = 'playing'; this.emit('loop'); this.emit('save');
  }
  rewind(reason = 'manual') {
    if (this.mode !== 'playing') return;
    this.mode = 'rewinding'; this.reason = reason; this.rewindTime = 0;
    if (reason === 'fall' || reason === 'hazard') this.progress.deaths++;
    this.emit('rewind', { reason }); this.emit('save');
  }
  pause() {
    if (this.mode === 'playing' || this.mode === 'rewinding') { this.beforePause = this.mode; this.mode = 'paused'; this.emit('save'); }
  }
  resume() { if (this.mode === 'paused') this.mode = this.beforePause || 'playing'; }
  step(dt, input = IDLE_INPUT) {
    if (this.mode === 'rewinding') {
      this.rewindTime += dt;
      if (this.rewindTime >= RULES.rewindDuration) { this.replay.commit(); this.beginLoop(); }
      return;
    }
    if (this.mode !== 'playing') return;
    if (input.rewindPressed) { this.rewind(); return; }
    this.loopTime += dt; this.progress.totalTime += dt; this.exitHintCooldown -= dt;
    if (this.remaining <= 0) { this.rewind('time'); return; }
    if (input.interactPressed && this.canTravel) {
      const anchor = this.activeAnchor;
      this.player.x = anchor.x; this.player.y = anchor.y - this.player.h; this.player.vx = 0; this.player.vy = 0;
      this.emit('travel', { x: anchor.x, y: anchor.y, zone: anchor.zone });
    }
    const motion = movePlayer(this.player, input, dt);
    if (motion.jumped) this.emit('jump', { x: this.player.x + 12, y: this.player.y + 36 });
    if (motion.landed) this.emit('land', { x: this.player.x + 12, y: this.player.y + 36 });
    const p = this.player;
    if (p.y > LEVEL.height + 50) { this.rewind('fall'); return; }
    const hurtbox = { x: p.x + 4, y: p.y + 5, w: p.w - 8, h: p.h - 7 };
    if (LEVEL.spikes.some(s => overlaps(hurtbox, s)) || LEVEL.drones.some(d => circleRect(droneAt(d, this.loopTime), hurtbox))) { this.rewind('hazard'); return; }
    for (const shard of LEVEL.shards) {
      if (circleRect({ ...shard, r: 27 }, p) && collect(this.progress, shard.id)) { this.emit('shard', { ...shard, next: this.nextLimit }); this.emit('save'); }
    }
    for (const anchor of LEVEL.anchors) {
      if (!this.progress.anchors.includes(anchor.id) && Math.hypot(p.x + 12 - anchor.x, p.y + 36 - anchor.y) < 68) {
        this.progress.anchors.push(anchor.id); this.emit('anchor', anchor); this.emit('save');
      }
    }
    const nextZone = zoneAt(p.x);
    if (nextZone !== this.zone) { this.zone = nextZone; this.emit('zone', { zone: nextZone }); }
    if (overlaps(p, LEVEL.exit)) {
      if (this.progress.shards.length === LEVEL.shards.length) {
        this.mode = 'won';
        if (!this.progress.best || this.progress.totalTime < this.progress.best.time) this.progress.best = { time: this.progress.totalTime, loops: this.progress.loops };
        this.emit('win'); this.emit('save');
      } else if (this.exitHintCooldown <= 0) { this.exitHintCooldown = 4; this.emit('locked', { missing: LEVEL.shards.length - this.progress.shards.length }); }
    }
    this.replay.record(this.loopTime, p);
  }
}
