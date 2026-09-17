import { GameModel, IDLE_INPUT } from '../src/game/model.js';
import { RULES } from '../src/game/level.js';
export function completeRoute(log = false) {
  const model = new GameModel(); model.start();
  const history = [];
  function navigate(target, jump = false) {
    let frames = 0;
    while (frames < 720) {
      const move = model.player.x < target ? 1 : 0;
      model.step(RULES.step, { ...IDLE_INPUT, move, jumpPressed: jump && frames === 0, jumpDown: jump });
      frames++;
      if (model.mode !== 'playing') throw new Error(`${jump ? 'jump' : 'walk'} → ${target}: ${model.mode}/${model.reason} at (${model.player.x.toFixed(1)},${model.player.y.toFixed(1)}), time ${model.loopTime.toFixed(2)}`);
      if (!move && model.player.grounded && Math.abs(model.player.vx) < 1 && frames > 4) break;
    }
    if (frames >= 720) throw new Error(`Could not reach ${target}, now ${model.player.x},${model.player.y}`);
    const row = { target, jump, x: +model.player.x.toFixed(1), y: +model.player.y.toFixed(1), time: +model.loopTime.toFixed(2), memories: model.progress.shards.length };
    history.push(row); if (log) console.log(row);
  }
  function nextLoop() {
    model.rewind('manual'); while (model.mode === 'rewinding') model.step(RULES.step);
    model.step(RULES.step, { ...IDLE_INPUT, interactPressed: true });
    if (log) console.log('LOOP',model.progress.loops,'LIMIT',model.loopLimit,'TRAVEL',model.player.x);
  }
  navigate(315); navigate(480,true); navigate(650,true); navigate(925); navigate(975); navigate(1140,true); navigate(1280,true); navigate(1440,true); navigate(1760);
  nextLoop();
  navigate(2125); navigate(2330,true); navigate(2380); navigate(2580,true); navigate(2640); navigate(2840,true); navigate(2920); navigate(3200,true); navigate(3260); navigate(3435,true); navigate(3590); navigate(3610); navigate(3820,true); navigate(3910);
  nextLoop();
  navigate(4120); navigate(4300,true); navigate(4345); navigate(4510,true); navigate(4580); navigate(4750,true); navigate(4810); navigate(4980,true); navigate(5240); navigate(5285); navigate(5475,true);
  let frames = 0;
  while(model.mode==='playing' && frames++ < 400) model.step(RULES.step,{...IDLE_INPUT,move:1});
  if(model.mode!=='won') throw new Error(`Final portal unreachable: ${model.mode}/${model.reason}`);
  return { model, history };
}
if (process.argv[1]?.endsWith('route-check.mjs')) { try { const { model } = completeRoute(true); console.log('COMPLETE', JSON.stringify(model.progress)); } catch (err) { console.error(err.message); process.exit(1); } }
