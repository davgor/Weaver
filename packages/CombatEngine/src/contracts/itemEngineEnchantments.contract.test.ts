import { describe, expect, it } from 'vitest'
import {
  applyDamageModifiers,
  isDamageType,
  type DamageType
} from '@weaver/character-engine'
import {
  buildWeaponDamageProfile,
  createItemService,
  listEnchantmentOverlays,
  resolveWeaponDamageAgainstTarget,
  type ItemService,
  type ItemInstance
} from '@weaver/item-engine'

function seedEnchantedCombatSword(items: ItemService) {
  items.defineTemplate({
    id: 'template.combat-flame-sword',
    name: 'Combat Flame Sword',
    equipmentSlots: ['mainHand'],
    tags: ['weapon'],
    weaponDamage: [{ damageType: 'Physical', amount: 8 }]
  })
  items.createInventory('hero.combat-contract')
  const sword = items.addItem('hero.combat-contract', 'template.combat-flame-sword')
  const enchanted = items.applyEnchantment(sword.id, {
    overlayId: 'overlay.combat-flame',
    kind: 'damage',
    damageType: 'Fire',
    bonus: 4
  })
  items.applyEnchantment(enchanted.id, {
    overlayId: 'overlay.combat-ignite',
    kind: 'onHit',
    onHitEffectId: 'effect.ignite'
  })
  return sword
}

function readCombatSwordProfile(items: ItemService, sword: ItemInstance) {
  const refreshed = items.getItemInstance(sword.id)
  const template = items.getTemplate('template.combat-flame-sword')
  return {
    overlays: listEnchantmentOverlays(refreshed),
    profile: buildWeaponDamageProfile(template, refreshed)
  }
}

describe('CombatEngine -> ItemEngine enchantment overlay contract', () => {
  it('reads enchantment overlays and weapon damage from ItemEngine instead of duplicating them', () => {
    const items = createItemService()
    const sword = seedEnchantedCombatSword(items)
    const { overlays, profile } = readCombatSwordProfile(items, sword)

    expect(overlays).toEqual([
      { overlayId: 'overlay.combat-flame', kind: 'damage', damageType: 'Fire', bonus: 4 },
      { overlayId: 'overlay.combat-ignite', kind: 'onHit', onHitEffectId: 'effect.ignite' }
    ])
    expect(profile.damageComponents).toEqual([
      { damageType: 'Physical', amount: 8 },
      { damageType: 'Fire', amount: 4 }
    ])
    expect(profile.onHitEffectIds).toEqual(['effect.ignite'])

    const resolved = resolveWeaponDamageAgainstTarget(
      profile.damageComponents,
      { resistances: ['Fire'], vulnerabilities: [] },
      (amount, input) =>
        applyDamageModifiers(amount, {
          damageType: asDamageType(input.damageType),
          resistances: input.resistances.map(asDamageType),
          vulnerabilities: input.vulnerabilities.map(asDamageType)
        })
    )

    expect(resolved).toEqual([
      { damageType: 'Physical', baseAmount: 8, finalAmount: 8 },
      { damageType: 'Fire', baseAmount: 4, finalAmount: 2 }
    ])
    expect(profile.damageComponents.every((entry) => isDamageType(entry.damageType))).toBe(true)
  })
})

function asDamageType(value: string): DamageType {
  if (!isDamageType(value)) {
    throw new Error(`Unexpected damage type: ${value}`)
  }
  return value
}
