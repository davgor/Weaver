import { describe, expect, it } from 'vitest'
import { estimateArmorBonus } from './armorBonus.js'
import type { EquippedItemViews } from '@weaver/item-engine'

function armorView(tags: string[]): EquippedItemViews {
  return {
    armor: {
      template: {
        id: 'template.armor',
        name: 'Armor',
        equipmentSlots: ['armor'],
        tags
      },
      instance: { id: 'item.armor', templateId: 'template.armor' }
    },
    accessories: []
  }
}

describe('estimateArmorBonus', () => {
  it('returns 0 when no armor is equipped', () => {
    expect(estimateArmorBonus({ accessories: [] })).toBe(0)
  })

  it('maps light/medium/heavy tags and defaults unknown armored gear', () => {
    expect(estimateArmorBonus(armorView(['armor', 'light']))).toBe(2)
    expect(estimateArmorBonus(armorView(['armor', 'medium']))).toBe(4)
    expect(estimateArmorBonus(armorView(['armor', 'heavy']))).toBe(6)
    expect(estimateArmorBonus(armorView(['armor']))).toBe(3)
  })
})
