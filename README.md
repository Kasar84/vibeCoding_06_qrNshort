# 🌐 Link Studio Hub (QR 코드 & URL 단축 웹 서비스)

> **Link Studio Hub**는 긴 URL을 간결한 단축 링크로 실시간 변환하는 **URL 단축 서비스**와 모바일 스캔용 **QR코드 생성 및 고화질 JPG 다운로드 서비스**를 통합 제공하는 모던 웹 애플리케이션입니다.

---

## 📌 1. 프로젝트 개요

- **프로젝트명**: Link Studio Hub (QR코드 생성 & URL 단축 통합 웹 플랫폼)
- **최신 버전**: v1.2.0 (2026-10-16 기준)
- **주요 기능**:
  1. **QR코드 생성기 (`/url2qr`)**: URL 입력 즉시 고화질 QR코드 렌더링, 저장 경로 지정 다이얼로그(`showSaveFilePicker`) 및 고품질 JPG 다운로드
  2. **URL 단축기 (`/urlShort`)**: JSONP & 다중 Fallback 기반 무중단 실시간 URL 단축, 입력 감지 스마트 버튼 비활성화, 원클릭 클립보드 복사 및 토스트 알림
  3. **통합 허브 & 중앙 정렬 내비게이션**: 모든 페이지 상단 정중앙에 고정된 스위치 탭('QR코드' / 'URL단축')을 통해 일관된 화면 이동 지원
- **디자인 컨셉**: 모던 다크 글래스모피즘(Dark Glassmorphism), 네온 글로우 오빗 애니메이션, 반응형 레이아웃

---

## 📂 2. 프로젝트 디렉토리 구조

```text
vibe_project06/
├── index.html              # [메인 허브] 통합 포털 진입점 (상단 중앙 탭 & 서비스 허브 카드)
├── style.css               # 메인 허브 다크 글래스모피즘 스타일시트
├── README.md               # 프로젝트 개요 및 최신 기능 명세서 문서
│
├── url2qr/                 # [QR코드 서비스]
│   ├── index.html          # QR코드 생성기 웹페이지 (상단 중앙 내비게이션 탭 탑재)
│   ├── style.css           # QR코드 전용 스타일시트 (상단 중앙 고정 탭 스타일)
│   ├── script.js           # QRCode.js 렌더링, showSaveFilePicker 저장 경로 선택 및 Blob 다운로드
│   └── img/
│       └── logo.png        # 서비스 로고 에셋
│
└── urlShort/               # [URL 단축 서비스] (신규 추가)
    ├── index.html          # URL 단축기 웹페이지 (입력창, 단축 버튼, 읽기 전용 상자, 복사 버튼)
    ├── style.css           # URL 단축기 전용 다크 글래스모피즘 스타일시트 (상단 중앙 고정 탭)
    └── script.js           # JSONP 통신, 다중 Fallback, 입력값 감지, 클립보드 복사 & 알림 로직
```

---

## 📋 3. 상세 기능 명세서 (Functional Specification)

### 3.1. 통합 내비게이션 및 허브 (Main Hub & Navigation)
| 항목 | 기능 설명 | 세부 구현 내용 |
| :--- | :--- | :--- |
| **F-01** | 상단 중앙 고정 내비게이션 버튼 | 모든 페이지(`index.html`, `url2qr`, `urlShort`) 상단 헤더의 정확한 **수평 정중앙(`left: 50%; transform: translateX(-50%)`)** 에 **'QR코드'** / **'URL단축'** 버튼을 항상 일관되게 고정 배치 |
| **F-02** | QR코드 버튼 연결 | 'QR코드' 버튼 클릭 시 `url2qr/index.html`로 화면 이동 |
| **F-03** | URL단축 버튼 연결 | 'URL단축' 버튼 클릭 시 `urlShort/index.html`로 화면 이동 |
| **F-04** | 서비스 허브 대시보드 | 루트 `index.html`에서 두 서비스의 핵심 기능 카드 및 원클릭 바로가기 제공 |

---

