import { describe, expect, it } from 'vitest'
import { CHARACTER_SHEET_TABS, sheetTabLabel } from '../../../shared/characterSheet/sheetTabs'
import { demoSheetLoadRequest } from '../../../shared/characterSheet/demoCharacter'

describe('character sheet UI entry points', () => {
  it('exposes demo load request and labeled tabs for the overlay', () => {
    const request = demoSheetLoadRequest()
    expect(request.characterId).toBe('demo.character.sheet')
    expect(CHARACTER_SHEET_TABS).toContain('spellbook')
    expect(sheetTabLabel('spellbook')).toBe('Spellbook')
  })
})
