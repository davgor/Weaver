import { describe, expect, it } from 'vitest'
import { buildXpNarrationPrompt } from './xp.js'

describe('buildXpNarrationPrompt', () => {
  it('uses fixed template with slot replacements only', () => {
    const prompt = buildXpNarrationPrompt({
      character: 'Aldric',
      source: 'defeated goblin patrol',
      amount: '150',
      newTotal: '1250'
    })

    expect(prompt).toContain('Character: Aldric')
    expect(prompt).toContain('Source: defeated goblin patrol')
    expect(prompt).toContain('XP gained: 150')
    expect(prompt).toContain('New total: 1250')
    expect(prompt).not.toMatch(/\{\{/)
  })
})
