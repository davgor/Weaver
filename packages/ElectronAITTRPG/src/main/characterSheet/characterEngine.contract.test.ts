import { describe, expect, it } from 'vitest'
import {
  calculateArmorClass,
  getAbilityModifier,
  getCharacterStats,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog,
  addJournalEntry,
  learnKnownAction,
  persistCharacterMaxHp,
  upsertQuest,
  writeLogBookEvent
} from '@weaver/character-engine'
import { buildCharacterSheetSnapshot, createEnginePorts } from './loadSheet.js'
import type { InventorySnapshot } from '@weaver/item-engine'
import type { CharacterSheetSnapshot } from '../../shared/characterSheet/types.js'

const CHARACTER_ID = `sheet-char-ce-${Date.now()}`

function emptyInventory(characterId: string): InventorySnapshot {
  return { characterId, held: [], equipped: { accessories: [] } }
}

describe('character sheet CharacterEngine contract (028)', () => {
  it('loads modifiers, AC, HP, journal, log book, quests, and known actions from real APIs', () => {
    seedContractCharacter()
    const snapshot = loadContractSnapshot()
    assertContractSnapshot(snapshot)
  })
})

function seedContractCharacter(): void {
  persistCharacterMaxHp({
    characterId: CHARACTER_ID,
    hitDie: 8,
    level: 2,
    bodyMod: 2,
    rolls: [8, 5]
  })
  addJournalEntry({ characterId: CHARACTER_ID, text: 'Contract journal note' })
  writeLogBookEvent({
    characterIds: [CHARACTER_ID],
    type: 'combat',
    payload: { foe: 'wolf' }
  })
  upsertQuest({
    characterId: CHARACTER_ID,
    questId: 'quest.main.relic',
    kind: 'main',
    status: 'active',
    title: 'Recover the Relic'
  })
  upsertQuest({
    characterId: CHARACTER_ID,
    questId: 'quest.side.herbs',
    kind: 'side',
    status: 'active',
    title: 'Gather Herbs'
  })
  learnKnownAction(CHARACTER_ID, 'ice_bolt')
  learnKnownAction(CHARACTER_ID, 'hamstring_strike')
}

function loadContractSnapshot(): CharacterSheetSnapshot {
  const ports = createEnginePorts({
    getAbilityModifier,
    calculateArmorClass,
    getCharacterStats,
    listJournalEntries,
    listLogBookEntries,
    listQuestLog,
    listKnownActions,
    listInventory: (id) => emptyInventory(id),
    equip: (id) => emptyInventory(id),
    unequip: (id) => emptyInventory(id)
  })
  return buildCharacterSheetSnapshot(ports, {
    characterId: CHARACTER_ID,
    characterName: 'Contract PC',
    abilityScores: { Body: 14, Agility: 16, Mind: 10, Presence: 8 }
  })
}

function assertContractSnapshot(snapshot: CharacterSheetSnapshot): void {
  expect(getAbilityModifier(16)).toBe(3)
  expect(snapshot.abilityRows.find((row) => row.ability === 'Agility')?.modifier).toBe(3)
  expect(snapshot.armorClass).toBe(calculateArmorClass({ agilityScore: 16, armorBonus: 0 }))
  expect(snapshot.maxHp).toBe(getCharacterStats(CHARACTER_ID)?.maxHp)
  expect(snapshot.journal.some((entry) => entry.text === 'Contract journal note')).toBe(true)
  expect(snapshot.logBook.some((entry) => entry.type === 'combat')).toBe(true)
  expect(snapshot.mainQuests[0]?.questId).toBe('quest.main.relic')
  expect(snapshot.sideQuests[0]?.questId).toBe('quest.side.herbs')
  expect(snapshot.knownActionIds).toEqual(['hamstring_strike', 'ice_bolt'])
}
