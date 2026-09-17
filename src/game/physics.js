import { approach, overlaps, clamp } from '../core/math.js';
import { RULES, LEVEL } from './level.js';
export function createPlayer() { return { ...LEVEL.spawn, w: 24, h: 36, vx: 0, vy: 0, grounded: true, coyote: 0, buffer: 0, facing: 1, squash: 0 }; }
/** Axis-separated, fixed-step AABB collision; no browser or rendering dependency. */
export function movePlayer(p, input, dt, platforms = LEVEL.platforms) {
  const wasGrounded = p.grounded;
  p.coyote = p.grounded ? RULES.coyote : Math.max(0, p.coyote - dt);
  p.buffer = input.jumpPressed ? RULES.jumpBuffer : Math.max(0, p.buffer - dt);
  p.vx = approach(p.vx, clamp(input.move || 0, -1, 1) * RULES.speed, (input.move ? RULES.acceleration : RULES.friction) * dt);
  if (input.move) p.facing = input.move > 0 ? 1 : -1;
  let jumped = false;
  if (p.buffer > 0 && p.coyote > 0) { p.vy = -RULES.jump; p.grounded = false; p.coyote = 0; p.buffer = 0; p.squash = -0.16; jumped = true; }
  if (!input.jumpDown && p.vy < -270) p.vy = -270;
  p.vy = Math.min(p.vy + RULES.gravity * dt, 1050);
  p.x += p.vx * dt;
  for (const b of platforms) if (overlaps(p, b)) { p.x = p.vx > 0 ? b.x - p.w : p.vx < 0 ? b.x + b.w : p.x; p.vx = 0; }
  p.x = clamp(p.x, 0, LEVEL.width - p.w);
  p.y += p.vy * dt; p.grounded = false;
  for (const b of platforms) if (overlaps(p, b)) {
    if (p.vy >= 0) { p.y = b.y - p.h; p.grounded = true; }
    else p.y = b.y + b.h;
    p.vy = 0;
  }
  const landed = !wasGrounded && p.grounded;
  if (landed) p.squash = 0.2;
  p.squash = approach(p.squash, 0, dt * 1.8);
  return { jumped, landed };
}
