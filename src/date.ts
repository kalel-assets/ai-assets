import type { Asset } from './data/types'

/** Returns the later catalog-registration or upstream-update ISO date. */
export function latestAssetDate(asset: Pick<Asset, 'registered' | 'updated'>): string {
  return asset.registered > asset.updated ? asset.registered : asset.updated
}

/** Formats a Date as YYYY-MM-DD in the visitor's local timezone. */
export function localIsoDate(date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE').format(date)
}
