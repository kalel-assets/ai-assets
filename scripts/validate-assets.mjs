// Validates src/data/assets.json. Catalog data is hand-edited via PR, so the
// invariants below are the ones that break silently and ship a broken card.
// Run: npm run validate    (also runs in CI before deploy)
import { readFileSync } from 'node:fs'

const KINDS = ['skill', 'mcp', 'plugin', 'etc']
// `etc` is the only kind whose url may be an arbitrary link rather than a repo.
const REPO_KINDS = ['skill', 'mcp', 'plugin']
const SOURCES = ['org', 'external']
const STATUSES = ['stable', 'beta', 'wip']

const assets = JSON.parse(readFileSync(new URL('../src/data/assets.json', import.meta.url), 'utf8'))
const errors = []
const seen = new Set()

for (const [i, a] of assets.entries()) {
  const at = `[${i}] ${a.id ?? '(no id)'}`

  for (const f of ['id', 'kind', 'source', 'name', 'description', 'url', 'status', 'registered', 'updated']) {
    if (!a[f]) errors.push(`${at}: missing required field "${f}"`)
  }
  // owner identifies the hosting account, which only means something for a repo.
  if (REPO_KINDS.includes(a.kind) && !a.owner) {
    errors.push(`${at}: owner is required for kind "${a.kind}"`)
  }
  if (!Array.isArray(a.tags) || a.tags.length === 0) errors.push(`${at}: tags must be a non-empty array`)

  if (a.kind && !KINDS.includes(a.kind)) errors.push(`${at}: kind "${a.kind}" not in ${KINDS}`)
  if (a.source && !SOURCES.includes(a.source)) errors.push(`${at}: source "${a.source}" not in ${SOURCES}`)
  if (a.status && !STATUSES.includes(a.status)) errors.push(`${at}: status "${a.status}" not in ${STATUSES}`)

  if (a.id) {
    if (seen.has(a.id)) errors.push(`${at}: duplicate id — ids are deep-link anchors and must be unique`)
    seen.add(a.id)
    if (!/^[a-z0-9-]+$/.test(a.id)) errors.push(`${at}: id must be lowercase kebab-case`)
  }

  // A highlight that does not occur in the description renders as nothing at all,
  // so a typo here is invisible in the UI — catch it at build time instead.
  if (a.highlights !== undefined) {
    if (!Array.isArray(a.highlights)) {
      errors.push(`${at}: highlights must be an array`)
    } else {
      for (const h of a.highlights) {
        if (typeof h !== 'string' || h.trim() === '') {
          errors.push(`${at}: highlights entries must be non-empty strings`)
        } else if (!(a.description ?? '').toLowerCase().includes(h.toLowerCase())) {
          errors.push(`${at}: highlight "${h}" does not occur in the description`)
        }
      }
    }
  }

  // The rule from the "external is external" decision: we link third-party code,
  // we never hand out a command that installs it.
  if (a.source === 'external' && a.install) {
    errors.push(`${at}: external assets must NOT carry an install command — link only`)
  }
  // A guide or a bookmark has nothing to install, so `etc` is exempt.
  if (a.source === 'org' && a.kind !== 'etc' && !a.install) {
    errors.push(`${at}: org assets need an install command (except kind "etc")`)
  }

  if (a.url && !/^https:\/\//.test(a.url)) {
    errors.push(`${at}: url must start with https://`)
  } else if (REPO_KINDS.includes(a.kind)) {
    // Host is deliberately not pinned to github.com: an internal mirror hosts the same
    // catalog on its own Git server, and pinning would fail every internal asset.
    const repoMatch = a.url ? /^https:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(a.url) : null
    if (a.url && !repoMatch) {
      errors.push(`${at}: kind "${a.kind}" needs a bare https://<host>/<owner>/<repo> url`)
    } else if (repoMatch && a.owner && repoMatch[2].toLowerCase() !== a.owner.toLowerCase()) {
      // `owner` is the account that hosts the repo, nothing else. Whether an asset is
      // ours or third-party is carried by `source` — conflating the two is the usual
      // mistake when registering an asset.
      errors.push(
        `${at}: owner "${a.owner}" does not match the url owner "${repoMatch[2]}" — ` +
          `owner is the hosting account; use "source" for org vs external`,
      )
    }
  }
  if (a.updated && !/^\d{4}-\d{2}-\d{2}$/.test(a.updated)) {
    errors.push(`${at}: updated must be YYYY-MM-DD`)
  }
  if (a.registered && !/^\d{4}-\d{2}-\d{2}$/.test(a.registered)) {
    errors.push(`${at}: registered must be YYYY-MM-DD`)
  }
}

if (errors.length) {
  console.error(`assets.json: ${errors.length} problem(s)\n`)
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}
const byKind = KINDS.map((k) => `${k} ${assets.filter((a) => a.kind === k).length}`).join(', ')
console.log(
  `assets.json OK — ${assets.length} assets ` +
    `(${assets.filter((a) => a.source === 'org').length} org, ` +
    `${assets.filter((a) => a.source === 'external').length} external | ${byKind})`,
)
