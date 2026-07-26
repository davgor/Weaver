import { describe, expect, it } from 'vitest'
import {
  generateEncounterFoes,
  hydrateCombatantFromFoe
} from '../index.js'

describe('EnemyEngine -> CombatEngine combatant hydration contract', () => {
  it('hydrates a generated foe reference into the snapshot CombatEngine needs', () => {
    const [foe] = generateEncounterFoes({
      regionId: 'mountain',
      difficulty: 'hard',
      tags: ['fire']
    })
    expect(foe).toBeDefined()
    if (foe === undefined) {
      return
    }

    const combatant = hydrateCombatantFromFoe(foe)

    expect(combatant).toMatchObject({
      id: foe.foeId,
      bestiaryId: foe.bestiaryId,
      abilities: {
        scores: expect.objectContaining({
          Body: expect.any(Number),
          Agility: expect.any(Number),
          Mind: expect.any(Number),
          Presence: expect.any(Number)
        })
      },
      hp: {
        current: expect.any(Number),
        max: expect.any(Number)
      },
      damageTypes: {
        dealt: expect.arrayContaining(['Fire'])
      },
      tags: expect.arrayContaining(['dragon'])
    })
  })
})
