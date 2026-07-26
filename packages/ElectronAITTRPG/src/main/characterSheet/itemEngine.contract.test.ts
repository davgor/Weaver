import { describe, expect, it } from 'vitest'
import {
  calculateArmorClass,
  getAbilityModifier,
  getCharacterStats,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog
} from '@weaver/character-engine'
import {
  createItemService,
  type EquipmentSlot,
  type ItemService
} from '@weaver/item-engine'
import {
  buildCharacterSheetSnapshot,
  createEnginePorts,
  equipAndReload,
  unequipAndReload
} from './loadSheet.js'

const CHARACTER_ID = `sheet-char-ie-${Date.now()}`

function seededItemService(): ItemService {
  const service = createItemService()
  service.defineTemplate({
    id: 'template.sheet_sword',
    name: 'Sheet Sword',
    equipmentSlots: ['mainHand', 'offHand']
  })
  service.defineTemplate({
    id: 'template.sheet_shield',
    name: 'Sheet Shield',
    equipmentSlots: ['shield']
  })
  service.defineTemplate({
    id: 'template.sheet_armor',
    name: 'Sheet Armor',
    equipmentSlots: ['armor'],
    tags: ['armor', 'medium']
  })
  service.defineTemplate({
    id: 'template.sheet_ring',
    name: 'Sheet Ring',
    equipmentSlots: ['accessories']
  })
  service.createInventory(CHARACTER_ID)
  return service
}

function portsFor(service: ItemService) {
  return createEnginePorts({
    getAbilityModifier,
    calculateArmorClass,
    getCharacterStats,
    listJournalEntries,
    listLogBookEntries,
    listQuestLog,
    listKnownActions,
    listInventory: (id) => service.listInventory(id),
    equip: (id, instanceId, slot) => service.equip(id, instanceId, slot),
    unequip: (id, target) => service.unequip(id, target)
  })
}

describe('character sheet ItemEngine contract (032)', () => {
  it('loads equipped items and enforces slot constraints via real ItemEngine APIs', () => {
    const service = seededItemService()
    const sword = service.addItem(CHARACTER_ID, 'template.sheet_sword')
    const shield = service.addItem(CHARACTER_ID, 'template.sheet_shield')
    const armor = service.addItem(CHARACTER_ID, 'template.sheet_armor')
    const ring = service.addItem(CHARACTER_ID, 'template.sheet_ring')
    const ports = portsFor(service)
    const request = {
      characterId: CHARACTER_ID,
      characterName: 'Gear PC',
      abilityScores: { Body: 12, Agility: 14, Mind: 10, Presence: 10 }
    }

    const afterSword = equipAndReload(ports, request, sword.id, 'mainHand')
    expect(afterSword.equipped.mainHand?.instance.id).toBe(sword.id)

    expect(() =>
      equipAndReload(ports, request, armor.id, 'mainHand' as EquipmentSlot)
    ).toThrow(/not compatible/)

    const afterArmor = equipAndReload(ports, request, armor.id, 'armor')
    expect(afterArmor.armorBonus).toBe(4)
    expect(afterArmor.armorClass).toBe(
      calculateArmorClass({ agilityScore: 14, armorBonus: 4 })
    )

    equipAndReload(ports, request, shield.id, 'shield')
    equipAndReload(ports, request, ring.id, 'accessories')
    const afterUnequip = unequipAndReload(ports, request, 'mainHand')
    expect(afterUnequip.equipped.mainHand).toBeUndefined()
    expect(afterUnequip.held.some((item) => item.instance.id === sword.id)).toBe(true)
    expect(afterUnequip.equipped.shield?.instance.id).toBe(shield.id)
    expect(afterUnequip.equipped.accessories[0]?.instance.id).toBe(ring.id)

    const live = buildCharacterSheetSnapshot(ports, request)
    expect(live.equipped.armor?.template.name).toBe('Sheet Armor')
  })
})
