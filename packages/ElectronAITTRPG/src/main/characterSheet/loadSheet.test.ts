import { describe, expect, it } from 'vitest'
import type { AbilityScores } from '@weaver/character-engine'
import type {
  EquipmentSlot,
  EquippedItemViews,
  InventorySnapshot,
  ItemView
} from '@weaver/item-engine'
import { buildCharacterSheetSnapshot, type CharacterSheetPorts } from './loadSheet.js'

const SCORES: AbilityScores = { Body: 14, Agility: 12, Mind: 10, Presence: 8 }

function emptyEquipped(): EquippedItemViews {
  return { accessories: [] }
}

function makePorts(overrides: Partial<CharacterSheetPorts> = {}): CharacterSheetPorts {
  const held: ItemView[] = []
  const equipped = emptyEquipped()
  const inventory: InventorySnapshot = {
    characterId: 'pc-1',
    held,
    equipped
  }
  return {
    getAbilityModifier: (score) => Math.floor((score - 10) / 2),
    calculateArmorClass: ({ agilityScore, armorBonus }) =>
      10 + Math.floor((agilityScore - 10) / 2) + armorBonus,
    getCharacterStats: () => ({ characterId: 'pc-1', maxHp: 18 }),
    listJournalEntries: () => [
      { id: 'journal-1', text: 'Arrived at dusk.', createdAt: '2026-01-01T00:00:00.000Z' }
    ],
    listLogBookEntries: () => [
      {
        id: 'log-1',
        type: 'travel',
        payload: { region: 'moor' },
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ],
    listQuestLog: () => [
      { questId: 'q-main', kind: 'main', status: 'active', title: 'Find the Relic' },
      { questId: 'q-side', kind: 'side', status: 'active', title: 'Fetch Water' }
    ],
    listKnownActions: () => ['ice_bolt', 'hamstring_strike'],
    listInventory: () => inventory,
    equip: (_characterId: string, _instanceId: string, _slot: EquipmentSlot) => inventory,
    unequip: () => inventory,
    ...overrides
  }
}

describe('buildCharacterSheetSnapshot', () => {
  it('assembles live stats, equipment, and record panels from injected ports', () => {
    const snapshot = buildCharacterSheetSnapshot(makePorts(), {
      characterId: 'pc-1',
      characterName: 'Ash',
      abilityScores: SCORES
    })

    expect(snapshot.characterName).toBe('Ash')
    expect(snapshot.maxHp).toBe(18)
    expect(snapshot.currentHp).toBe(18)
    expect(snapshot.armorClass).toBe(11)
    expect(snapshot.abilityRows[0]).toEqual({ ability: 'Body', score: 14, modifier: 2 })
    expect(snapshot.mainQuests).toHaveLength(1)
    expect(snapshot.sideQuests).toHaveLength(1)
    expect(snapshot.knownActionIds).toEqual(['ice_bolt', 'hamstring_strike'])
    expect(snapshot.journal[0]?.text).toBe('Arrived at dusk.')
    expect(snapshot.logBook[0]?.type).toBe('travel')
  })

  it('uses provided currentHp and zero HP when stats are missing', () => {
    const snapshot = buildCharacterSheetSnapshot(
      makePorts({ getCharacterStats: () => undefined }),
      {
        characterId: 'pc-1',
        characterName: 'Ash',
        abilityScores: SCORES,
        currentHp: 4
      }
    )
    expect(snapshot.maxHp).toBe(0)
    expect(snapshot.currentHp).toBe(4)
  })
})
