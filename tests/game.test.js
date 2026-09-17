import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel, IDLE_INPUT } from '../src/game/model.js';
import { LEVEL, RULES } from '../src/game/level.js';
import { freshProgress, capacity, collect, sanitizeProgress } from '../src/game/progress.js';
import { createPlayer, movePlayer } from '../src/game/physics.js';
import { Replay } from '../src/game/replay.js';
import { SaveStore } from '../src/core/storage.js';
const step = (m, seconds, input = IDLE_INPUT) => { for (let i = 0; i < Math.ceil(seconds / RULES.step); i++) m.step(RULES.step, { ...IDLE_INPUT, ...input, jumpPressed: i === 0 && input.jumpPressed, rewindPressed: i === 0 && input.rewindPressed }); };

test('a new journey starts with exactly ten seconds', () => { const m = new GameModel(); m.start(); assert.equal(m.remaining, 10); assert.equal(m.progress.loops, 1); });
test('unique shards add four seconds; invalid or duplicate IDs never farm time', () => { const p = freshProgress(); assert.equal(collect(p, 'garden-1'), true); assert.equal(collect(p, 'garden-1'), false); assert.equal(collect(p, 'fake'), false); assert.equal(capacity(p), 14); });
test('all six shards cap the loop at 34 seconds', () => { const p = freshProgress(); LEVEL.shards.forEach(s => collect(p, s.id)); assert.equal(capacity(p), 34); });
test('collecting a shard does not refill the current timer', () => { const m = new GameModel(); m.start(); m.player.x = 653; m.player.y = 402; m.step(RULES.step); assert.equal(m.nextLimit, 14); assert.equal(m.loopLimit, 10); assert.ok(m.remaining < 10); });
test('timeout automatically returns to the real origin and begins the next loop', () => { const m = new GameModel(); m.start(); step(m, 10.1); assert.equal(m.mode, 'rewinding'); step(m, 0.8); assert.equal(m.mode, 'playing'); assert.equal(m.progress.loops, 2); assert.equal(m.player.x, LEVEL.spawn.x); });
test('rewinding retains shards and starts a longer loop', () => { const p = freshProgress(); collect(p, 'garden-1'); const m = new GameModel(p); m.start(); collect(m.progress, 'garden-2'); m.rewind(); step(m, 0.8); assert.equal(m.loopLimit, 18); assert.deepEqual(m.progress.shards, ['garden-1', 'garden-2']); });
test('pause freezes both the current timer and total play time', () => { const m = new GameModel(); m.start(); step(m, 1); m.pause(); const t = m.remaining, total = m.progress.totalTime; step(m, 3); assert.equal(m.remaining, t); assert.equal(m.progress.totalTime, total); m.resume(); step(m, 1); assert.ok(m.remaining < t); });
test('falling loses no memory and only increments death once', () => { const m = new GameModel(); m.start(); collect(m.progress, 'garden-1'); m.player.y = 800; m.step(RULES.step); assert.equal(m.mode, 'rewinding'); assert.equal(m.progress.deaths, 1); step(m, 0.4); assert.equal(m.progress.deaths, 1); assert.equal(m.progress.shards.length, 1); });
test('shortcut is unavailable until its real anchor has been reached', () => { const m = new GameModel(); m.start(); m.step(RULES.step, { ...IDLE_INPUT, interactPressed: true }); assert.equal(m.player.x, LEVEL.spawn.x); m.player.x = 1760; m.player.y = 548; m.step(RULES.step); assert.deepEqual(m.progress.anchors, ['water']); m.rewind(); step(m, 0.8); assert.equal(m.canTravel, true); m.step(RULES.step, { ...IDLE_INPUT, interactPressed: true }); assert.equal(m.player.x, 1770); });
test('exit is locked without six real memories', () => { const m = new GameModel(); m.start(); m.player.x = 5670; m.player.y = 548; m.step(RULES.step); assert.equal(m.mode, 'playing'); assert.ok(m.drainEvents().some(e => e.type === 'locked')); });
test('best clear record survives starting a fresh journey', () => { const p = freshProgress({ time: 80, loops: 4 }); collect(p, 'garden-1'); const m = new GameModel(p); m.start(true); assert.equal(m.progress.shards.length, 0); assert.equal(m.progress.loops, 1); assert.equal(m.progress.best.time, 80); });
test('storage validation rejects invalid IDs, duplicate shards and nonfinite statistics', () => { const p = sanitizeProgress({ version: 1, shards: ['fake', 'garden-1', 'garden-1'], anchors: ['dawn', 'oops'], loops: -5, totalTime: Infinity, deaths: NaN }); assert.deepEqual(p.shards, ['garden-1']); assert.deepEqual(p.anchors, ['dawn']); assert.equal(p.loops, 0); assert.equal(p.totalTime, 0); });
test('missing, malformed and older save data never stop the game', () => { const bad = new SaveStore({ getItem: () => '{broken', setItem: () => { throw new Error('denied'); } }); assert.equal(capacity(bad.read().progress), 10); assert.equal(bad.write(freshProgress(), {}), false); assert.equal(capacity(sanitizeProgress({ version: 99 })), 10); });
test('save round trip restores progress and sound preferences', () => { const map = new Map(), store = new SaveStore({ getItem: k => map.get(k), setItem: (k, v) => map.set(k, v) }); const p = freshProgress(); collect(p, 'water-1'); store.write(p, { sound: true, ghost: false }); assert.deepEqual(store.read().progress.shards, ['water-1']); assert.equal(store.read().sound, true); assert.equal(store.read().ghost, false); });
test('holding jump yields a materially higher apex than tapping', () => { const run = hold => { const p = createPlayer(); let min = p.y; for (let i = 0; i < 120; i++) { movePlayer(p, { move: 0, jumpPressed: i === 0, jumpDown: i < hold }, RULES.step); min = Math.min(min, p.y); } return min; }; assert.ok(run(90) + 50 < run(3)); });
test('coyote jump works briefly after walking off a ledge', () => { const p = createPlayer(); p.x = 681; p.grounded = true; movePlayer(p, { move: 0, jumpDown: false }, RULES.step); for (let i = 0; i < 6; i++) movePlayer(p, { move: 0, jumpDown: false }, RULES.step); const event = movePlayer(p, { move: 0, jumpPressed: true, jumpDown: true }, RULES.step); assert.equal(event.jumped, true); assert.ok(p.vy < 0); });
test('jump input just before landing is buffered', () => { const p = createPlayer(); p.y = 519; p.grounded = false; p.vy = 350; let jumped = false; for (let i = 0; i < 20; i++) { const e = movePlayer(p, { move: 0, jumpPressed: i === 0, jumpDown: true }, RULES.step); jumped ||= e.jumped; } assert.equal(jumped, true); });
test('standing is stable after 1200 fixed simulation steps', () => { const p = createPlayer(); for (let i = 0; i < 1200; i++) movePlayer(p, IDLE_INPUT, RULES.step); assert.equal(p.y, LEVEL.spawn.y); assert.equal(p.vy, 0); assert.equal(p.grounded, true); });
test('replay interpolates and does not keep displaying a finished ghost', () => { const r = new Replay(); r.record(0, { x: 0, y: 0, facing: 1 }); r.record(1, { x: 100, y: 50, facing: 1 }); r.commit(); assert.equal(r.at(0.5).x, 50); assert.equal(r.at(1.1), null); assert.equal(r.frames.length, 0); });
test('level data has unique persistent IDs and positive platform sizes', () => { assert.equal(new Set(LEVEL.shards.map(s => s.id)).size, 6); assert.equal(new Set(LEVEL.anchors.map(s => s.id)).size, 2); assert.ok(LEVEL.platforms.every(p => p.w > 0 && p.h > 0 && p.x >= 0)); });

// End-to-end simulation uses only walking, jumping, R and the unlocked E shortcut.
// No player coordinates or collected objects are injected into this route.
test('a complete three-loop route collects all memories and reaches the ending with real physics', async () => {
  const { completeRoute } = await import('../scripts/route-check.mjs');
  const { model } = completeRoute();
  assert.equal(model.mode, 'won'); assert.equal(model.progress.shards.length, 6);
  assert.equal(model.progress.anchors.length, 2); assert.equal(model.progress.loops, 3);
  assert.equal(model.progress.deaths, 0); assert.ok(model.progress.totalTime < 30);
});
