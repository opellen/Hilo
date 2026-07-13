> [English](README.md) · **한국어**

# Hilo — 옵시디언 네이티브 다중 색 하이라이트

> **인라인 마크다운을 깨뜨리지 않는** 다중 색 하이라이트 플러그인. 옵시디언 네이티브 `==text==` 문법을 그대로 활용합니다.

`Hilo`는 **Hi**ghlight + **Lo**wlight의 조합이자, 스페인어로 "실(Thread)"을 뜻합니다. 마크다운 본연의 흐름을 끊지 않고 색을 부드럽게 엮어내는 플러그인의 철학을 담았습니다.

![Hilo — 인라인 마크다운/위키링크가 하이라이트 안에서 살아있고, 하이라이트 안에서 다시 색을 지정하면 자동 분할까지](assets/screenshots/demo-01-hero.png)

▶ **[39초 데모 영상 →](https://youtu.be/fLbVhfi5H6c)**

---

## 왜 Hilo인가

기존 `<mark>` HTML 기반 하이라이트 플러그인은 옵시디언이 mark 내부의 마크다운을 파싱하지 않는 제약 때문에 `**굵게**`, `[[위키링크]]` 같은 인라인 마크다운이 깨집니다. Hilo는 옵시디언이 이미 인식하는 `==text==` 문법에 색상 토큰(`{slug}`)만 추가하여 이 문제를 우회합니다.

| | Hilo | `<mark>` 기반 플러그인 |
|---|---|---|
| `=={red}**굵은 텍스트**==` | ✅ 정상 렌더 | ❌ `**`가 그대로 노출 |
| `=={blue}[[위키링크]]==` | ✅ 정상 렌더 | ❌ 링크 미인식 |
| 노트 이식성 | ✅ 슬러그(`yellow`)만 저장, hex는 설정 | ❌ hex가 노트에 박힘 |
| Export 호환 | ✅ `==text==`는 CommonMark 확장 | △ `<mark>` HTML도 표준이지만 토큰 잔재 |
| 번들 사이즈 | ✅ 약 8KB | ❌ 수십~수백 KB |

---

## 주요 기능

### 다중 색 하이라이트 (`=={color}text==`)
- 슬러그 기반 색상 지정. 마크다운 소스에는 의미 이름만, 색상값은 설정에 저장.
- 인라인 마크다운(`**굵게**`, `[[위키링크]]`, `*기울임*`)이 하이라이트 안에서 정상 작동.

### 모든 뷰에서 일관된 시각
- **Source view / Live Preview / Reading view** 세 모드 모두에서 동일하게 색상이 표시됩니다.
- Live Preview에서 `{color}` 토큰은 자동으로 시각적으로 숨겨지고, 커서를 토큰 위에 두면 다시 나타나 편집할 수 있습니다.

### 우클릭 컨텍스트 메뉴

![우클릭으로 Highlight 서브메뉴가 열리며 색상 카탈로그를 노출](assets/screenshots/demo-02-context-menu.png)

- **Highlight** → 색상 선택: 선택 영역을 즉시 wrap
- **Change color** → 다른 색상으로 교체
- **Unhighlight**: 마커와 토큰 제거

### 단축키 명령
- 색상별 wrap 명령 (예: `Hilo: Yellow`, `Hilo: Red`)
- `Hilo: Open color palette` — 현재 컨텍스트에 맞는 메뉴를 caret 위치에 표시
- `Hilo: Unhighlight`

설정 → Hotkeys에서 자유롭게 단축키를 할당할 수 있습니다. 또한 **설정 → Hilo** 페이지의 각 색상 row에 현재 할당된 단축키가 표시되며, 키보드 버튼(⌨)을 클릭하면 Hotkeys 페이지로 바로 이동합니다.

### 색상 커스터마이즈

![설정 → Hilo — 색상별 슬러그/hex/미리보기/단축키와 Highlight style 드롭다운](assets/screenshots/demo-03-settings.png)

- 설정 → Hilo에서 색상 추가/편집/삭제/순서 변경/활성화 토글 지원.
- 슬러그(`yellow`) + hex(`#fff3a3`) 조합으로 자유 정의.
- 비활성화된 색상은 메뉴에서 숨겨지지만 기존 하이라이트는 시각적으로 유지됩니다.

### iA Writer 풍 lowlight 스타일
- 설정 → Highlight style에서 `Lowlight` 선택 시 배경 + 색상별 자동 darker underline 적용.
- underline 색은 각 배경색에서 HSL 변환(hue 유지, saturation 100%, lightness -30pp)으로 자동 계산.
- Chromium spellcheck와 충돌하지 않는 `box-shadow` 기반 underline.

### Highlightr 마이그레이션
- 기존 `<mark style="...">text</mark>` 형태의 하이라이트에서도 우클릭 메뉴가 작동합니다.
- **Change color** 클릭 시 `=={slug}text==` 형태로 자동 변환.
- **Unhighlight** 클릭 시 mark 태그 제거.
- 노트를 한 번에 일괄 변환하지 않고, 사용하는 곳마다 점진적으로 마이그레이션 가능.

---

## 설치

### 옵시디언 커뮤니티 플러그인
1. 설정 → Community plugins → Browse
2. "Hilo" 검색 → Install → Enable

### 수동 설치
1. [Releases](https://github.com/opellen/Hilo/releases) 페이지에서 최신 버전 다운로드
2. `main.js`, `manifest.json`, `styles.css`를 vault의 `.obsidian/plugins/hilo/` 폴더에 복사
3. 옵시디언 설정 → Community plugins에서 Hilo 활성화

> **이전 버전(`od-highlight`)에서 업그레이드**: vault의 `.obsidian/plugins/od-highlight/` 폴더는 잔재로 남으므로 옵시디언에서 비활성화한 후 폴더를 수동 삭제하세요. 노트의 `=={slug}…==` 토큰은 그대로 호환됩니다.

---

## 사용법

### 기본 하이라이트
1. 텍스트를 선택
2. 우클릭 → **Highlight** → 원하는 색상 클릭
3. 또는 색상별 단축키 사용

결과: 선택한 텍스트가 `=={색상이름}텍스트==` 형태로 변환되며 즉시 색상이 적용됩니다.

### 색상 변경
1. 하이라이트 안에 커서 위치
2. 우클릭 → **Change color** → 새 색상 선택

### 하이라이트 제거
1. 하이라이트 안에 커서 위치
2. 우클릭 → **Unhighlight** (또는 단축키)

### 색상 추가
1. 설정 → Hilo
2. **Add color** 버튼 클릭
3. 슬러그(예: `pink`) + hex(`#ffc0cb`) 입력
4. 즉시 모든 뷰에 반영됩니다.

### Highlightr에서 마이그레이션
기존 `<mark>` 하이라이트 위에 커서를 두고 우클릭하면 같은 메뉴가 나타납니다. **Change color**로 색상을 적용하거나 **Unhighlight**로 제거하세요.

---

## 토큰 형식 안내

Hilo의 출력 포맷은 `=={색상이름}내용==` 인라인 형식 한 가지입니다.

- 색상이름(슬러그): 소문자 알파벳·숫자·하이픈만. (예: `yellow`, `red`, `1st`, `2nd`, `soft-blue`)
- 첫 글자는 알파벳 또는 숫자로 시작 가능
- 슬러그가 설정 카탈로그에 없으면 색상은 적용되지 않지만 토큰 자체는 유효합니다 (텍스트 영역의 색상이 비어 있는 형태)

> **Export 시 주의**: 옵시디언 외부의 마크다운 렌더러는 `{색상이름}` 토큰을 그대로 텍스트로 표시할 수 있습니다. 외부 publish가 필요한 경우 토큰 제거 후 export하시기 바랍니다 (자동 제거 옵션은 후행 계획).

---

## 시각 스타일

### Default (단색 배경)
설정한 배경색이 전체 하이라이트 영역에 적용됩니다.

### Lowlight (iA Writer 풍)
- 배경색 + 색상별 darker underline 조합
- 가독성을 유지하면서 색상별 강조 강도를 자연스럽게 표현
- 모든 색상에 자동 적용되며 색상을 추가/변경할 때마다 underline 색이 자동 재계산됩니다

설정 → Hilo → **Highlight style** 드롭다운에서 선택.

---

## 호환성

- Obsidian 1.5.0 이상
- 데스크톱 + 모바일 (모바일은 베타 — 피드백 환영)
- 모든 옵시디언 뷰 모드(Source / Live Preview / Reading)
- 라이트/다크 테마

---

## 다국어 지원

Hilo는 옵시디언의 인터페이스 언어 설정을 자동으로 감지하여 UI를 표시합니다.

- **지원 언어**: 영어(기본), 한국어
- 감지 기준: 옵시디언의 언어 설정(`localStorage`의 `language` 키)
- 미지원 언어에서는 영어로 표시됩니다

### 언어 변경 시 유의

설정 → About → Language에서 언어를 변경한 후에는 **플러그인을 한 번 재활성화**(설정 → Community plugins → Hilo 토글 off/on)해야 명령어 팔레트의 명령명(`Hilo: Open color palette` 등)이 새 언어로 갱신됩니다. 옵시디언이 명령어를 등록 시점의 텍스트로 고정하기 때문입니다. 설정 화면과 우클릭 메뉴, 모달은 재활성화 없이 즉시 반영됩니다.

### 번역 기여

새로운 언어를 추가하려면 `src/i18n/locales/` 폴더의 `en.ts`를 참고하여 동일한 키 구조로 새 로케일 파일을 만들고 `src/i18n/index.ts`의 dictionary 맵에 등록하면 됩니다.

---

## 의도된 제외 기능

다음 기능은 의도적으로 제외했습니다 (단순성 우선). 향후 사용자 피드백에 따라 검토할 수 있습니다.

- Annotation/메모 기능
- 사이드바 하이라이트 목록(NotesTab)
- 색상 아이콘(메뉴 색상 미리보기)
- 색상 드래그 정렬

---

## Credits

본 플러그인의 우클릭 컨텍스트 메뉴 구조, 설정 UI 흐름, 시각 스타일 카탈로그는 [Chetachi](https://github.com/chetachiezikeuzor)님의 [Highlightr](https://github.com/chetachiezikeuzor/Highlightr-Plugin) 및 [Highlightr+](https://github.com/chetachiezikeuzor/highlightr-plus) 플러그인에서 영감을 받았습니다. 다중 색 하이라이트 플러그인의 원조 격으로, Hilo는 그 패턴을 차용하되 출력 포맷을 `==text==` 네이티브로 교체한 변형입니다.

---

## License

MIT
