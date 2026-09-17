import { Input } from './core/input.js';
import { SaveStore } from './core/storage.js';
import { Sound } from './core/audio.js';
import { GameModel } from './game/model.js';
import { RULES, LEVEL } from './game/level.js';
import { Renderer } from './render/renderer.js';
import { HUD } from './ui/hud.js';

const root = document.querySelector('#app');
let browserStorage; try { browserStorage = window.localStorage; } catch { /* Private or file-based context. */ }
const store = new SaveStore(browserStorage), saved = store.read();
const settings = { sound: saved.sound, ghost: saved.ghost, reducedMotion: typeof saved.reducedMotion === 'boolean' ? saved.reducedMotion : window.matchMedia('(prefers-reduced-motion: reduce)').matches };
const model = new GameModel(saved.progress), renderer = new Renderer(document.querySelector('#world')), ui = new HUD(root), sound = new Sound(settings.sound);
const input = new Input(root, () => model.mode === 'playing');
const $ = id => document.getElementById(id);
let accumulator = 0, lastFrame = performance.now(), previousTick = 10, storageWarning = false;
function save() {
  if (!store.write(model.progress, settings) && !storageWarning) { storageWarning = true; ui.toast('이 브라우저에서는 자동 저장이 제한됩니다.', '이 탭을 닫기 전까지는 계속 플레이할 수 있습니다.'); }
}
function start(fresh = false) { input.clear(); accumulator = 0; sound.unlock(); model.start(fresh); renderer.snap(model); $('start-button').blur(); }
function pause() { input.clear(); if (model.mode === 'paused') model.resume(); else model.pause(); accumulator = 0; }
function title() { input.clear(); model.mode = 'title'; save(); renderer.camera = 0; }
function bind(id, handler) { $(id).addEventListener('click', handler); }
bind('start-button', () => start()); bind('pause-button', pause); bind('resume-button', pause);
bind('title-button', title); bind('win-title-button', title); bind('replay-button', () => start(true));
bind('home-link', event => { event.preventDefault(); if (model.mode === 'playing' || model.mode === 'rewinding') pause(); else if (model.mode === 'won') title(); });
bind('sound-button', () => { settings.sound = !settings.sound; sound.enabled = settings.sound; sound.unlock(); if (settings.sound) sound.tone(523, 0.1); save(); });
bind('ghost-button', () => { settings.ghost = !settings.ghost; save(); });
bind('motion-button', () => { settings.reducedMotion = !settings.reducedMotion; save(); });
bind('fullscreen-button', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else if (root.requestFullscreen) await root.requestFullscreen(); else ui.toast('이 브라우저는 전체 화면 전환을 지원하지 않습니다.'); } catch { ui.toast('전체 화면을 열 수 없습니다. 브라우저에서 계속 플레이해 주세요.'); } });
bind('help-button', () => $('help-dialog').showModal()); bind('help-close', () => $('help-dialog').close());
bind('restart-button', () => $('reset-dialog').showModal()); bind('reset-cancel', () => $('reset-dialog').close());
bind('reset-confirm', () => { $('reset-dialog').close(); start(true); });
window.addEventListener('keydown', event => {
  if ($('help-dialog').open || $('reset-dialog').open) return;
  if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); pause(); }
  if (event.code === 'Space' && model.mode === 'title' && !['BUTTON', 'A'].includes(document.activeElement?.tagName)) { event.preventDefault(); start(); }
  if (event.code === 'Tab' && ['paused', 'won'].includes(model.mode)) {
    const screen = $(model.mode === 'paused' ? 'pause-screen' : 'win-screen'), focusables = [...screen.querySelectorAll('button')], first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { input.clear(); model.pause(); save(); } });
window.addEventListener('blur', () => { input.clear(); model.pause(); });
window.addEventListener('pagehide', save);
function handleEvents() {
  for (const event of model.drainEvents()) {
    renderer.handle(event, model); sound.play(event.type);
    if (event.type === 'save') save();
    if (event.type === 'shard') ui.toast(`시간 파편을 찾았습니다 · 다음 루프 ${event.next}초`, `+4초는 다음 되감기부터 적용됩니다. (${model.progress.shards.length}/6)`);
    if (event.type === 'anchor') ui.toast('기억의 문이 영구 개방되었습니다.', '다음 루프의 시작점에서 E / 기억 이동 버튼을 사용하세요.');
    if (event.type === 'travel') ui.toast(`${LEVEL.zones[event.zone].name}으로 돌아왔습니다.`);
    if (event.type === 'zone') ui.announce(event.zone);
    if (event.type === 'locked') ui.toast(`아직 ${event.missing}개의 기억이 필요합니다.`, '되감아도 모은 파편과 열린 문은 남습니다.');
    if (event.type === 'loop') { input.clear(); previousTick = model.loopLimit; }
  }
}
function frame(now) {
  const dt = Math.min(Math.max((now - lastFrame) / 1000, 0), 0.1); lastFrame = now;
  if (!document.hidden) {
    accumulator = Math.min(accumulator + dt, 0.1);
    while (accumulator >= RULES.step) { model.step(RULES.step, input.sample()); accumulator -= RULES.step; }
    handleEvents();
    const tick = Math.ceil(model.remaining);
    if (model.mode === 'playing' && tick !== previousTick && tick <= 3 && tick > 0) sound.play('tick'); previousTick = tick;
    renderer.draw(model, dt, settings); ui.render(model, settings);
  }
  requestAnimationFrame(frame);
}
ui.render(model, settings); requestAnimationFrame(frame);
// Read-only diagnostics for reproducible testing. No state setters or cheat actions.
{
  Object.defineProperty(window, '__timeSlip', { value: Object.freeze({ snapshot: () => JSON.parse(JSON.stringify({ mode: model.mode, player: model.player, remaining: model.remaining, limit: model.loopLimit, nextLimit: model.nextLimit, progress: model.progress, canTravel: model.canTravel })) }) });
}
