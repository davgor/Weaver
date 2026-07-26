import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT_SLOTS,
  createEmptyEquippedItems,
  type ItemInstance,
  type ItemTemplate
} from './types.js'

describe('item model types', () => {
  it('locks the supported equipment slots', () => {
    expect(EQUIPMENT_SLOTS).toEqual(['mainHand', 'offHand', 'shield', 'armor', 'accessories'])
    expect(createEmptyEquippedItems()).toEqual({
      accessories: []
    })
  })

  it('keeps template facts separate from instance state', () => {
    const template: ItemTemplate = {
      id: 'template.leather-armor',
      name: 'Leather Armor',
      description: 'Flexible boiled leather',
      equipmentSlots: ['armor'],
      tags: ['armor', 'light']
    }
    const instance: ItemInstance = {
      id: 'item.1',
      templateId: template.id,
      durability: 7,
      charges: 2,
      customName: 'Roadworn Jerkin',
      enchantmentOverlays: [
        { overlayId: 'overlay.minor-ward', kind: 'onHit', onHitEffectId: 'effect.minor-ward' }
      ]
    }

    expect(instance.templateId).toBe(template.id)
    expect(instance.customName).toBe('Roadworn Jerkin')
    expect(template.name).toBe('Leather Armor')
    expect('name' in instance).toBe(false)
  })
})
