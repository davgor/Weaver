import type { EnchantmentOverlay } from './enchantmentTypes.js'
import { isWeaponDamageType } from './enchantmentTypes.js'
import type { ItemInstance } from './types.js'

function cloneOverlay(overlay: EnchantmentOverlay): EnchantmentOverlay {
  if (overlay.kind === 'damage') {
    return {
      overlayId: overlay.overlayId,
      kind: 'damage',
      damageType: overlay.damageType,
      bonus: overlay.bonus
    }
  }
  return {
    overlayId: overlay.overlayId,
    kind: 'onHit',
    onHitEffectId: overlay.onHitEffectId
  }
}

function cloneOverlays(overlays: readonly EnchantmentOverlay[]): EnchantmentOverlay[] {
  return overlays.map(cloneOverlay)
}

export function listEnchantmentOverlays(instance: ItemInstance): EnchantmentOverlay[] {
  if (instance.enchantmentOverlays === undefined) return []
  return cloneOverlays(instance.enchantmentOverlays)
}

function validateOverlay(overlay: EnchantmentOverlay): void {
  if (!overlay.overlayId.trim()) throw new Error('overlayId required')
  if (overlay.kind === 'damage') {
    if (!isWeaponDamageType(overlay.damageType)) throw new Error(`Unknown damage type: ${overlay.damageType}`)
    if (!Number.isFinite(overlay.bonus)) throw new Error('Enchantment bonus must be a finite number')
    return
  }
  if (!overlay.onHitEffectId.trim()) throw new Error('onHitEffectId required')
}

export function applyEnchantmentOverlay(instance: ItemInstance, overlay: EnchantmentOverlay): ItemInstance {
  validateOverlay(overlay)
  const existing = listEnchantmentOverlays(instance)
  if (existing.some((entry) => entry.overlayId === overlay.overlayId)) {
    throw new Error(`Enchantment overlay already exists: ${overlay.overlayId}`)
  }
  return {
    ...instance,
    enchantmentOverlays: [...existing, cloneOverlay(overlay)]
  }
}

export function removeEnchantmentOverlay(instance: ItemInstance, overlayId: string): ItemInstance {
  const existing = listEnchantmentOverlays(instance)
  const next = existing.filter((entry) => entry.overlayId !== overlayId)
  if (next.length === existing.length) throw new Error(`Enchantment overlay not found: ${overlayId}`)
  if (next.length === 0) {
    const copy = { ...instance }
    delete copy.enchantmentOverlays
    return copy
  }
  return { ...instance, enchantmentOverlays: next }
}
