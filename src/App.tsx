import { useMemo, useRef, useState } from 'react'
import rawAssets from './data/assets.json'
import type { Asset, AssetKind } from './data/types'
import {
  loadSavedAssets,
  saveAssets,
  searchGitHubRepositories,
  toExternalAsset,
  type GitHubRepository,
  type TrendMode,
} from './github'

const assets = rawAssets as Asset[]

const ORG_URL = 'https://github.com/kalel-assets'
const CATALOG_URL = 'https://github.com/kalel-assets/ai-assets'

const KIND_LABEL: Record<AssetKind, string> = {
  skill: 'SKILL',
  mcp: 'MCP',
  plugin: 'PLUGIN',
  etc: '기타',
}

const KINDS: AssetKind[] = ['skill', 'mcp', 'plugin', 'etc']

type Filter = AssetKind | 'all'
type TrendStatus = 'idle' | 'loading' | 'success' | 'error'

interface TrendState {
  status: TrendStatus
  repositories: GitHubRepository[]
  message?: string
}

/** GitHub-ish hosts get a "GitHub" button; anything else is just a link to open. */
function linkLabel(url: string) {
  try {
    return new URL(url).hostname.includes('github') ? 'GitHub' : '바로가기'
  } catch {
    return '바로가기'
  }
}

function KindIcon({ kind }: { kind: AssetKind }) {
  const paths: Record<AssetKind, string> = {
    skill: 'M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 3z',
    mcp: 'M5 7h14M5 12h14M5 17h9M3 7h.01M3 12h.01M3 17h.01',
    plugin: 'M10 3v4H7a2 2 0 00-2 2v3h3a2 2 0 110 4H5v3a2 2 0 002 2h3v-4a2 2 0 114 0v4h3a2 2 0 002-2v-3h-3a2 2 0 110-4h3V9a2 2 0 00-2-2h-3V3h-4z',
    etc: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5M9 13h6M9 17h4',
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[kind]} />
    </svg>
  )
}

/** Bolds each `terms` occurrence inside `text`. Terms are literal strings, so they are
 *  escaped before going into the split pattern — a tag like "C++" must not become regex. */
function Highlighted({ text, terms }: { text: string; terms?: string[] }) {
  if (!terms || terms.length === 0) return <>{text}</>

  const pattern = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    // Longest first: otherwise a term that is a prefix of another swallows the match.
    .sort((a, b) => b.length - a.length)
    .join('|')

  const parts = text.split(new RegExp(`(${pattern})`, 'gi'))
  const isTerm = (s: string) => terms.some((t) => t.toLowerCase() === s.toLowerCase())

  return (
    <>
      {parts.map((part, i) =>
        isTerm(part) ? (
          <strong className="kw" key={i}>
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}

/** The command itself is never printed — the card exposes it only through the clipboard,
 *  so long repo URLs stay out of the layout. */
function InstallButton({ command }: { command: string }) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(command)
      setState('ok')
    } catch {
      // Clipboard needs a secure context; say so rather than appearing to do nothing.
      setState('fail')
    }
    window.setTimeout(() => setState('idle'), 1600)
  }

  return (
    <button type="button" className="btn btn--primary" onClick={copy}>
      {state === 'ok' ? '복사됨' : state === 'fail' ? '복사 실패' : '설치 명령 복사'}
    </button>
  )
}

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <article className="card" id={asset.id}>
      <div className="card__top">
        <div className="card__icon">
          <KindIcon kind={asset.kind} />
        </div>
        <div className="badges">
          <span className="badge badge--kind">{KIND_LABEL[asset.kind]}</span>
          <span className={`badge badge--${asset.source}`}>
            {asset.source === 'org' ? '내 자산' : '외부'}
          </span>
        </div>
      </div>

      <h3 className="card__title">{asset.name}</h3>
      <p className="card__owner">
        {[asset.owner, asset.license].filter(Boolean).join(' · ') || ' '}
      </p>
      <p className="card__desc">
        <Highlighted text={asset.description} terms={asset.highlights} />
      </p>

      <div className="tags">
        {asset.tags.map((t) => (
          <span className="tag" key={t}>
            {t}
          </span>
        ))}
      </div>

      <div className="card__foot">
        {/* Only org-owned assets ship a runnable command. External cards link out and
            stop there — see the org/external rule in CLAUDE.md. */}
        {asset.source === 'org' && asset.install ? <InstallButton command={asset.install} /> : null}
        <a className="btn btn--ghost" href={asset.url} target="_blank" rel="noopener noreferrer">
          {linkLabel(asset.url)}
        </a>
      </div>
    </article>
  )
}

