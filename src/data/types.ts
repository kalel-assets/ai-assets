/**
 * `etc` is the escape hatch: a guide, a document, a bookmark — anything worth sharing
 * that is not an installable skill/MCP/plugin, and not necessarily a git repo at all.
 * It is the only kind whose `url` may point anywhere.
 */
export type AssetKind = 'skill' | 'mcp' | 'plugin' | 'etc'

export type AssetStatus = 'stable' | 'beta' | 'wip'

/**
 * Who owns the asset — drives how the card renders, not just how it is grouped.
 *
 * - `org`      : owned by kalel-assets or a member. Ships an install command
 *                (except `etc`, which usually has nothing to install).
 * - `external` : third-party we merely curate. Link only, never an install command —
 *                we do not control that code and cannot vouch for what a later commit
 *                puts in it.
 */
export type AssetSource = 'org' | 'external'

export interface Asset {
  /** URL-safe slug, unique across all kinds. Used as the deep-link anchor. */
  id: string
  kind: AssetKind
  source: AssetSource
  name: string
  /** One line. Shown on the card; keep it under ~100 chars. */
  description: string
  /**
   * Substrings of `description` to render bold. Plain terms, not regex, not markup —
   * the description stays readable as prose. Each term must actually occur in the
   * description; `npm run validate` fails on ones that do not, since a typo here is
   * silently invisible in the UI.
   */
  highlights?: string[]
  /**
   * The account hosting the repo. Required for skill/mcp/plugin and must equal the
   * owner segment of `url`; optional for `etc`, where the link may not belong to an
   * account at all. This is NOT a statement about org membership — an asset under a
   * member's personal account is still `source: 'org'`.
   */
  owner?: string
  /**
   * Where the asset lives.
   *
   * - skill / mcp / plugin: a bare `https://<host>/<owner>/<repo>` URL. The host is
   *   not pinned to github.com so an internal mirror can register its own Git server.
   * - etc: any https URL — a doc, a wiki page, a blog post, a repo, whatever.
   *
   * Used as a link target only, never rendered as visible text.
   */
  url: string
  tags: string[]
  /**
   * Copy-pasteable install command, surfaced through a copy button rather than printed.
   * Only for `source: 'org'`; required there except for `etc`, which often has nothing
   * to install. See INSTALL_HINTS for the per-kind shape.
   */
  install?: string
  /** SPDX id where known. Worth surfacing on external cards so credit is visible. */
  license?: string
  status: AssetStatus
  /** ISO date (YYYY-MM-DD) of last meaningful change. Drives the "recently updated" list. */
  updated: string
}

/**
 * Canonical install-command shapes per kind. Entries in assets.json should follow
 * these so the copy button produces something that actually runs. `etc` has no
 * canonical shape — whatever the thing needs, or nothing at all.
 */
export const INSTALL_HINTS: Record<Exclude<AssetKind, 'etc'>, string> = {
  skill: '/plugin marketplace add <owner>/<repo>',
  plugin: '/plugin install <name>@<marketplace>',
  mcp: 'claude mcp add <name> -- <command>',
}
