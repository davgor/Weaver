import { describe, expect, it } from 'vitest'
import {
  compatibleEquipSlots,
  equipmentSlotLabel,
  listFixedSlotEntries
} from './equipmentSlots.js'
import type { EquippedItemViews, ItemView } from '@weaver/item-engine'

const sword: ItemView = {
  template: {
    id: 'template.sword',
    name: 'Sword',
    equipmentSlots: ['mainHand', 'offHand']
  },
  instance: { id: 'item.1', templateId: 'template.sword' }
}

const potion: ItemView = {
  template: { id: 'template.potion', name: 'Potion' },
  instance: { id: 'item.2', templateId: 'template.potion' }
}

describe('equipment slot helpers', () => {
  it('lists fixed slot rows with labels and current item', () => {
    const equipped: EquippedItemViews = {
      mainHand: sword,
      accessories: []
    }
    expect(listFixedSlotEntries(equipped)).toEqual([
      { slot: 'mainHand', label: 'Main Hand', item: sword },
      { slot: 'offHand', label: 'Off Hand', item: undefined },
      { slot: 'shield', label: 'Shield', item: undefined },
      { slot: 'armor', label: 'Armor', item: undefined }
    ])
  })

  it('returns compatible slots for an item and empty for unequippable', () => {
    expect(compatibleEquipSlots(sword)).toEqual(['mainHand', 'offHand'])
    expect(compatibleEquipSlots(potion)).toEqual([])
    expect(equipmentSlotLabel('accessories')).toBe('Accessories')
  })
})
