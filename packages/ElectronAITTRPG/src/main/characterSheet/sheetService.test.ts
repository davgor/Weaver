import { describe, expect, it } from 'vitest'
import {
  persistCharacterMaxHp,
  getAbilityModifier,
  calculateArmorClass,
  getCharacterStats,
  listJournalEntries,
  listLogBookEntries,
  listQuestLog,
  listKnownActions
} from '@weaver/character-engine'
import { createItemService } from '@weaver/item-engine'
import {
  equipCharacterSheetItem,
  loadCharacterSheet,
  unequipCharacterSheetItem
} from './sheetService.js'
import { createEnginePorts } from './loadSheet.js'

describe('sheetService', () => {
  it('loads, equips, and unequips while keeping ability context', () => {
    const characterId = `svc-${Date.now()}`
    const service = createItemService()
    service.defineTemplate({
      id: 'template.svc_sword',
      name: 'Svc Sword',
      equipmentSlots: ['mainHand']
    })
    service.createInventory(characterId)
    const sword = service.addItem(characterId, 'template.svc_sword')
    persistCharacterMaxHp({
      characterId,
      hitDie: 8,
      level: 1,
      bodyMod: 1
    })

    const ports = createEnginePorts({
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

    const loaded = loadCharacterSheet(ports, {
      characterId,
      characterName: 'Svc',
      abilityScores: { Body: 12, Agility: 10, Mind: 10, Presence: 10 }
    })
    expect(loaded.maxHp).toBe(9)

    const equipped = equipCharacterSheetItem(ports, {
      characterId,
      instanceId: sword.id,
      slot: 'mainHand'
    })
    expect(equipped.equipped.mainHand?.instance.id).toBe(sword.id)

    const unequipped = unequipCharacterSheetItem(ports, {
      characterId,
      target: 'mainHand'
    })
    expect(unequipped.equipped.mainHand).toBeUndefined()
  })
})
