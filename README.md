# TIME SLIP · 10초 너머

**세상은 10초마다 되감깁니다. 하지만 당신이 발견한 시간은 남습니다.**

짧은 루프를 반복하며 시간 파편을 모으고, 기억의 문으로 길을 단축해, 내일에 도착하는 2D 플랫포머 MVP입니다.

## 플레이

**[브라우저에서 플레이](https://rawcdn.githack.com/W-X-Z/Time-slip/fc847418cf08ee632a8b5987342ef335fac3cd01/prototype/index.html)**

첫 접속 시 GitHack의 외부 HTML 확인 화면이 나타날 수 있습니다. 목적지가 이 저장소의 `prototype/index.html`인지 확인하고 계속 진행합니다. 정적 데모 링크이며 계정이나 결제는 필요하지 않습니다.

`prototype/index.html`은 빌드 후 생성되는 독립 실행 파일입니다. 다운로드해 브라우저로 열거나 정적 호스팅에 올리면 됩니다. 첫 로드 후 게임 자체에는 네트워크 요청이 없습니다.

| 조작 | 키보드 | 모바일 |
| --- | --- | --- |
| 이동 | A / D 또는 ← / → | 아래 방향 버튼 |
| 점프 | Space / W / ↑, 길게 누르면 높게 | 점프 버튼 길게 누르기 |
| 즉시 되감기 | R | 되감기 버튼 |
| 기억의 문 이동 | 시작점에서 E | 시작점에서 기억 이동 버튼 |
| 일시정지 | Esc / P | 우측 상단 일시정지 |

**중요:** 파편의 +4초는 **다음 루프부터** 적용됩니다. 현재 남은 시간을 회복하지 않습니다. 모은 파편과 열린 문은 낙하·충돌·시간 초과에도 유지됩니다.

## 구현 범위

- 연결된 3개 구역: 멈춘 정원 → 잊힌 수도교 → 새벽 관측소
- 6개 시간 파편: 기본 10초에서 최대 34초로 확장
- 2개 영구 지름길: 매번 처음에서 시작하되, E로 가장 멀리 열린 문까지 이동
- 가변 점프 높이, 점프 입력 유예, 착지 직전 입력 버퍼
- 낙하·가시·움직이는 시간 균열, 자동 되감기, 이전 루프 잔상
- 시작 / 일시정지 / 도움말 / 새 여정 확인 / 클리어 화면
- 브라우저 자동 저장, 최고 기록, 소리 및 잔상 설정
- 터치 동시 입력, 세로·가로 대응, 화면 움직임 줄이기

계정, 서버, 결제, 분석 SDK, 외부 이미지, 다운로드 폰트는 사용하지 않습니다.

## 실행

Node.js 20 이상 환경에서 별도 패키지 설치 없이 실행합니다.

```sh
npm run dev       # http://localhost:4173
npm run check     # JavaScript 구문 검사
npm test          # 규칙·물리·저장·전체 완주 테스트
npm run build     # dist/index.html 및 prototype/index.html 생성
npm run preview   # 빌드 결과를 localhost:4173에서 확인
```

## 개발 구조

```text
src/
  core/       입력, 계산, 브라우저 저장, 합성 효과음
  game/       레벨 데이터, 성장 규칙, 이동 물리, 루프 상태, 잔상 기록
  render/     배경·캐릭터·오브젝트 렌더링, 파티클
  ui/         HUD, 안내, 화면 상태 표시
  main.js     고정 시간 간격 실행 루프와 모듈 연결
  style.css   반응형 인터페이스
scripts/      개발 서버, 빌드, 검사, 브라우저 테스트
tests/       Node.js 내장 테스트 러너
docs/        기획, 디자인·구조, QA 기록
```

런타임은 **JavaScript ES Modules + Canvas 2D + Web Audio + CSS**입니다. 빌드에는 Node.js 내장 모듈만 사용합니다. 소스 13개 모듈을 유지하면서 네이티브 import map으로 하나의 HTML에 패키징합니다.

## 문서

[게임 기획](docs/GAME_DESIGN.md) · [디자인과 개발 구조](docs/ARCHITECTURE.md) · [검증 결과와 한계](docs/QA.md)

## 선택: 브라우저 자동 테스트

Python Playwright는 게임 실행 의존성이 아니라 개발 검증 도구입니다.

```sh
python -m pip install playwright
python -m playwright install chromium
python scripts/browser-check.py
python scripts/mobile-check.py
```

시스템 Chromium을 사용할 때는 `CHROMIUM_PATH` 환경변수를 지정할 수 있습니다. 테스트 스크린샷은 `test-results/`에 저장되며 Git에서는 제외됩니다.

## 배포

일반 정적 호스팅은 `dist/index.html`을 사용합니다. Vercel 설정은 `vercel.json`에 포함되어 있습니다. GitHub Actions는 검사·테스트 후 독립 실행 파일을 갱신합니다. [검사·테스트·빌드 및 공개 파일 정합성 검증](https://github.com/W-X-Z/Time-slip/actions/runs/35245605439)이 모두 통과했습니다. 공개 주소는 HTTP 200과 HTML 형식으로 응답했으며, 내려받은 본문이 테스트한 빌드 파일과 완전히 일치했습니다.

위 플레이 링크는 검증한 커밋을 고정한 GitHack 정적 데모입니다. Vercel 자동 배포는 연결 도구의 입력 규격 오류로 완료하지 못했으며, Vercel 주소로 안내하지 않습니다. GitHack은 제3자 무료 서비스이므로 장기 가용성을 보장하지 않습니다. HTML을 내려받아 자체 호스팅할 수 있습니다.

## 현재 한계

첫 MVP로, 하나의 연속 레벨을 검증하는 범위입니다. 실제 기기 플레이 테스트와 난이도 조사, 추가 레벨, 게임패드, 클라우드 저장, 온라인 순위는 포함하지 않았습니다. 시크릿 모드·저장 차단 환경에서는 해당 탭 안에서만 진행이 유지될 수 있습니다.