function ExternalAssetRow({
  asset,
  removable,
  onRemove,
}: {
  asset: Asset
  removable: boolean
  onRemove: (id: string) => void
}) {
  return (
    <article className="asset-row" id={asset.id}>
      <div className="asset-row__identity">
        <div className="asset-row__icon">
          <KindIcon kind={asset.kind} />
        </div>
        <div>
          <div className="asset-row__badges">
            <span className="badge badge--kind">{KIND_LABEL[asset.kind]}</span>
            <span className="badge badge--external">외부</span>
          </div>
          <h3 className="asset-row__title">{asset.name}</h3>
          <p className="asset-row__owner">
            {[asset.owner, asset.license].filter(Boolean).join(' · ') || ' '}
          </p>
        </div>
      </div>

      <div className="asset-row__content">
        <p className="asset-row__desc">
          <Highlighted text={asset.description} terms={asset.highlights} />
        </p>
        <div className="tags asset-row__tags">
          {asset.tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="asset-row__actions">
        <a className="btn btn--ghost" href={asset.url} target="_blank" rel="noopener noreferrer">
          {linkLabel(asset.url)}
        </a>
        {removable ? (
          <button type="button" className="remove-button" onClick={() => onRemove(asset.id)}>
            목록에서 제거
          </button>
        ) : null}
      </div>
    </article>
  )
}

function TrendRow({
  repository,
  kind,
  alreadyAdded,
  onKindChange,
  onAdd,
}: {
  repository: GitHubRepository
  kind: AssetKind
  alreadyAdded: boolean
  onKindChange: (kind: AssetKind) => void
  onAdd: () => void
}) {
  return (
    <li className="trend-row">
      <div className="trend-row__main">
        <div className="trend-row__heading">
          <a href={repository.html_url} target="_blank" rel="noopener noreferrer">
            {repository.full_name}
          </a>
          <span className="trend-row__stars" aria-label={`${repository.stargazers_count} stars`}>
            ★ {repository.stargazers_count.toLocaleString()}
          </span>
        </div>
        <p>{repository.description || '설명이 없는 공개 저장소입니다.'}</p>
        <div className="trend-row__meta">
          <span>최근 업데이트 {repository.pushed_at.slice(0, 10)}</span>
          {repository.license?.spdx_id && repository.license.spdx_id !== 'NOASSERTION' ? (
            <span>{repository.license.spdx_id}</span>
          ) : null}
        </div>
      </div>
      <div className="trend-row__actions">
        <label>
          <span className="sr-only">{repository.full_name} 자산 유형</span>
          <select value={kind} onChange={(event) => onKindChange(event.target.value as AssetKind)}>
            {KINDS.map((assetKind) => (
              <option value={assetKind} key={assetKind}>
                {KIND_LABEL[assetKind]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn--primary" disabled={alreadyAdded} onClick={onAdd}>
          {alreadyAdded ? '포함됨' : '참고 목록에 추가'}
        </button>
      </div>
    </li>
  )
}

export default function App() {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [savedAssets, setSavedAssets] = useState<Asset[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return loadSavedAssets(window.localStorage)
    } catch {
      return []
    }
  })
  const [trendOpen, setTrendOpen] = useState(false)
  const [trendQuery, setTrendQuery] = useState('AI agent')
  const [trendMode, setTrendMode] = useState<TrendMode>('trending')
  const [trendKinds, setTrendKinds] = useState<Record<number, AssetKind>>({})
  const [trendState, setTrendState] = useState<TrendState>({ status: 'idle', repositories: [] })
  const [notice, setNotice] = useState('')
  const trendRequest = useRef<AbortController | null>(null)

  const catalogAssets = useMemo(() => {
    const staticUrls = new Set(assets.map((asset) => asset.url.toLowerCase()))
    return [...assets, ...savedAssets.filter((asset) => !staticUrls.has(asset.url.toLowerCase()))]
  }, [savedAssets])

  const counts = useMemo(
    () =>
      Object.fromEntries(
        KINDS.map((k) => [k, catalogAssets.filter((a) => a.kind === k).length]),
      ) as Record<AssetKind, number>,
    [catalogAssets],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalogAssets.filter((a) => {
      if (filter !== 'all' && a.kind !== filter) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.owner ?? '').toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [catalogAssets, filter, query])

  const mine = visible.filter((a) => a.source === 'org')
  const external = visible.filter((a) => a.source === 'external')
  const savedIds = new Set(savedAssets.map((asset) => asset.id))
  const catalogUrls = new Set(catalogAssets.map((asset) => asset.url.toLowerCase()))

  function persistSavedAssets(next: Asset[]) {
    try {
      saveAssets(window.localStorage, next)
      setSavedAssets(next)
      return true
    } catch {
      setSavedAssets(next)
      setNotice('변경사항을 현재 화면에만 반영했습니다. 이 브라우저에는 저장하지 못했습니다.')
      return false
    }
  }

  async function lookupTrends() {
    const trimmedQuery = trendQuery.trim()
    if (!trimmedQuery) {
      setTrendState({ status: 'error', repositories: [], message: '검색어를 입력해 주세요.' })
      return
    }

    trendRequest.current?.abort()
    const controller = new AbortController()
    trendRequest.current = controller
    setTrendState({ status: 'loading', repositories: [] })
    try {
      const repositories = await searchGitHubRepositories(trimmedQuery, trendMode, controller.signal)
      if (controller.signal.aborted) return
      setTrendState({
        status: 'success',
        repositories,
        message: repositories.length === 0 ? '검색 결과가 없습니다.' : undefined,
      })
    } catch (error) {
      if (controller.signal.aborted) return
      setTrendState({
        status: 'error',
        repositories: [],
        message: error instanceof Error ? error.message : 'GitHub 조회에 실패했습니다.',
      })
    } finally {
      if (trendRequest.current === controller) trendRequest.current = null
    }
  }

  function addRecommendation(repository: GitHubRepository) {
    if (catalogUrls.has(repository.html_url.toLowerCase())) return
    const asset = toExternalAsset(repository, trendKinds[repository.id] ?? 'etc')
    if (persistSavedAssets([...savedAssets, asset])) {
      setNotice(`${repository.full_name}을(를) 참고 목록에 추가했습니다.`)
    }
  }

  function removeSavedAsset(id: string) {
    const asset = savedAssets.find((saved) => saved.id === id)
    if (!asset) return
    if (persistSavedAssets(savedAssets.filter((saved) => saved.id !== id))) {
      setNotice(`${asset.name}을(를) 참고 목록에서 제거했습니다.`)
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="shell header__inner">
          <span className="brand">AI Assets</span>
          <nav className="nav">
            <button type="button" className="nav__item" aria-current={filter === 'all'} onClick={() => setFilter('all')}>
              전체
            </button>
            {KINDS.map((k) => (
              <button key={k} type="button" className="nav__item" aria-current={filter === k} onClick={() => setFilter(k)}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </nav>
          <a className="header__link" href={ORG_URL} target="_blank" rel="noopener noreferrer">
            kalel-assets
          </a>
        </div>
      </header>

      <main className="shell main">
        <section className="hero">
          <div className="hero__inner">
            <h1 className="hero__title">나만의 AI Assets</h1>
            <p className="hero__lede">
              팀이 쓰고 만드는 SKILL · MCP · PLUGIN, 그리고 공유할 만한 가이드와 자료를 한곳에서.
            </p>

            <div className="search">
              <svg className="search__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                className="search__input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="자산, 태그, 만든 사람으로 검색…"
                aria-label="자산 검색"
              />
            </div>

            <div className="stats">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  className="stat"
                  aria-current={filter === k}
                  onClick={() => setFilter(filter === k ? 'all' : k)}
                >
                  <span className="stat__value">{counts[k]}</span>
                  <span className="stat__label">{KIND_LABEL[k]}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="trend-section" aria-labelledby="trend-title">
          <div className="trend-launch">
            <div>
              <h2 className="trend-launch__title" id="trend-title">
                GitHub 추천 탐색
              </h2>
              <p>최근 30일에 공개됐거나 STAR가 많은 저장소를 찾아보세요.</p>
            </div>
            <button
              type="button"
              className="trend-toggle"
              aria-expanded={trendOpen}
              aria-controls="git-trend-panel"
              onClick={() => {
                if (trendOpen) trendRequest.current?.abort()
                setTrendOpen((open) => !open)
              }}
            >
              GIT TREND
              <span aria-hidden="true">{trendOpen ? '−' : '+'}</span>
            </button>
          </div>

          {trendOpen ? (
            <div className="trend-panel" id="git-trend-panel">
              <div className="trend-modes" aria-label="추천 정렬 방식">
                {([
                  ['trending', '주목받는 중'],
                  ['stars', 'STAR 많은 순'],
                ] as const).map(([mode, label]) => (
                  <button
                    type="button"
                    key={mode}
                    aria-pressed={trendMode === mode}
                    onClick={() => {
                      trendRequest.current?.abort()
                      trendRequest.current = null
                      setTrendMode(mode)
                      setTrendState({ status: 'idle', repositories: [] })
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form
                className="trend-search"
                onSubmit={(event) => {
                  event.preventDefault()
                  void lookupTrends()
                }}
              >
                <label className="sr-only" htmlFor="trend-query">
                  GitHub 저장소 검색어
                </label>
                <input
                  id="trend-query"
                  type="search"
                  value={trendQuery}
                  disabled={trendState.status === 'loading'}
                  onChange={(event) => setTrendQuery(event.target.value)}
                  placeholder="예: AI agent, MCP, Claude skill"
                />
                <button type="submit" className="btn btn--primary" disabled={trendState.status === 'loading'}>
                  {trendState.status === 'loading' ? '조회 중…' : '조회'}
                </button>
              </form>

              {trendState.message ? (
                <p className={`trend-message trend-message--${trendState.status}`} role="status">
                  {trendState.message}
                </p>
              ) : null}

              {trendState.repositories.length > 0 ? (
                <ul className="trend-results">
                  {trendState.repositories.map((repository) => (
                    <TrendRow
                      repository={repository}
                      kind={trendKinds[repository.id] ?? 'etc'}
                      alreadyAdded={catalogUrls.has(repository.html_url.toLowerCase())}
                      onKindChange={(kind) =>
                        setTrendKinds((current) => ({ ...current, [repository.id]: kind }))
                      }
                      onAdd={() => addRecommendation(repository)}
                      key={repository.id}
                    />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </section>

        {notice ? (
          <p className="notice" role="status">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="알림 닫기">
              ×
            </button>
          </p>
        ) : null}

        {visible.length === 0 ? (
          <p className="empty">조건에 맞는 자산이 없습니다.</p>
        ) : (
          <>
            {mine.length > 0 && (
              <section className="section">
                <div className="section__head">
                  <h2 className="section__title">내 자산</h2>
                  <span className="section__note">kalel-assets org 및 멤버 소유 · 설치 명령 제공</span>
                </div>
                <div className="grid">
                  {mine.map((a) => (
                    <AssetCard asset={a} key={a.id} />
                  ))}
                </div>
              </section>
            )}

            {external.length > 0 && (
              <section className="section">
                <div className="section__head">
                  <h2 className="section__title">참고 자산</h2>
                  <span className="section__note">외부 저장소 큐레이션 · 링크만 제공</span>
                </div>
                <div className="asset-list">
                  {external.map((a) => (
                    <ExternalAssetRow
                      asset={a}
                      removable={savedIds.has(a.id)}
                      onRemove={removeSavedAsset}
                      key={a.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <div className="shell footer__inner">
          <div>
            <div className="footer__brand">AI Assets</div>
            <div className="footer__meta">kalel-assets · 외부 자산의 저작권은 각 원저작자에게 있습니다.</div>
          </div>
          <div className="footer__links">
            <a href={ORG_URL} target="_blank" rel="noopener noreferrer">
              GitHub Organization
            </a>
            <a href={CATALOG_URL} target="_blank" rel="noopener noreferrer">
              자산 등록하기
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
