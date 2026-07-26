import type { SparseOverlay } from '@weaver/world-engine'
import type { LandUse, OverlayDraft } from './types.js'

/** Overlay key contract with WorldEngine SparseOverlay rows. */
export const OVERLAY_KEYS = {
  civilizationId: 'civ.civilizationId',
  landUse: 'civ.landUse',
  density: 'civ.density'
} as const

export type OverlayKey = (typeof OVERLAY_KEYS)[keyof typeof OVERLAY_KEYS]

export function isOverlayKey(key: string): key is OverlayKey {
  return Object.values(OVERLAY_KEYS).includes(key as OverlayKey)
}

export function overlaysFromDraft(
  worldId: string,
  civilizationId: string,
  drafts: readonly OverlayDraft[]
): SparseOverlay[] {
  const rows: SparseOverlay[] = []
  for (const draft of drafts) {
    rows.push({
      worldId,
      x: draft.x,
      y: draft.y,
      key: OVERLAY_KEYS.civilizationId,
      value: civilizationId
    })
    rows.push({
      worldId,
      x: draft.x,
      y: draft.y,
      key: OVERLAY_KEYS.landUse,
      value: draft.landUse
    })
    if (draft.density !== undefined) {
      rows.push({
        worldId,
        x: draft.x,
        y: draft.y,
        key: OVERLAY_KEYS.density,
        value: String(draft.density)
      })
    }
  }
  return rows
}

export function parseLandUse(value: string): LandUse | null {
  if (
    value === 'building' ||
    value === 'road' ||
    value === 'farmland' ||
    value === 'wall' ||
    value === 'district'
  ) {
    return value
  }
  return null
}
