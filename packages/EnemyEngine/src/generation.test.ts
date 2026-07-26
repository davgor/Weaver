import { describe, expect, it } from 'vitest'
import {
  assignQuestFoes,
  generateEncounterFoes,
  hydrateCombatantFromFoe
} from './index.js'

describe('EnemyEngine dynamic foe generation', () => {
  it('generates deterministic region, difficulty, and tag scoped foes from the bestiary', () => {
    const foes = generateEncounterFoes({
      regionId: 'forest',
      difficulty: 'easy',
      tags: ['ambush'],
      count: 2
    })

    expect(foes).toHaveLength(2)
    expect(foes.map((foe) => foe.bestiaryId)).toEqual([
      'goblin-skirmisher',
      'goblin-skirmisher'
    ])
    expect(foes.every((foe) => foe.regionId === 'forest')).toBe(true)
  })

  it('falls back to difficulty-appropriate catalog entries when tags are broad', () => {
    const [foe] = generateEncounterFoes({ difficulty: 'medium', tags: ['undead'] })

    expect(foe?.bestiaryId).toBe('skeleton-warrior')
  })

  it('rejects quest assignments that reference unknown bestiary ids', () => {
    expect(() => assignQuestFoes({
      questId: 'quest-invalid',
      bestiaryIds: ['goblin-skirmisher', 'missing-beast']
    })).toThrow(/Unknown bestiary id: missing-beast/)
  })

  it('returns valid quest foe assignments for known catalog ids', () => {
    const assignment = assignQuestFoes({
      questId: 'quest-known',
      bestiaryIds: ['goblin-skirmisher', 'skeleton-warrior']
    })

    expect(assignment.foeRefs.map((foe) => foe.foeId)).toEqual([
      'quest-known-foe-1',
      'quest-known-foe-2'
    ])
  })

  it('hydrates generated foe references into combatant snapshots', () => {
    const [foe] = generateEncounterFoes({ difficulty: 'hard', tags: ['fire'] })
    expect(foe).toBeDefined()
    if (foe === undefined) {
      return
    }

    const combatant = hydrateCombatantFromFoe(foe)

    expect(combatant.id).toBe(foe.foeId)
    expect(combatant.abilities.scores.Body).toBeGreaterThan(10)
    expect(combatant.hp.max).toBeGreaterThan(0)
    expect(combatant.damageTypes.dealt).toContain('Fire')
    expect(combatant.tags).toContain('dragon')
  })
})
