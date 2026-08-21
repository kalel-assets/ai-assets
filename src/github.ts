import type { Asset, AssetKind } from './data/types'

export type TrendMode = 'trending' | 'stars'

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  stargazers_count: number
  owner: { login: string }
  topics: string[]
  license: { spdx_id: string } | null
  pushed_at: string
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

const STORAGE_KEY = 'ai-assets:github-recommendations'

/** Builds the public repository search used by the static catalog. */
export function buildGitHubSearchUrl(query: string, mode: TrendMode, now = new Date()) {
  const qualifiers = ['in:name,description', 'archived:false', 'fork:false']
  if (mode === 'trending') {
    const since = new Date(now)
    since.setUTCDate(since.getUTCDate() - 30)
    qualifiers.push(`created:>=${since.toISOString().slice(0, 10)}`)
  }

  const params = new URLSearchParams({
    q: `${query.trim()} ${qualifiers.join(' ')}`,
    sort: 'stars',
    order: 'desc',
    per_page: '10',
  })
  return `https://api.github.com/search/repositories?${params}`
}

/** Fetches GitHub recommendations only when the visitor explicitly requests them. */
export async function searchGitHubRepositories(
  query: string,
  mode: TrendMode,
  signal?: AbortSignal,
  request: typeof fetch = fetch,
) {
  const response = await request(buildGitHubSearchUrl(query, mode), {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal,
  })

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error('GitHub 조회 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.')
    }
    throw new Error(`GitHub 조회에 실패했습니다. (${response.status})`)
  }

  const data = (await response.json()) as { items?: GitHubRepository[] }
  return Array.isArray(data.items) ? data.items : []
}

/** Converts a recommendation into the catalog's link-only external asset shape. */
export function toExternalAsset(
  repository: GitHubRepository,
  kind: AssetKind,
  registered: string,
): Asset {
  const license = repository.license?.spdx_id

  return {
    id: `github-${repository.id}`,
    kind,
    source: 'external',
    name: repository.name,
    description: repository.description?.trim() || 'GitHub에서 주목받는 공개 저장소입니다.',
    owner: repository.owner.login,
    url: repository.html_url,
    tags: repository.topics.length > 0 ? repository.topics.slice(0, 5) : ['github'],
    ...(license && license !== 'NOASSERTION' ? { license } : {}),
    status: 'stable',
    registered,
    updated: repository.pushed_at.slice(0, 10),
  }
}

type SavedAsset = Omit<Asset, 'registered'> & { registered?: string }

function isSavedAsset(value: unknown): value is SavedAsset {
  if (!value || typeof value !== 'object') return false
  const asset = value as Partial<SavedAsset>
  return (
    typeof asset.id === 'string' &&
    /^github-\d+$/.test(asset.id) &&
    ['skill', 'mcp', 'plugin', 'etc'].includes(asset.kind ?? '') &&
    asset.source === 'external' &&
    typeof asset.name === 'string' &&
    typeof asset.description === 'string' &&
    typeof asset.owner === 'string' &&
    typeof asset.url === 'string' &&
    /^https:\/\/github\.com\/[^/]+\/[^/]+$/.test(asset.url) &&
    Array.isArray(asset.tags) &&
    asset.tags.length > 0 &&
    asset.tags.every((tag) => typeof tag === 'string') &&
    (asset.highlights === undefined ||
      (Array.isArray(asset.highlights) &&
        asset.highlights.every((highlight) => typeof highlight === 'string'))) &&
    asset.status === 'stable' &&
    (asset.registered === undefined ||
      (typeof asset.registered === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(asset.registered))) &&
    typeof asset.updated === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(asset.updated) &&
    asset.install === undefined
  )
}

/** Restores only recognizable recommendation entries; corrupt data is ignored. */
export function loadSavedAssets(storage: StorageLike): Asset[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed)
      ? parsed
          .filter(isSavedAsset)
          .map((asset) => ({ ...asset, registered: asset.registered ?? asset.updated }))
      : []
  } catch {
    return []
  }
}

/** Persists the visitor's personal recommendation list in this browser. */
export function saveAssets(storage: StorageLike, assets: Asset[]) {
  storage.setItem(STORAGE_KEY, JSON.stringify(assets))
}