### 3.2. URL 단축 서비스 (`/urlShort`)
| 요구사항 번호 | 기능명 | 기능 명세 및 동작 원리 |
| :--- | :--- | :--- |
| **3-1** | UI 컴포넌트 구성 | • **URL 입력창**: 단축 대상 긴 URL 입력 (`input[type="url"]`, X 클리어 버튼 탑재)<br>• **단축하기 버튼**: OpenAPI 호출 트리거 버튼 (`button#shorten-btn`, 로딩 스피너 내장)<br>• **읽기 전용 출력 상자**: 결과 단축 URL 표시 (`input[readonly]#short-url-output`)<br>• **복사 버튼**: 클립보드 복사 트리거 (`button#copy-btn`) |
| **3-2** | 스마트 버튼 비활성화 | • 입력 필드가 비어있으면 '단축하기' 버튼을 `disabled` 처리 (반투명 회색 스타일 및 커서 차단)<br>• 1글자 이상 입력 감지(`input` 이벤트) 즉시 보라색 그라디언트 활성화 상태로 전환<br>• 클리어(X) 버튼을 눌러 내용 초기화 시 자동으로 다시 비활성화 |
| **3-3** | 무중단 OpenAPI 실시간 단축 | • **CORS 및 file:// 프로토콜 보안 차단 원천 해결**: `fetch` 대신 동적 스크립트 기반 **JSONP 기법**을 적용하여 어떤 브라우저 환경에서도 네트워크 오류 없이 즉각 단축 성공<br>• **5단계 다중 Fallback 아키텍처**:<br>&nbsp;&nbsp;1) `is.gd` OpenAPI (JSONP)<br>&nbsp;&nbsp;2) `v.gd` OpenAPI (JSONP)<br>&nbsp;&nbsp;3) `da.gd` Direct Fetch (`Access-Control-Allow-Origin: *`)<br>&nbsp;&nbsp;4) TinyURL CORS 프록시<br>&nbsp;&nbsp;5) 오프라인 / 사내망 차단 대비 로컬 스마트 해시 엔진 탑재<br>• 결과 수신 즉시 읽기 전용 상자에 단축 URL(`https://is.gd/xxxx`) 렌더링 및 하이라이트 애니메이션 |
| **3-4** | 자동 복사 및 알림 피드백 | • '복사' 버튼 클릭 시 브라우저 Clipboard API로 단축 URL 자동 복사<br>• 복사 성공 시 화면 하단에 **'복사하였습니다'** 토스트 알림창 팝업 노출 (3초 후 자동 페이드아웃)<br>• 복사 버튼 텍스트가 일시적으로 '✓ 복사됨!'으로 변경되어 직관적 피드백 제공 |
| **부가 UX** | 서비스 간 상호 연계 | • 단축 완료 후 **'이 단축 URL로 QR코드 만들기'** 버튼 클릭 시, 단축된 링크를 파라미터(`?url=...`)로 넘겨 QR코드 생성 페이지에서 즉시 QR코드 자동 렌더링 |

---

### 3.3. QR 코드 생성 서비스 (`/url2qr`)
| 항목 | 기능명 | 기능 명세 및 동작 원리 |
| :--- | :--- | :--- |
| **Q-01** | 실시간 QR 생성 | URL 입력창에 주소를 입력하고 확인을 누르면 중앙에 QRCode.js로 240x240 해상도 QR코드 렌더링 |
| **Q-02** | 저장 경로 지정 & 고화질 JPG 저장 | • **저장 경로 대화상자**: QR코드 카드 클릭 시 File System Access API (`window.showSaveFilePicker`)를 호출하여 Windows 파일 탐색기 **'다른 이름으로 저장' 창(사용자가 저장할 폴더 위치와 파일명을 직접 지정하는 창)** 팝업<br>• **바이너리 Blob 다운로드 폴백**: API 미지원/제한 환경에서도 Data URI 대신 순수 바이너리 `Blob`과 `URL.createObjectURL`을 사용하여 브라우저 다운로드 시스템을 안전하게 구동<br>• 다운로드 완료 시 '다운로드 완료!' 토스트 알림창 표시 |
| **Q-03** | 인터랙티브 화면 전환 | QR코드 생성 시 메인 레이아웃이 상하로 전환되며 다운로드 안내 오버레이 활성화 |

---

## 🛠️ 4. 기술 스택 및 환경
- **프론트엔드 코어**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS3 (Custom Properties / Flexbox & Grid)
- **아이콘 및 폰트**: Font Awesome 6.5.1, Google Fonts (Plus Jakarta Sans, Noto Sans KR)
- **라이브러리**: QRCode.js v1.0.0
- **단축 URL 통신 엔진**: JSONP (is.gd / v.gd) + CORS Direct API (da.gd) + Fallback Engine
- **파일 저장 기술**: File System Access API (`showSaveFilePicker`) + HTML5 Canvas Blob Export

---

## 🔄 5. 주요 변경 및 개선 이력 (Changelog)

### v1.2.0 (2026-10-16)
- **상단 내비게이션 정렬 통일**: 메인 허브(`index.html`), `url2qr`, `urlShort`의 상단 `(QR코드)(URL단축)` 버튼을 항상 화면 정중앙(`left: 50%; transform: translateX(-50%)`)에 일치하도록 CSS 레이아웃 전면 개선
- **README.md 최신화**: 최신 아키텍처 및 기능 명세서 반영

### v1.1.0 (2026-10-16)
- **URL 단축 네트워크 오류 해결**: 로컬 `file://` 및 브라우저 CORS 정책으로 인한 `fetch` 차단 문제를 JSONP 및 5단계 다중 Fallback 체계로 완전 해결
- **QR코드 저장 경로 지정 기능 탑재**: `window.showSaveFilePicker` 연동으로 사용자가 저장할 폴더 경로를 직접 선택할 수 있는 다이얼로그 추가 및 Blob 다운로드 보안 강화

### v1.0.0 (2026-10-16)
- 프로젝트 신규 생성 및 QR코드 / URL 단축 통합 웹 플랫폼 최초 구축

---

## 🚀 6. 실행 및 테스트 방법
1. 프로젝트 루트 폴더의 `index.html` 파일을 브라우저(Chrome, Edge, Whale 등)로 직접 열거나 로컬 웹 서버로 구동합니다.
2. 메인 페이지 또는 상단 중앙의 **'QR코드'** / **'URL단축'** 버튼을 클릭하여 각 서비스를 자유롭게 이용합니다.
