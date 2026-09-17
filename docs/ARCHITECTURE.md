# 디자인과 개발 구조

## 디자인 컨셉

**새벽빛 폐허 속, 작은 여행자가 시간을 되찾는 여정.**

큰 태양, 멈춘 시계탑, 겹겹의 산, 공중 발판은 단순한 도형으로 그립니다. 캐릭터와 파편에는 작은 사각형을 사용해 픽셀 인상을 더합니다. 실사 리소스나 외부 폰트 없이도 분위기를 유지하는 것이 목표입니다.

| 역할 | 색상 | 적용 |
| --- | --- | --- |
| 바탕 | `#172236` | 밤하늘, 메뉴, 암석의 그림자 |
| 주요 정보 | `#f4ead5` | 제목, 남은 시간, 핵심 버튼 |
| 성장 | `#f8c77d` | 파편, 열린 문, 다음 루프 시간 |
| 위험 | `#ec8e83` | 가시, 움직이는 균열, 3초 이하 경고 |
| 이동 가능 표면 | `#527569`, `#9aa88b` | 발판과 상단 하이라이트 |

골드와 코럴은 기능에 연결합니다. 배경은 대비를 낮추고, 실제로 밟는 발판의 상단은 밝은 선으로 구분합니다. 캐릭터는 밝은 몸과 코럴색 스카프로 위치를 읽기 쉽게 했습니다.

## 선택한 스택

| 계층 | 선택 | 선택 이유 |
| --- | --- | --- |
| 게임 로직 | JavaScript ES Modules | 작은 MVP에서 역할별 분리와 직접 테스트를 우선 |
| 렌더링 | Canvas 2D | 절차적 도형, 패럴랙스, 파티클을 하나의 화면에서 처리 |
| 인터페이스 | HTML + CSS | 접근 가능한 버튼, 다이얼로그, 모바일 레이아웃 |
| 효과음 | Web Audio | 별도 오디오 파일 없이 짧은 신호음을 합성 |
| 저장 | localStorage 어댑터 | 계정 없이 파편·문·최고 기록을 유지 |
| 실행·패키징 | Node.js 내장 모듈 | 패키지 설치 없이 개발 서버, 검사, 테스트, 빌드 실행 |
| 브라우저 검증 | Python Playwright | 키보드 완주와 네이티브 멀티터치 검증용, 선택 의존성 |

런타임 의존성 0개. 빌드 후 HTML 하나로 배포할 수 있지만 개발 소스는 하나의 파일로 합치지 않습니다.

## 모듈 책임

| 모듈 | 책임 |
| --- | --- |
| `core/math.js` | 충돌·보간·결정적 배경 난수 |
| `core/input.js` | 키보드 및 포인터 입력, 동시 입력, 입력 해제 |
| `core/storage.js` | 저장소 접근 실패 처리, 읽기와 쓰기 |
| `core/audio.js` | 사용자 활성화 이후 합성 효과음 |
| `game/level.js` | 위치·발판·파편·위험물·지역과 튜닝 수치 |
| `game/progress.js` | 영구 성장 규칙과 저장 데이터 검증 |
| `game/physics.js` | 브라우저와 무관한 고정 시간 간격 이동·충돌 |
| `game/replay.js` | 직전 루프 좌표 기록·보간 |
| `game/model.js` | 상태 전이, 타이머, 획득, 지름길, 클리어 |
| `render/particles.js` | 제한된 수의 시각 효과 |
| `render/renderer.js` | 카메라·배경·캐릭터·오브젝트·되감기 표현 |
| `ui/hud.js` | 타이머·수집 상태·안내·메뉴 표시 |
| `main.js` | 모듈 연결, 이벤트 처리, 120Hz 시뮬레이션 루프 |

## 상태와 데이터 흐름

```text
키보드 / 터치 → Input → GameModel → 이벤트 → HUD / Renderer / Sound / SaveStore
                             ↓
                          Physics
                             ↓
                           Replay
```

```text
title → playing → rewinding → playing
             ↕        ↕
           paused    paused
             ↓
            won → 새 여정 / title
```

상태 전이의 실제 기준은 `GameModel`입니다. `won`은 `playing` 중 여섯 기억을 가진 채 출구에 닿을 때만 발생합니다. 일시정지는 이전 상태를 보관했다가 그 상태로 복귀합니다.

실행 간격은 1/120초로 고정하고 렌더링은 requestAnimationFrame을 사용합니다. 긴 프레임의 누적 연산은 0.1초로 제한합니다. 창이 비활성화되면 게임을 일시정지하므로 방치 중 무한히 루프 수가 늘지 않습니다.

## 저장과 오류 처리

`time-slip:save:v1`에 파편 ID, 열린 문 ID, 루프·실패 횟수, 총 플레이 시간, 최고 기록과 설정을 저장합니다. JSON 손상, 다른 버전, 잘못된 ID, 중복 ID, 유효하지 않은 숫자를 검증합니다.

저장소가 막혀도 게임은 중단하지 않고 탭 안에서 계속 동작하며 저장 제한을 알립니다. 클라우드 동기화는 없습니다. 파편 획득, 문 개방, 되감기, 일시정지, 페이지 이탈 시 저장합니다.

## 빌드와 배포

`build.mjs`는 정적 상대 import의 존재를 검증하고, 각 모듈을 data URL로 변환해 네이티브 import map에 등록합니다. CSS도 HTML에 포함합니다. 결과물은 외부 폰트·이미지·스크립트를 요청하지 않는 단일 HTML입니다.

`dist/`는 빌드 결과, `prototype/`은 공유용 결과입니다. Vercel용 빌드 및 출력 경로는 `vercel.json`에 지정했습니다. CSP를 별도로 설정하는 호스팅에서는 inline script와 data URL 모듈을 허용해야 합니다.

`window.__timeSlip.snapshot()`은 테스트용 읽기 전용 사본을 반환합니다. 위치·시간·진행도를 쓰는 API나 치트 동작은 제공하지 않습니다.

## 공식 기술 참고

- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [Import maps](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/script/type/importmap)
- [Playwright Clock](https://playwright.dev/python/docs/clock)
- [Vercel deployments](https://vercel.com/docs/deployments/overview)
