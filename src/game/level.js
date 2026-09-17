export const RULES = Object.freeze({ baseTime: 10, shardBonus: 4, gravity: 1700, speed: 305, jump: 650, acceleration: 2600, friction: 3000, coyote: 0.12, jumpBuffer: 0.14, step: 1 / 120, rewindDuration: 0.72 });
export const LEVEL = {
  width: 5890, height: 720, spawn: { x: 140, y: 548 },
  zones: [
    { x: 0, name: '멈춘 정원', label: 'THE STILL GARDEN' },
    { x: 1850, name: '잊힌 수도교', label: 'THE LOST AQUEDUCT' },
    { x: 3750, name: '새벽 관측소', label: 'THE DAWN OBSERVATORY' }
  ],
  platforms: [
    { x: 0, y: 584, w: 680, h: 150 }, { x: 390, y: 510, w: 150, h: 28 }, { x: 595, y: 438, w: 150, h: 30 },
    { x: 790, y: 584, w: 510, h: 160 }, { x: 1190, y: 510, w: 150, h: 30 }, { x: 1380, y: 438, w: 155, h: 30 },
    { x: 1410, y: 584, w: 770, h: 170 },
    { x: 2260, y: 552, w: 170, h: 42 }, { x: 2520, y: 478, w: 165, h: 38 }, { x: 2770, y: 414, w: 185, h: 42 },
    { x: 3020, y: 584, w: 640, h: 170 }, { x: 3140, y: 506, w: 160, h: 32 }, { x: 3350, y: 432, w: 190, h: 32 },
    { x: 3770, y: 584, w: 460, h: 190 }, { x: 4210, y: 506, w: 175, h: 38 },
    { x: 4440, y: 434, w: 180, h: 38 }, { x: 4670, y: 370, w: 180, h: 42 }, { x: 4915, y: 450, w: 175, h: 46 },
    { x: 5180, y: 584, w: 710, h: 180 }
  ],
  shards: [
    { id: 'garden-1', x: 665, y: 398, name: '첫 번째 기억' }, { id: 'garden-2', x: 1460, y: 398, name: '정원의 기억' },
    { id: 'water-1', x: 2602, y: 438, name: '물결의 기억' }, { id: 'water-2', x: 3445, y: 392, name: '다리의 기억' },
    { id: 'dawn-1', x: 4525, y: 394, name: '하늘의 기억' }, { id: 'dawn-2', x: 4995, y: 410, name: '내일의 기억' }
  ],
  anchors: [ { id: 'water', x: 1770, y: 584, zone: 1 }, { id: 'dawn', x: 3920, y: 584, zone: 2 } ],
  spikes: [ { x: 1030, y: 568, w: 85, h: 16 }, { x: 5330, y: 568, w: 98, h: 16 } ],
  drones: [ { x: 3100, y: 553, r: 16, range: 60, speed: 1.6, axis: 'x' }, { x: 4858, y: 468, r: 16, range: 45, speed: 1.8, axis: 'y' } ],
  exit: { x: 5660, y: 466, w: 78, h: 118 },
  signs: [
    { x: 175, y: 624, text: '처음은 언제나 여기서' }, { x: 410, y: 575, text: '길게 눌러, 더 높이' },
    { x: 880, y: 632, text: '떨어져도 기억은 남습니다' }, { x: 2150, y: 646, text: '끝에서 뛰면, 닿습니다' },
    { x: 5520, y: 632, text: '여섯 개의 기억. 한 번의 내일.' }
  ]
};
export function zoneAt(x) { return x >= 3750 ? 2 : x >= 1850 ? 1 : 0; }
export function droneAt(drone, time) { return { ...drone, [drone.axis]: drone[drone.axis] + Math.sin(time * drone.speed) * drone.range }; }
