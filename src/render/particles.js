export class Particles {
  constructor() { this.items = []; }
  burst(x, y, color, count = 12, force = 130) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = force * (0.25 + Math.random() * 0.75), life = 0.3 + Math.random() * 0.7;
      this.items.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 35, life, max: life, size: 2 + Math.random() * 3, color });
    }
    if (this.items.length > 220) this.items.splice(0, this.items.length - 220);
  }
  update(dt) { this.items = this.items.filter(p => { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 110 * dt; return p.life > 0; }); }
  draw(ctx) { for (const p of this.items) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size); } ctx.globalAlpha = 1; }
}
