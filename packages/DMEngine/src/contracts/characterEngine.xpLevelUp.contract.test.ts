import { beforeEach, describe, expect, it } from 'vitest'
import {
  awardXp,
  clearProgressionStore,
  setCharacterProgression
} from '@weaver/character-engine'
import { finalizeCombatResolution } from '../encounterLoop/encounterLoop.js'
import type { CombatBranchResolution } from '../turnRouting/types.js'

beforeEach(() => {
  clearProgressionStore()
})

describe('DMEngine -> CharacterEngine XP and level-up contract', () => {
  it('uses CharacterEngine awardXp results to surface level-up numbers', () => {
    setCharacterProgression('hero-xp-contract', 1, 0)

    const result = finalizeCombatResolution({
      resolution: resolvedVictory(),
      combat: {
        resolveEncounter: () => resolvedVictory().encounter
      },
      characterId: 'hero-xp-contract',
      rewards: { xpDifficulty: 'impossible' },
      progression: { awardXp }
    })

    expect(result.rewards?.xp).toMatchObject({
      characterId: 'hero-xp-contract',
      level: 2,
      xp: 0,
      xpAwarded: 100,
      levelsGained: 1
    })
    expect(result.rewards?.levelUp).toEqual({
      fromLevel: 1,
      toLevel: 2,
      levelsGained: 1,
      xp: 0,
      xpAwarded: 100
    })
  })
})

function resolvedVictory(): CombatBranchResolution {
  return {
    kind: 'combat',
    encounter: {
      encounterId: 'enc-xp-contract',
      status: 'resolved',
      startMode: 'ad-hoc',
      combatants: [
        {
          id: 'hero-xp-contract',
          kind: 'character',
          abilityScores: { Body: 10, Agility: 12, Mind: 10, Presence: 10 },
          initiative: { roll: 10, modifier: 1, total: 11 },
          conditions: [],
          characterConditions: [],
          damageResistances: [],
          damageVulnerabilities: []
        }
      ],
      turnOrder: ['hero-xp-contract'],
      currentTurnIndex: 0,
      round: 1,
      currentTurn: { combatantId: 'hero-xp-contract', actionUsed: true, movementUsed: false },
      turnLog: []
    },
    outcome: { type: 'nonLethal', targetId: 'goblin', loot: [] }
  }
}
