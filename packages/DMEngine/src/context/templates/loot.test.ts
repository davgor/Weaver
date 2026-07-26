import { describe, expect, it } from 'vitest'
import { buildLootNarrationPrompt } from './loot.js'

describe('buildLootNarrationPrompt', () => {
  it('uses fixed template with slot replacements only', () => {
    const prompt = buildLootNarrationPrompt({
      character: 'Aldric',
      container: 'rusted chest',
      items: '2 gold, healing potion',
      rarity: 'common'
    })

    expect(prompt).toContain('Character: Aldric')
    expect(prompt).toContain('Container: rusted chest')
    expect(prompt).toContain('Items: 2 gold, healing potion')
    expect(prompt).toContain('Rarity: common')
    expect(prompt).not.toMatch(/\{\{/)
  })
})
