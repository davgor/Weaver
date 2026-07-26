import { describe, expect, it } from 'vitest'
import { CHARACTER_SHEET_TABS, sheetTabLabel, isCharacterSheetTab } from './sheetTabs.js'

describe('character sheet tabs', () => {
  it('exposes the six sheet panels including spellbook for known actions', () => {
    expect(CHARACTER_SHEET_TABS).toEqual([
      'stats',
      'equipment',
      'journal',
      'logBook',
      'quests',
      'spellbook'
    ])
  })

  it('labels spellbook while keeping the mechanical tab id', () => {
    expect(sheetTabLabel('spellbook')).toBe('Spellbook')
    expect(sheetTabLabel('logBook')).toBe('Log Book')
    expect(sheetTabLabel('quests')).toBe('Quest Log')
    expect(isCharacterSheetTab('journal')).toBe(true)
    expect(isCharacterSheetTab('inventory')).toBe(false)
  })
})
