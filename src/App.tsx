import { useMemo, useState } from 'react'
import rawAssets from './data/assets.json'
import type { Asset, AssetKind } from './data/types'

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

export default function App() {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const counts = useMemo(
    () =>
      Object.fromEntries(
        KINDS.map((k) => [k, assets.filter((a) => a.kind === k).length]),
      ) as Record<AssetKind, number>,
    [],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return assets.filter((a) => {
      if (filter !== 'all' && a.kind !== filter) return false
      if (!q) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        (a.owner ?? '').toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }, [filter, query])

  const mine = visible.filter((a) => a.source === 'org')
  const external = visible.filter((a) => a.source === 'external')

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
                  <h2 className="section__title">외부 자산</h2>
                  <span className="section__note">참고용 큐레이션 · 원저장소 링크만 제공</span>
                </div>
                <div className="grid">
                  {external.map((a) => (
                    <AssetCard asset={a} key={a.id} />
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
