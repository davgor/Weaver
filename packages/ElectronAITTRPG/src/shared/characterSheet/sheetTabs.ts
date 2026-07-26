import { CHARACTER_SHEET_TABS, type CharacterSheetTab } from './types.js'

export { CHARACTER_SHEET_TABS, type CharacterSheetTab }

const TAB_LABELS: Record<CharacterSheetTab, string> = {
  stats: 'Stats',
  equipment: 'Equipment',
  journal: 'Journal',
  logBook: 'Log Book',
  quests: 'Quest Log',
  spellbook: 'Spellbook'
}

export function sheetTabLabel(tab: CharacterSheetTab): string {
  return TAB_LABELS[tab]
}

export function isCharacterSheetTab(value: unknown): value is CharacterSheetTab {
  return typeof value === 'string' && CHARACTER_SHEET_TABS.some((tab) => tab === value)
}
