import { describe, expect, it } from 'vitest'
import {
  DAMAGE_TYPES,
  applyDamageModifiers,
  isDamageType,
  listDamageTypes
} from '@weaver/character-engine'
import { WEAPON_DAMAGE_TYPES } from '../enchantmentTypes.js'
import {
  buildWeaponDamageProfile,
  resolveWeaponDamageAgainstTarget
} from '../weaponDamage.js'
import type { ItemInstance, ItemTemplate } from '../types.js'

describe('ItemEngine -> CharacterEngine damage-type contract', () => {
  it('keeps weapon damage types aligned with CharacterEngine taxonomy', () => {
    expect([...WEAPON_DAMAGE_TYPES]).toEqual([...DAMAGE_TYPES])
    expect(listDamageTypes()).toEqual([...WEAPON_DAMAGE_TYPES])
    for (const damageType of WEAPON_DAMAGE_TYPES) {
      expect(isDamageType(damageType)).toBe(true)
    }
  })

  it('resolves multi-type weapon damage through CharacterEngine applyDamageModifiers', () => {
    const template: ItemTemplate = {
      id: 'template.contract-sword',
      name: 'Contract Sword',
      weaponDamage: [{ damageType: 'Physical', amount: 10 }]
    }
    const instance: ItemInstance = {
      id: 'item.contract-sword',
      templateId: template.id,
      enchantmentOverlays: [
        { overlayId: 'overlay.fire', kind: 'damage', damageType: 'Fire', bonus: 4 }
      ]
    }
    const profile = buildWeaponDamageProfile(template, instance)

    const resolved = resolveWeaponDamageAgainstTarget(
      profile.damageComponents,
      { resistances: ['Fire'], vulnerabilities: ['Physical'] },
      (amount, input) =>
        applyDamageModifiers(amount, {
          damageType: input.damageType as (typeof DAMAGE_TYPES)[number],
          resistances: input.resistances as (typeof DAMAGE_TYPES)[number][],
          vulnerabilities: input.vulnerabilities as (typeof DAMAGE_TYPES)[number][]
        })
    )

    expect(resolved).toEqual([
      { damageType: 'Physical', baseAmount: 10, finalAmount: 20 },
      { damageType: 'Fire', baseAmount: 4, finalAmount: 2 }
    ])
  })
})
