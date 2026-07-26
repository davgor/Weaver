import { describe, expect, it } from 'vitest'
import { OVERLAY_KEYS, isOverlayKey, overlaysFromDraft, parseLandUse } from './overlayContract.js'

describe('CivilizationEngine overlay key contract', () => {
  it('exposes WorldEngine-compatible SparseOverlay keys', () => {
    expect(OVERLAY_KEYS.civilizationId).toBe('civ.civilizationId')
    expect(OVERLAY_KEYS.landUse).toBe('civ.landUse')
    expect(OVERLAY_KEYS.density).toBe('civ.density')
    expect(isOverlayKey('civ.landUse')).toBe(true)
    expect(isOverlayKey('terrain')).toBe(false)
  })

  it('maps draft overlays to SparseOverlay rows without display names or NPC facts', () => {
    const rows = overlaysFromDraft('w1', 'c1', [
      { x: 2, y: 3, landUse: 'building', density: 0.75 },
      { x: 4, y: 5, landUse: 'farmland' }
    ])
    expect(rows).toEqual([
      { worldId: 'w1', x: 2, y: 3, key: 'civ.civilizationId', value: 'c1' },
      { worldId: 'w1', x: 2, y: 3, key: 'civ.landUse', value: 'building' },
      { worldId: 'w1', x: 2, y: 3, key: 'civ.density', value: '0.75' },
      { worldId: 'w1', x: 4, y: 5, key: 'civ.civilizationId', value: 'c1' },
      { worldId: 'w1', x: 4, y: 5, key: 'civ.landUse', value: 'farmland' }
    ])
    expect(JSON.stringify(rows)).not.toMatch(/npc|name|personality/i)
  })

  it('parses landUse values from overlay strings', () => {
    expect(parseLandUse('building')).toBe('building')
    expect(parseLandUse('unknown')).toBeNull()
  })
})
