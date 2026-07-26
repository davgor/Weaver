import { describe, expect, it } from 'vitest'
import { getCharacterStats, listKnownActions } from '@weaver/character-engine'
import { itemEngine } from '@weaver/item-engine'
import {
  DEMO_SHEET_CHARACTER_ID,
  demoSheetLoadRequest,
  ensureDemoCharacterSheetData
} from './demoSeed.js'
import { createLiveCharacterSheetPorts, loadCharacterSheet } from './sheetService.js'

describe('demo character sheet seed', () => {
  it('seeds live CharacterEngine/ItemEngine data for the demo sheet character', () => {
    ensureDemoCharacterSheetData(DEMO_SHEET_CHARACTER_ID)
    expect(getCharacterStats(DEMO_SHEET_CHARACTER_ID)?.maxHp).toBeGreaterThan(0)
    expect(listKnownActions(DEMO_SHEET_CHARACTER_ID)).toContain('ice_bolt')
    expect(itemEngine.listInventory(DEMO_SHEET_CHARACTER_ID).equipped.mainHand).toBeDefined()

    const snapshot = loadCharacterSheet(createLiveCharacterSheetPorts(), demoSheetLoadRequest())
    expect(snapshot.characterName).toBe('Ashen Vale')
    expect(snapshot.mainQuests.length).toBeGreaterThan(0)
    expect(snapshot.held.length + (snapshot.equipped.mainHand ? 1 : 0)).toBeGreaterThan(0)
  })
})
