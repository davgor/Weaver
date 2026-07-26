import { describe, expect, it } from 'vitest'
import {
  applyEnchantmentOverlay,
  listEnchantmentOverlays,
  removeEnchantmentOverlay
} from './enchantmentModifications.js'
import type { ItemInstance } from './types.js'

const baseInstance: ItemInstance = {
  id: 'item.ring',
  templateId: 'template.ring'
}

const frostDamageOverlay = {
  overlayId: 'overlay.frost',
  kind: 'damage' as const,
  damageType: 'Cold' as const,
  bonus: 2
}

const chillOnHitOverlay = {
  overlayId: 'overlay.chill',
  kind: 'onHit' as const,
  onHitEffectId: 'effect.chill'
}

describe('applyEnchantmentOverlay', () => {
  it('applies a damage overlay without mutating the source instance', () => {
    const updated = applyEnchantmentOverlay(baseInstance, frostDamageOverlay)

    expect(updated.enchantmentOverlays).toEqual([frostDamageOverlay])
    expect(baseInstance.enchantmentOverlays).toBeUndefined()
  })

  it('rejects duplicate overlay ids', () => {
    const enchanted = applyEnchantmentOverlay(baseInstance, frostDamageOverlay)

    expect(() =>
      applyEnchantmentOverlay(enchanted, {
        overlayId: 'overlay.frost',
        kind: 'onHit',
        onHitEffectId: 'effect.chill'
      })
    ).toThrow(/overlay already exists/)
  })
})

describe('removeEnchantmentOverlay', () => {
  it('removes overlays by id and leaves other overlays intact', () => {
    const enchanted = applyEnchantmentOverlay(
      applyEnchantmentOverlay(baseInstance, frostDamageOverlay),
      chillOnHitOverlay
    )

    const updated = removeEnchantmentOverlay(enchanted, 'overlay.frost')

    expect(listEnchantmentOverlays(updated)).toEqual([chillOnHitOverlay])
  })

  it('rejects removing a missing overlay id', () => {
    expect(() => removeEnchantmentOverlay(baseInstance, 'overlay.missing')).toThrow(/overlay not found/)
  })
})
