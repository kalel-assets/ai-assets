// Validates src/data/assets.json. Catalog data is hand-edited via PR, so the
// invariants below are the ones that break silently and ship a broken card.
// Run: npm run validate    (also runs in CI before deploy)
import { readFileSync } from 'node:fs'

const KINDS = ['skill', 'mcp', 'plugin']
const SOURCES = ['org', 'external']
const STATUSES = ['stable', 'beta', 'wip']

const assets = JSON.parse(readFileSync(new URL('../src/data/assets.json', import.meta.url), 'utf8'))
const errors = []
const seen = new Set()

for (const [i, a] of assets.entries()) {
  const at = `[${i}] ${a.id ?? '(no id)'}`

  for (const f of ['id', 'kind', 'source', 'name', 'description', 'owner', 'repo', 'status', 'updated']) {
    if (!a[f]) errors.push(`${at}: missing required field "${f}"`)
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
  if (a.source === 'org' && !a.install) {
    errors.push(`${at}: org assets need an install command`)
  }

  if (a.repo && !/^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(a.repo)) {
    errors.push(`${at}: repo must be a bare https://github.com/<owner>/<repo> URL`)
  }
  if (a.updated && !/^\d{4}-\d{2}-\d{2}$/.test(a.updated)) {
    errors.push(`${at}: updated must be YYYY-MM-DD`)
  }
}

if (errors.length) {
  console.error(`assets.json: ${errors.length} problem(s)\n`)
  for (const e of errors) console.error('  ' + e)
  process.exit(1)
}
console.log(`assets.json OK — ${assets.length} assets (${assets.filter(a => a.source === 'org').length} org, ${assets.filter(a => a.source === 'external').length} external)`)
