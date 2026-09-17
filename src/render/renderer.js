import { clamp, lerp, rng } from '../core/math.js';
import { LEVEL, RULES, droneAt } from '../game/level.js';
import { Particles } from './particles.js';
const INK = '#172536', CREAM = '#f6e9ca', GOLD = '#f8c77d', CORAL = '#ec8e83';
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.camera = 0; this.width = 1280; this.height = 720;
    this.particles = new Particles(); this.flash = 0; this.shake = 0; this.clock = 0;
    const random = rng(2789); this.stars = Array.from({ length: 75 }, () => ({ x: random(), y: random() * 0.63, r: random() > 0.9 ? 2 : 1, phase: random() * 6.28 }));
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas); this.resize();
  }
  resize() {
    const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr); this.canvas.height = Math.round(rect.height * dpr);
    this.scale = this.canvas.height / this.height; this.width = this.canvas.width / this.scale; this.ctx.imageSmoothingEnabled = false;
  }
  handle(event, model) {
    if (event.type === 'shard') { this.particles.burst(event.x, event.y, GOLD, 30, 190); this.flash = 0.15; }
    if (event.type === 'jump' || event.type === 'land') this.particles.burst(event.x, event.y, '#a6b1a2', event.type === 'land' ? 9 : 5, 65);
    if (event.type === 'anchor') this.particles.burst(event.x, event.y - 45, GOLD, 34, 170);
    if (event.type === 'travel') { this.snap(model); this.flash = 0.3; this.particles.burst(event.x, event.y - 20, '#b7dfdb', 36, 190); }
    if (event.type === 'loop') { this.camera = 0; this.flash = 0.1; this.particles.items = []; }
    if (event.type === 'rewind') this.shake = event.reason === 'hazard' ? 7 : 2;
    if (event.type === 'win') this.particles.burst(model.player.x, model.player.y, GOLD, 70, 240);
  }
  snap(model) { this.camera = clamp(model.player.x - this.width * 0.34, 0, Math.max(0, LEVEL.width - this.width)); }
  draw(model, dt, settings) {
    const ctx = this.ctx; this.clock += dt; this.flash = Math.max(0, this.flash - dt * 0.8); this.shake = Math.max(0, this.shake - dt * 16);
    if (model.mode !== 'paused') this.particles.update(dt);
    let displayPlayer = model.player;
    if (model.mode === 'rewinding' && !settings.reducedMotion) displayPlayer = { ...model.player, ...(model.replay.at(model.loopTime * (1 - clamp(model.rewindTime / RULES.rewindDuration, 0, 1)), model.replay.frames) || {}) };
    const target = model.mode === 'title' ? 0 : clamp(displayPlayer.x - this.width * 0.34, 0, Math.max(0, LEVEL.width - this.width));
    this.camera = lerp(this.camera, target, settings.reducedMotion ? 1 : 1 - Math.exp(-dt * (model.mode === 'rewinding' ? 20 : 6)));
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    if (!settings.reducedMotion && this.shake) ctx.translate(Math.sin(this.clock * 70) * this.shake, Math.cos(this.clock * 53) * this.shake * 0.5);
    this.sky(ctx, model, settings);
    ctx.save(); ctx.translate(-Math.round(this.camera), 0);
    this.scenery(ctx);
    for (const platform of LEVEL.platforms) if (this.visible(platform.x, platform.w)) this.platform(ctx, platform);
    for (const spike of LEVEL.spikes) {
      ctx.fillStyle = '#453245'; ctx.fillRect(spike.x, spike.y + 10, spike.w, 6);
      ctx.fillStyle = CORAL;
      for (let x = spike.x; x < spike.x + spike.w; x += 14) { ctx.beginPath(); ctx.moveTo(x, spike.y + 15); ctx.lineTo(x + 7, spike.y); ctx.lineTo(x + 14, spike.y + 15); ctx.fill(); }
    }
    for (const drone of LEVEL.drones) this.drone(ctx, droneAt(drone, model.loopTime));
    for (const shard of LEVEL.shards) if (this.visible(shard.x, 40)) this.shard(ctx, shard, model.progress.shards.includes(shard.id));
    for (const anchor of LEVEL.anchors) if (this.visible(anchor.x, 100)) this.anchor(ctx, anchor.x, anchor.y, model.progress.anchors.includes(anchor.id), false);
    this.anchor(ctx, 118, 584, !!model.activeAnchor, true);
    this.portal(ctx, model.progress.shards.length === LEVEL.shards.length);
    if (settings.ghost && model.mode === 'playing') { const ghost = model.replay.at(model.loopTime); if (ghost) this.player(ctx, { ...model.player, ...ghost, squash: 0 }, 0.19, true); }
    this.player(ctx, displayPlayer, 1, false);
    this.particles.draw(ctx);
    for (const sign of LEVEL.signs) if (this.visible(sign.x, 260)) this.text(ctx, sign.text, sign.x, sign.y, 12, '#abb2b6', 'center');
    if (model.canTravel && model.mode === 'playing') this.label(ctx, 'E  기억 이동', 146, 463, GOLD);
    ctx.restore();
    const fog = ctx.createLinearGradient(0, 620, 0, 720); fog.addColorStop(0, '#14233600'); fog.addColorStop(1, '#111d32d9'); ctx.fillStyle = fog; ctx.fillRect(0, 620, this.width, 100);
    if (model.mode === 'playing' && model.remaining <= 3) { ctx.strokeStyle = `rgba(236,142,131,${0.16 + Math.sin(this.clock * 8) * 0.05})`; ctx.lineWidth = 7; ctx.strokeRect(3, 3, this.width - 6, 714); }
    if (this.flash && !settings.reducedMotion) { ctx.fillStyle = `rgba(248,214,173,${this.flash * 0.45})`; ctx.fillRect(0, 0, this.width, 720); }
  }
  visible(x, w) { return x + w > this.camera - 120 && x < this.camera + this.width + 120; }
  sky(ctx, model, settings) {
    const w = this.width, gradient = ctx.createLinearGradient(0, 0, 0, 720);
    gradient.addColorStop(0, '#182035'); gradient.addColorStop(0.48, '#55536b'); gradient.addColorStop(0.84, '#be9190'); gradient.addColorStop(1, '#6b797e');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, 720);
    for (const s of this.stars) { ctx.globalAlpha = 0.35 + Math.sin((settings.reducedMotion ? 0 : this.clock) * 0.7 + s.phase) * 0.2; ctx.fillStyle = CREAM; ctx.fillRect(s.x * w, s.y * 720, s.r, s.r); } ctx.globalAlpha = 1;
    const sx = w * 0.72 - this.camera * 0.025, sy = 268, r = Math.min(128, w * 0.24);
    const glow = ctx.createRadialGradient(sx, sy, r * 0.2, sx, sy, r * 2.4); glow.addColorStop(0, '#ecb29635'); glow.addColorStop(1, '#ecb29600'); ctx.fillStyle = glow; ctx.fillRect(sx - r * 2.4, sy - r * 2.4, r * 4.8, r * 4.8);
    ctx.fillStyle = '#e5b09a'; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = '#55536b20'; for (let y = sy - r; y < sy + r; y += 7) ctx.fillRect(sx - r, y, r * 2, 2); ctx.restore();
    ctx.strokeStyle = '#edc9ab34'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(sx, sy, r + 25, 0.2, Math.PI * 1.75); ctx.stroke();
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(-0.5); ctx.scale(1.5, 0.35); ctx.strokeStyle = '#eed9be38'; ctx.beginPath(); ctx.arc(0, 0, r + 40, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    this.mountains(ctx, '#56556c', 407, 0.08, 83, 159);
    this.mountains(ctx, '#414c62', 467, 0.17, 105, 264);
    this.ruins(ctx);
    this.mountains(ctx, '#263d50', 572, 0.3, 73, 380);
    ctx.fillStyle = '#eac8b51a';
    for (let i = 0; i < 9; i++) { const x = ((i * 267 - this.camera * 0.09) % (w + 270) + w + 270) % (w + 270) - 150; ctx.fillRect(x, 332 + (i % 3) * 69, 135 + (i % 2) * 70, 2); }
  }
  mountains(ctx, color, baseline, parallax, height, seed) {
    const random = rng(seed); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-220, 720);
    for (let x = -220; x < this.width + 440; x += 85) { const worldX = x - (this.camera * parallax) % 170; ctx.lineTo(worldX, baseline - random() * height); ctx.lineTo(worldX + 42, baseline - random() * height * 0.65); }
    ctx.lineTo(this.width + 440, 720); ctx.closePath(); ctx.fill();
  }
  ruins(ctx) {
    ctx.save(); ctx.translate(-this.camera * 0.19, 0); ctx.fillStyle = '#303d544f';
    for (let x = 90; x < LEVEL.width; x += 330) { ctx.fillRect(x, 357, 110, 290); ctx.fillRect(x - 9, 349, 128, 12); ctx.fillRect(x + 22, 294, 66, 65); ctx.fillRect(x + 43, 275, 22, 22); }
    const x = 925; ctx.fillStyle = '#334258'; ctx.fillRect(x - 40, 280, 80, 323); ctx.fillRect(x - 49, 274, 98, 14); ctx.fillRect(x - 30, 187, 60, 88);
    ctx.beginPath(); ctx.moveTo(x - 43, 188); ctx.lineTo(x, 131); ctx.lineTo(x + 43, 188); ctx.fill();
    ctx.strokeStyle = '#aaa29469'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, 231, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, 216); ctx.lineTo(x, 231); ctx.lineTo(x + 11, 238); ctx.stroke(); ctx.fillStyle = '#232f45';
    for (let y = 312; y < 580; y += 65) { ctx.fillRect(x - 19, y, 12, 26); ctx.fillRect(x + 9, y, 12, 26); }
    ctx.restore();
  }
  scenery(ctx) {
    for (const [x, y, h] of [[235,584,116], [1580,584,99], [1970,584,136], [3240,584,114], [4030,584,156], [5515,584,128]]) {
      if (!this.visible(x, 100)) continue;
      ctx.fillStyle = '#283c49'; ctx.fillRect(x, y - h, 9, h);
      ctx.strokeStyle = '#283c49'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 3, y - h * 0.35); ctx.lineTo(x - 26, y - h * 0.6); ctx.moveTo(x + 5, y - h * 0.65); ctx.lineTo(x + 31, y - h * 0.89); ctx.stroke();
      ctx.fillStyle = '#42615d'; for (let k = 0; k < 4; k++) { const width = 65 - k * 11; ctx.beginPath(); ctx.moveTo(x - width, y - h * 0.5 - k * 20); ctx.lineTo(x + 4, y - h * 1.25 - k * 5); ctx.lineTo(x + width + 7, y - h * 0.5 - k * 20); ctx.fill(); }
    }
    ctx.strokeStyle = '#7c8b8a35'; ctx.lineWidth = 1;
    for (let x = 2290; x < 2970; x += 85) { ctx.beginPath(); ctx.moveTo(x, 588); ctx.lineTo(x + 11, 692); ctx.stroke(); }
  }
  platform(ctx, p) {
    const random = rng(p.x + p.y * 100), floating = p.h < 100;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(p.x, p.y + 6); ctx.lineTo(p.x + p.w, p.y + 6); ctx.lineTo(p.x + p.w, p.y + p.h);
    if (floating) { ctx.lineTo(p.x + p.w * 0.78, p.y + p.h + 21); ctx.lineTo(p.x + p.w * 0.64, p.y + p.h + 16); ctx.lineTo(p.x + p.w * 0.42, p.y + p.h + 43); ctx.lineTo(p.x + p.w * 0.2, p.y + p.h + 14); }
    ctx.lineTo(p.x, p.y + p.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#354d54'; ctx.fillRect(p.x + 2, p.y + 8, p.w - 4, floating ? 13 : 30); ctx.fillStyle = '#527569'; ctx.fillRect(p.x, p.y, p.w, 8); ctx.fillStyle = '#9aa88b'; ctx.fillRect(p.x, p.y, p.w, 3);
    for (let x = p.x + 8; x < p.x + p.w - 5; x += 18) { const t = random(); ctx.fillStyle = '#708f78'; if (t > 0.42) { ctx.fillRect(x, p.y - 3 - t * 5, 2, 6 + t * 5); ctx.fillRect(x + 3, p.y - 2, 3, 4); } if (t > 0.76) { ctx.fillStyle = GOLD; ctx.fillRect(x + 1, p.y - 9, 2, 2); } }
    ctx.fillStyle = '#43616a55'; for (let i = 0; i < p.w / 37; i++) ctx.fillRect(p.x + 12 + random() * (p.w - 25), p.y + 24 + random() * Math.min(p.h, 88), 5 + random() * 19, 2 + random() * 6);
    if (floating) { ctx.fillStyle = '#335649'; ctx.fillRect(p.x + p.w - 23, p.y + 5, 3, p.h + 20); ctx.fillRect(p.x + 18, p.y + 8, 2, p.h + 3); }
  }
  shard(ctx, shard, collected) {
    const y = shard.y + Math.sin(this.clock * 2.6 + shard.x) * 4;
    ctx.save(); ctx.translate(shard.x, y); ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = collected ? '#c6c2a831' : '#f8d99566'; ctx.lineWidth = 1; ctx.strokeRect(-13, -13, 26, 26);
    if (!collected) { ctx.shadowColor = GOLD; ctx.shadowBlur = 16; ctx.fillStyle = GOLD; ctx.fillRect(-6, -6, 12, 12); ctx.shadowBlur = 0; ctx.fillStyle = '#fff3cc'; ctx.fillRect(-4, -5, 3, 8); }
    ctx.restore(); if (!collected) this.text(ctx, '+4s', shard.x, y - 29, 13, CREAM, 'center');
  }
  anchor(ctx, x, y, active, home) {
    ctx.fillStyle = '#213344'; ctx.fillRect(x - 20, y - 9, 40, 9); ctx.fillRect(x - 13, y - 66, 26, 57);
    ctx.strokeStyle = active ? '#cfb58b' : '#789494'; ctx.lineWidth = 3; ctx.strokeRect(x - 14, y - 71, 28, 62);
    ctx.strokeStyle = active ? GOLD : '#657e88'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 8, y - 59); ctx.lineTo(x + 8, y - 21); ctx.lineTo(x - 8, y - 21); ctx.lineTo(x + 8, y - 59); ctx.closePath(); ctx.stroke();
    if (active) { ctx.fillStyle = '#edcf9b'; ctx.fillRect(x - 2, y - 42, 4, 10); ctx.fillStyle = '#eac58b14'; ctx.fillRect(x - 23, y - 90, 46, 90); }
    if (!home) this.text(ctx, active ? '기억의 문 · 개방' : '기억의 문', x, y - 92, 12, active ? CREAM : '#b1c0bc', 'center');
  }
  drone(ctx, d) {
    if (!this.visible(d.x, 40)) return;
    ctx.save(); ctx.translate(d.x, d.y); ctx.strokeStyle = '#ec8e834a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, d.r + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.rotate(this.clock); ctx.fillStyle = '#2b3046'; ctx.fillRect(-12, -12, 24, 24); ctx.strokeStyle = CORAL; ctx.strokeRect(-10, -10, 20, 20); ctx.fillStyle = CORAL; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
  }
  portal(ctx, ready) {
    const p = LEVEL.exit; if (!this.visible(p.x, p.w)) return;
    ctx.fillStyle = '#293b4b'; ctx.fillRect(p.x - 12, p.y - 8, p.w + 24, p.h + 8); ctx.fillStyle = INK; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = ready ? GOLD : '#859295'; ctx.lineWidth = 3; ctx.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 3);
    const gradient = ctx.createLinearGradient(p.x, 0, p.x + p.w, 0); gradient.addColorStop(0, ready ? '#e9bb7444' : '#73929722'); gradient.addColorStop(0.5, ready ? '#ffe1aabf' : '#a4b3ad33'); gradient.addColorStop(1, ready ? '#e9bb7444' : '#73929722'); ctx.fillStyle = gradient; ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, p.h - 6);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = ready ? GOLD : '#8b969855'; ctx.fillRect(p.x + 5 + i * 12, p.y - 22, 5, 5); }
    this.text(ctx, ready ? '내일로 가는 문' : '여섯 기억이 필요합니다', p.x + p.w / 2, p.y - 39, 13, CREAM, 'center');
  }
  player(ctx, p, alpha = 1, ghost = false) {
    ctx.save(); ctx.globalAlpha = alpha; const x = Math.round(p.x), y = Math.round(p.y), moving = Math.abs(p.vx) > 12;
    if (!ghost) { ctx.fillStyle = '#0b142640'; ctx.beginPath(); ctx.ellipse(x + 12, y + 38, 15, 3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.translate(x + 12, y + 36); ctx.scale(1 + (p.squash || 0), 1 - (p.squash || 0)); ctx.translate(-12, -36);
    const bob = p.grounded && moving ? Math.sin(this.clock * 23) * 1 : 0; ctx.translate(0, bob);
    const stride = p.grounded && moving ? Math.sin(this.clock * 20) * 4 : 1;
    ctx.fillStyle = ghost ? '#b9d8df' : '#263c50'; ctx.fillRect(3 + stride, 28, 7, 8); ctx.fillRect(14 - stride, 28, 7, 8);
    ctx.fillStyle = ghost ? '#b9d8df' : '#c4d6d2'; ctx.fillRect(3, 13, 18, 17); ctx.fillRect(1, 20, 22, 8);
    ctx.fillStyle = ghost ? '#d1eef2' : '#edf0d8'; ctx.fillRect(4, 3, 16, 15); ctx.fillRect(1, 7, 22, 9); ctx.fillRect(7, 0, 10, 5);
    ctx.fillStyle = '#253649'; ctx.fillRect(p.facing > 0 ? 12 : 3, 8, 9, 6); ctx.fillStyle = '#fff0c8'; ctx.fillRect(p.facing > 0 ? 18 : 4, 9, 2, 2);
    ctx.fillStyle = ghost ? '#b9d8df' : CORAL; ctx.fillRect(2, 16, 20, 4); ctx.fillRect(p.facing > 0 ? -8 : 19, 18 + Math.sin(this.clock * 9) * 1.5, 12, 4); ctx.fillRect(p.facing > 0 ? -12 : 28, 17, 5, 4);
    ctx.fillStyle = ghost ? '#d1eef2' : '#f4cb87'; ctx.fillRect(9, 23, 4, 4); ctx.restore();
  }
  text(ctx, value, x, y, size, color, align = 'left') { ctx.font = `${size}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(value, x, y); ctx.textAlign = 'left'; }
  label(ctx, value, x, y, color) { ctx.font = '12px sans-serif'; const w = ctx.measureText(value).width + 22; ctx.fillStyle = '#192738d9'; ctx.fillRect(x - w / 2, y - 17, w, 26); this.text(ctx, value, x, y, 12, color, 'center'); }
}
