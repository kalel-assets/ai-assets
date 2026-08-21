# 나만의 AI Assets

팀이 쓰고 만드는 **SKILL · MCP · PLUGIN** 카탈로그.
→ <https://kalel-assets.github.io/ai-assets/>

카탈로그 전체는 `src/data/assets.json` 파일 하나입니다. 자산 등록은 이 배열에 객체를 하나 추가하는 PR입니다.
백엔드도 없고, org를 자동으로 스캔하지도 않습니다.

## Changelog

### 2026-08-21

- [`b0d1025`](https://github.com/kalel-assets/ai-assets/commit/b0d1025ac30dfe64612476e8b0fdeddc4e7a1f48): 자산의 등록일과 저장소 수정일 중 최신 날짜를 목록에 `최근 변경`으로 표시했습니다.
- [`db76fc8`](https://github.com/kalel-assets/ai-assets/commit/db76fc83bff4a68319eeb8cfec5c331b8ba0a33d): 외부 참고 자산을 list UI로 변경하고, GitHub 인기 저장소를 찾아 개인 참고 목록에 추가하는 `GIT TREND` 기능을 도입했습니다.

## GIT TREND와 개인 참고 목록

화면의 `GIT TREND`를 열면 GitHub 공개 저장소를 최근 30일 생성·STAR 순 또는 전체 STAR 순으로
조회할 수 있습니다. 추천 결과에서 자산 유형을 선택해 추가하면 `참고 자산` 목록에 바로 표시됩니다.

이 선택은 현재 브라우저의 `localStorage`에만 저장됩니다. 다른 사용자와 공유되지 않으며
`src/data/assets.json`도 수정하지 않습니다. 팀 공용 카탈로그에 영구 등록하려면 아래 절차대로
`assets.json`을 수정해 PR을 생성하세요. 추천 저장소는 항상 `source: "external"`이며 설치 명령을 제공하지 않습니다.

자산 목록의 `최근 변경`은 카탈로그 등록일인 `registered`와 저장소의 의미 있는 최근 변경일인
`updated` 중 더 최근 날짜를 표시합니다. 새 자산을 등록할 때에는 두 날짜를 모두 `YYYY-MM-DD`로 기록하세요.

## 자산 등록하기

### 1. `src/data/assets.json`에 항목 추가

```jsonc
{
  "id": "my-skill",                                   // 소문자 kebab-case, 전체에서 고유 (딥링크 앵커)
  "kind": "skill",                                    // skill | mcp | plugin | etc  ← 아래 설명
  "source": "org",                                    // org | external  ← 아래 설명
  "name": "My Skill",
  "description": "무엇을 해주는지 한 줄로",
  "highlights": ["한 줄로"],                           // (선택) 설명 중 굵게 표시할 문자열
  "owner": "kalelkim",                                // repo를 호스팅하는 계정  ← 아래 설명
  "url": "https://github.com/kalelkim/my-skill",      // 끝에 경로 없이 <owner>/<repo>까지만
  "tags": ["agent", "docs"],
  "install": "/plugin marketplace add kalelkim/my-skill",  // source가 org일 때만
  "license": "MIT",                                   // (선택) 외부 자산이면 표기 권장
  "status": "stable",                                 // stable | beta | wip
  "registered": "2026-07-21",                         // 카탈로그 최초 등록일, YYYY-MM-DD
  "updated": "2026-07-21"                             // 저장소의 의미 있는 최근 변경일, YYYY-MM-DD
}
```

### `기타`(`etc`)는 git repo가 아니어도 됩니다

`skill` · `mcp` · `plugin`은 설치해서 쓰는 것들이라 `url`이 `<owner>/<repo>` 형태여야 하고
`owner`도 필수입니다. 반면 **`etc`는 공유하고 싶은 가이드·문서·북마크**를 위한 칸이라 제약이 없습니다.

| | skill / mcp / plugin | etc |
|---|---|---|
| `url` | `https://<host>/<owner>/<repo>` 형태 강제 | **아무 https 주소나** |
| `owner` | 필수, `url`과 일치해야 함 | 선택 |
| `install` | `source: org`면 필수 | 선택 (보통 없음) |
| 버튼 | `GitHub` | github 주소면 `GitHub`, 아니면 `바로가기` |

문서 링크 등록 예시 — repo도, owner도, 설치 명령도 없습니다:

```jsonc
{
  "id": "sap-rap-docs",
  "kind": "etc",
  "source": "external",
  "name": "RAP 공식 문서",
  "description": "SAP 공식 RAP 개발 가이드",
  "url": "https://help.sap.com/docs/abap-cloud/abap-rap/...",
  "tags": ["sap", "rap", "docs"],
  "status": "stable",
  "registered": "2026-07-21",
  "updated": "2026-07-21"
}
```

### 2. 검증

```bash
npm run validate
```

통과하지 못하면 배포도 실패합니다. 커밋 전에 반드시 실행하세요.

### 3. PR

`main`에 머지되면 사외는 자동 배포됩니다. 사내는 아래 "사내 배포" 절차를 따릅니다.

## `owner`와 `source`는 다른 것입니다

가장 흔한 실수입니다. **`owner`를 org로 바꾸지 마세요.**

| 필드 | 의미 | 값 |
|---|---|---|
| `owner` | repo를 **실제로 호스팅하는 계정** | `url`의 첫 경로와 **반드시 일치** |
| `source` | 우리 자산인가, 남의 것을 큐레이션한 것인가 | `org` 또는 `external` |

즉 `owner`는 "누가 org 소속인가"가 아니라 "이 repo가 어느 계정 아래 있는가"입니다.

- `github.com/kalel-assets/foo` → `owner: "kalel-assets"`, `source: "org"`
- `github.com/kalelkim/foo` (멤버 개인 계정) → `owner: "kalelkim"`, `source: "org"`
- `github.com/openai/foo` (외부) → `owner: "openai"`, `source: "external"`

멤버 개인 계정에 있어도 우리 자산이면 `source`는 `org`입니다. org로 옮길 필요 없습니다.
`owner`와 `url`이 어긋나면 `npm run validate`가 막습니다.

### `source`가 카드 모양을 결정합니다

| `source` | 카드에 나오는 것 |
|---|---|
| `org` | `설치 명령 복사` 버튼 + `GitHub` 버튼 |
| `external` | `GitHub` 버튼만 — **설치 명령 없음** |

외부 자산에 `install`을 넣으면 검증이 실패합니다. 공개 repo로 링크하는 데는 허가가 필요 없지만,
설치 명령을 주는 것은 **우리가 통제하지 않는 코드의 실행을 권하는 행위**이기 때문입니다.
실제로 여기 등록된 외부 자산 6개 중 2개는 이미 다른 org로 소유권이 이전됐습니다.

비공개 repo는 등록하지 마세요. 방문자에게는 404이고, repo 이름만으로 미공개 프로젝트가 드러납니다.

## 개발

```bash
npm install
npm run dev         # 개발 서버
npm run validate    # assets.json 검증
npm run lint        # oxlint
npm run build       # → dist/   (Actions 배포용)
npm run build:docs  # → docs/   (사내 정적 배포용)
```

## 배포

`vite.config.ts`가 `base: './'`(상대 경로)를 쓰므로, **같은 빌드 결과가 어느 경로에 올라가도 동작합니다.**
배포 위치별 설정이 필요 없습니다.

### 사외 (이 repo) — Actions

`main`에 push하면 `.github/workflows/deploy.yml`이 validate → lint → build 후 Pages에 배포합니다.
추가 작업 없음.

### 사내 미러 — `/docs` 정적 배포

사내 GitHub는 Actions에 관리자 승인이 필요하므로, `main` 브랜치의 `docs/` 폴더를 그대로 서빙합니다.
Pages 설정에서 **Source: Deploy from a branch → `main` / `/docs`** 를 선택한 뒤:

```bash
npm run validate && npm run lint && npm run build:docs
git add docs && git commit -m "Rebuild catalog" && git push
```

> **사내 미러를 만들 때 `.gitignore`에서 `docs` 줄을 반드시 지우세요.**
> 이 repo는 Actions로 배포해서 `docs/`를 무시합니다. 그 규칙이 그대로 복사되면
> push는 매번 성공하는데 사이트는 영원히 안 바뀝니다.

사내 Git 호스트 주소(`https://git.company.com/...`)도 `url` 필드에 그대로 쓸 수 있습니다.
검증기는 호스트를 `github.com`으로 고정하지 않습니다.
