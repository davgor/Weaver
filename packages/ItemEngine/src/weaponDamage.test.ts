import { describe, expect, it } from 'vitest'
import type { ItemInstance, ItemTemplate } from './types.js'
import {
  buildWeaponDamageProfile,
  resolveWeaponDamageAgainstTarget,
  type DamageModifierFn
} from './weaponDamage.js'

const flamingSwordTemplate: ItemTemplate = {
  id: 'template.flaming-sword',
  name: 'Flaming Sword',
  equipmentSlots: ['mainHand'],
  tags: ['weapon'],
  weaponDamage: [{ damageType: 'Physical', amount: 6 }]
}

const flamingSwordInstance: ItemInstance = {
  id: 'item.flaming',
  templateId: flamingSwordTemplate.id,
  enchantmentOverlays: [
    {
      overlayId: 'overlay.flame',
      kind: 'damage',
      damageType: 'Fire',
      bonus: 3
    },
    {
      overlayId: 'overlay.burn',
      kind: 'onHit',
      onHitEffectId: 'effect.ignite'
    }
  ]
}

const identityModifier: DamageModifierFn = (amount) => amount

describe('buildWeaponDamageProfile', () => {
  it('merges base weapon damage with enchantment damage overlays', () => {
    const profile = buildWeaponDamageProfile(flamingSwordTemplate, flamingSwordInstance)

    expect(profile.damageComponents).toEqual([
      { damageType: 'Physical', amount: 6 },
      { damageType: 'Fire', amount: 3 }
    ])
    expect(profile.onHitEffectIds).toEqual(['effect.ignite'])
  })

  it('combines multiple overlays that share a damage type', () => {
    const profile = buildWeaponDamageProfile(flamingSwordTemplate, {
      ...flamingSwordInstance,
      enchantmentOverlays: [
        { overlayId: 'overlay.flame', kind: 'damage', damageType: 'Fire', bonus: 2 },
        { overlayId: 'overlay.ember', kind: 'damage', damageType: 'Fire', bonus: 1 }
      ]
    })

    expect(profile.damageComponents).toEqual([
      { damageType: 'Physical', amount: 6 },
      { damageType: 'Fire', amount: 3 }
    ])
  })
})

describe('resolveWeaponDamageAgainstTarget', () => {
  it('resolves each damage type independently against resistances and vulnerabilities', () => {
    const profile = buildWeaponDamageProfile(flamingSwordTemplate, flamingSwordInstance)
    const applyModifier: DamageModifierFn = (amount, input) => {
      if (input.damageType === 'Fire' && input.resistances.includes('Fire')) {
        return amount / 2
      }
      if (input.damageType === 'Physical' && input.vulnerabilities.includes('Physical')) {
        return amount * 2
      }
      return amount
    }

    const resolved = resolveWeaponDamageAgainstTarget(
      profile.damageComponents,
      { resistances: ['Fire'], vulnerabilities: ['Physical'] },
      applyModifier
    )

    expect(resolved).toEqual([
      { damageType: 'Physical', baseAmount: 6, finalAmount: 12 },
      { damageType: 'Fire', baseAmount: 3, finalAmount: 1.5 }
    ])
  })

  it('passes each component through the modifier callback separately', () => {
    const calls: string[] = []
    const applyModifier: DamageModifierFn = (amount, input) => {
      calls.push(`${input.damageType}:${amount}`)
      return amount
    }

    resolveWeaponDamageAgainstTarget(
      [
        { damageType: 'Physical', amount: 4 },
        { damageType: 'Cold', amount: 2 }
      ],
      { resistances: [], vulnerabilities: [] },
      applyModifier
    )

    expect(calls).toEqual(['Physical:4', 'Cold:2'])
  })

  it('uses injected modifier without assuming resistance rules locally', () => {
    const resolved = resolveWeaponDamageAgainstTarget(
      [{ damageType: 'Poison', amount: 8 }],
      { resistances: ['Poison'], vulnerabilities: [] },
      identityModifier
    )

    expect(resolved).toEqual([{ damageType: 'Poison', baseAmount: 8, finalAmount: 8 }])
  })
})
