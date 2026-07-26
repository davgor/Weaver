import {
  addJournalEntry,
  learnKnownAction,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog,
  persistCharacterMaxHp,
  upsertQuest,
  writeLogBookEvent
} from '@weaver/character-engine'
import { itemEngine, TEMPLATE_IDS } from '@weaver/item-engine'
import { DEMO_SHEET_CHARACTER_ID } from '../../shared/characterSheet/demoCharacter.js'

export {
  DEMO_SHEET_CHARACTER_ID,
  DEMO_SHEET_CHARACTER_NAME,
  DEMO_SHEET_SCORES,
  demoSheetLoadRequest
} from '../../shared/characterSheet/demoCharacter.js'

export function ensureDemoCharacterSheetData(characterId: string): void {
  if (characterId !== DEMO_SHEET_CHARACTER_ID) return
  ensureDemoStats()
  ensureDemoRecords()
  ensureDemoInventory()
}

function ensureDemoStats(): void {
  persistCharacterMaxHp({
    characterId: DEMO_SHEET_CHARACTER_ID,
    hitDie: 8,
    level: 2,
    bodyMod: 2,
    rolls: [8, 5]
  })
}

function ensureDemoRecords(): void {
  if (listJournalEntries(DEMO_SHEET_CHARACTER_ID).length === 0) {
    addJournalEntry({
      characterId: DEMO_SHEET_CHARACTER_ID,
      text: 'The road west smelled of rain and old iron.'
    })
  }
  if (listLogBookEntries(DEMO_SHEET_CHARACTER_ID).length === 0) {
    writeLogBookEvent({
      characterIds: [DEMO_SHEET_CHARACTER_ID],
      type: 'arrival',
      payload: { place: 'Ashen Gate' }
    })
  }
  if (listQuestLog(DEMO_SHEET_CHARACTER_ID).length === 0) {
    upsertQuest({
      characterId: DEMO_SHEET_CHARACTER_ID,
      questId: 'demo.main.gate',
      kind: 'main',
      status: 'active',
      title: 'Open the Ashen Gate'
    })
    upsertQuest({
      characterId: DEMO_SHEET_CHARACTER_ID,
      questId: 'demo.side.lantern',
      kind: 'side',
      status: 'active',
      title: 'Recover the Lost Lantern'
    })
  }
  if (listKnownActions(DEMO_SHEET_CHARACTER_ID).length === 0) {
    learnKnownAction(DEMO_SHEET_CHARACTER_ID, 'ice_bolt')
    learnKnownAction(DEMO_SHEET_CHARACTER_ID, 'hamstring_strike')
  }
}

function ensureDemoInventory(): void {
  itemEngine.seedItemTemplateCatalog()
  try {
    itemEngine.listInventory(DEMO_SHEET_CHARACTER_ID)
  } catch {
    itemEngine.createInventory(DEMO_SHEET_CHARACTER_ID)
    const sword = itemEngine.addItem(DEMO_SHEET_CHARACTER_ID, TEMPLATE_IDS.shortSword)
    itemEngine.addItem(DEMO_SHEET_CHARACTER_ID, TEMPLATE_IDS.roundShield)
    itemEngine.addItem(DEMO_SHEET_CHARACTER_ID, TEMPLATE_IDS.chainShirt)
    itemEngine.addItem(DEMO_SHEET_CHARACTER_ID, TEMPLATE_IDS.silverLocket)
    itemEngine.equip(DEMO_SHEET_CHARACTER_ID, sword.id, 'mainHand')
  }
}
