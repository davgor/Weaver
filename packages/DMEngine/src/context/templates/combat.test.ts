import { describe, expect, it } from 'vitest'
import { buildCombatNarrationPrompt } from './combat.js'

describe('buildCombatNarrationPrompt', () => {
  it('uses fixed template with slot replacements only', () => {
    const prompt = buildCombatNarrationPrompt({
      attacker: 'Aldric',
      target: 'Goblin',
      action: 'longsword slash',
      outcome: 'hit',
      damage: '7 slashing'
    })

    expect(prompt).toContain('Attacker: Aldric')
    expect(prompt).toContain('Target: Goblin')
    expect(prompt).toContain('Action: longsword slash')
    expect(prompt).toContain('Outcome: hit')
    expect(prompt).toContain('Damage: 7 slashing')
    expect(prompt).not.toMatch(/\{\{/)
  })
})
