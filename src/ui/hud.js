import { LEVEL } from '../game/level.js';
const text = (element, value) => { if (element.textContent !== String(value)) element.textContent = String(value); };
export const formatTime = seconds => seconds >= 60 ? `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}` : `${seconds.toFixed(1)}s`;
export class HUD {
  constructor(root) {
    this.root = root; this.lastMode = null; this.toastUntil = 0; this.announceUntil = 0;
    this.el = Object.fromEntries([...root.querySelectorAll('[id]')].map(el => [el.id, el]));
    this.slots = LEVEL.shards.map(shard => { const el = document.createElement('i'); el.setAttribute('role', 'img'); el.setAttribute('aria-label', shard.name + ' 미수집'); this.el['shard-slots'].append(el); return el; });
  }
  toast(message, detail = '') {
    const el = this.el.toast; el.replaceChildren(document.createTextNode(message));
    if (detail) { const small = document.createElement('small'); small.textContent = detail; el.append(small); }
    el.hidden = false; this.toastUntil = performance.now() + 3300;
  }
  announce(zone) {
    text(this.el['announce-number'], `CHAPTER 0${zone + 1}`); text(this.el['announce-name'], LEVEL.zones[zone].name);
    this.el['zone-announcement'].hidden = false; this.announceUntil = performance.now() + 2300;
  }
  render(model, settings) {
    const e = this.el, playing = model.mode === 'playing', paused = model.mode === 'paused', title = model.mode === 'title';
    if (model.mode !== this.lastMode) {
      this.root.dataset.mode = model.mode;
      e['title-screen'].hidden = !title; e['pause-screen'].hidden = !paused; e['win-screen'].hidden = model.mode !== 'won';
      e['rewind-screen'].hidden = model.mode !== 'rewinding'; e['timer-panel'].hidden = title || model.mode === 'won';
      e['game-info'].hidden = title || model.mode === 'won'; e['pause-button'].hidden = title || model.mode === 'won';
      e['touch-controls'].hidden = !playing;
      if (paused) e['resume-button'].focus({ preventScroll: true });
      if (model.mode === 'won') { e['replay-button'].focus({ preventScroll: true }); text(e['win-loops'], model.progress.loops); text(e['win-time'], formatTime(model.progress.totalTime)); text(e['best-record'], `이 브라우저의 최고 기록 · ${formatTime(model.progress.best?.time || model.progress.totalTime)}`); }
      if (title) { text(e['start-button'], model.progress.loops ? '기억 이어가기 →' : '첫 루프 시작 →'); text(e['save-hint'], model.progress.loops ? `기억 ${model.progress.shards.length}/6 저장됨 · ${model.nextLimit}초로 시작` : '설치 없이, 바로 탐험하세요.'); }
      this.lastMode = model.mode;
    }
    text(e.time, model.remaining.toFixed(2).padStart(5, '0')); text(e.limit, `/ ${model.loopLimit}s`); text(e['loop-number'], String(model.progress.loops).padStart(3, '0'));
    text(e['next-limit'], `${model.nextLimit}초`); e['next-time'].classList.toggle('pending', model.nextLimit > model.loopLimit);
    e['timer-panel'].classList.toggle('urgent', model.remaining <= 3); e['timer-fill'].style.transform = `scaleX(${model.remaining / model.loopLimit})`;
    text(e['shard-count'], model.progress.shards.length);
    this.slots.forEach((slot, i) => { const found = model.progress.shards.includes(LEVEL.shards[i].id); slot.classList.toggle('collected', found); slot.setAttribute('aria-label', `${LEVEL.shards[i].name} ${found ? '수집 완료' : '미수집'}`); });
    const zone = LEVEL.zones[model.zone]; text(e['zone-index'], `0${model.zone + 1}`); text(e['zone-name'], zone.name); text(e['zone-english'], zone.label);
    e['journey-fill'].style.width = `${Math.min(100, model.player.x / LEVEL.exit.x * 100)}%`;
    e['travel-button'].hidden = !model.canTravel; e['desktop-travel'].style.opacity = model.canTravel ? '1' : '.4';
    e['sound-button'].setAttribute('aria-pressed', String(settings.sound)); e['sound-button'].setAttribute('aria-label', settings.sound ? '소리 끄기' : '소리 켜기'); e['sound-button'].title = settings.sound ? '소리 끄기' : '소리 켜기';
    e['ghost-button'].setAttribute('aria-pressed', String(settings.ghost)); text(e['ghost-button'], settings.ghost ? '켜짐' : '꺼짐');
    e['motion-button'].setAttribute('aria-pressed', String(settings.reducedMotion)); text(e['motion-button'], settings.reducedMotion ? '켜짐' : '꺼짐');
    const reason = { manual: '스스로 선택한 다음 기회', time: '시간의 끝', fall: '아직 닿지 못했을 뿐', hazard: '다른 길이 있을 거예요' };
    text(e['rewind-reason'], reason[model.reason] || '시간의 끝'); text(e['rewind-next'], `다음 루프 ${model.nextLimit}초`);
    if (performance.now() > this.toastUntil) e.toast.hidden = true;
    if (performance.now() > this.announceUntil || title || paused || model.mode === 'rewinding') e['zone-announcement'].hidden = true;
  }
}
