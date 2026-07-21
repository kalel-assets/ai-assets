# 나만의 AI Assets

팀이 쓰고 만드는 **SKILL · MCP · PLUGIN** 카탈로그.
→ <https://kalel-assets.github.io/ai-assets/>

카탈로그 전체는 `src/data/assets.json` 파일 하나입니다. 자산 등록은 이 배열에 객체를 하나 추가하는 PR입니다.
백엔드도 없고, org를 자동으로 스캔하지도 않습니다.

## 자산 등록하기

### 1. `src/data/assets.json`에 항목 추가

```jsonc
{
  "id": "my-skill",                                   // 소문자 kebab-case, 전체에서 고유 (딥링크 앵커)
  "kind": "skill",                                    // skill | mcp | plugin
  "source": "org",                                    // org | external  ← 아래 설명
  "name": "My Skill",
  "description": "무엇을 해주는지 한 줄로",
  "highlights": ["한 줄로"],                           // (선택) 설명 중 굵게 표시할 문자열
  "owner": "kalelkim",                                // repo를 호스팅하는 계정  ← 아래 설명
  "repo": "https://github.com/kalelkim/my-skill",     // 끝에 경로 없이 <owner>/<repo>까지만
  "tags": ["agent", "docs"],
  "install": "/plugin marketplace add kalelkim/my-skill",  // source가 org일 때만
  "license": "MIT",                                   // (선택) 외부 자산이면 표기 권장
  "status": "stable",                                 // stable | beta | wip
  "updated": "2026-07-21"                             // YYYY-MM-DD
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
| `owner` | repo를 **실제로 호스팅하는 계정** | `repo` URL의 첫 경로와 **반드시 일치** |
| `source` | 우리 자산인가, 남의 것을 큐레이션한 것인가 | `org` 또는 `external` |

즉 `owner`는 "누가 org 소속인가"가 아니라 "이 repo가 어느 계정 아래 있는가"입니다.

- repo가 `github.com/kalel-assets/foo` → `owner: "kalel-assets"`, `source: "org"`
- repo가 `github.com/kalelkim/foo` (멤버 개인 계정) → `owner: "kalelkim"`, `source: "org"`
- repo가 `github.com/openai/foo` (외부) → `owner: "openai"`, `source: "external"`

멤버 개인 계정에 있어도 우리 자산이면 `source`는 `org`입니다. org로 옮길 필요 없습니다.
`owner`와 `repo` URL이 어긋나면 `npm run validate`가 막습니다.

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

사내 Git 호스트 주소(`https://git.company.com/...`)도 `repo` 필드에 그대로 쓸 수 있습니다.
검증기는 호스트를 `github.com`으로 고정하지 않습니다.
