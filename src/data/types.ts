export type AssetKind = 'skill' | 'mcp' | 'plugin'

export type AssetStatus = 'stable' | 'beta' | 'wip'

/**
 * Who owns the asset — drives how the card renders, not just how it is grouped.
 *
 * - `org`      : owned by kalel-assets or a member. Ships an install command.
 * - `external` : third-party repo we merely curate. Link only, never an install
 *                command — we do not control that code and cannot vouch for what
 *                a later commit puts in it.
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
  /** GitHub owner — an org member's handle, or the upstream author for external assets. */
  owner: string
  /** Full repo URL. */
  repo: string
  tags: string[]
  /**
   * Copy-pasteable install command. Set this ONLY when `source === 'org'`.
   * See INSTALL_HINTS for the per-kind shape.
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
 * these so the copy button produces something that actually runs.
 */
export const INSTALL_HINTS: Record<AssetKind, string> = {
  skill: '/plugin marketplace add <owner>/<repo>',
  plugin: '/plugin install <name>@<marketplace>',
  mcp: 'claude mcp add <name> -- <command>',
}
