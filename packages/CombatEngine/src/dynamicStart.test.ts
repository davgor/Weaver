import { describe, expect, it } from 'vitest'
import {
  createMemoryEncounterStore,
  startAdHocEncounter,
  startEncounter,
  type EncounterCombatantInput
} from './index.js'

describe('CombatEngine ad-hoc start without known hostiles', () => {
  it('starts mid-scene combat with zero known hostiles by sourcing foes from EnemyEngine', () => {
    const store = createMemoryEncounterStore()
    const encounter = startAdHocEncounter(
      {
        encounterId: 'enc-adhoc-empty',
        knownCombatants: [],
        foeGeneration: { difficulty: 'easy', tags: ['goblin'], count: 1 },
        store
      },
      { roller: () => 8 }
    )
    expect(encounter.startMode).toBe('ad-hoc')
    expect(encounter.status).toBe('active')
    expect(encounter.combatants.length).toBeGreaterThanOrEqual(1)
    expect(encounter.combatants.every((c) => c.kind === 'enemy')).toBe(true)
  })
})

describe('CombatEngine ad-hoc start with allies only', () => {
  it('treats zero currently-known hostiles as a valid start path', () => {
    const store = createMemoryEncounterStore()
    const allies: EncounterCombatantInput[] = [
      {
        id: 'hero',
        kind: 'character',
        abilityScores: { Body: 10, Agility: 12, Mind: 10, Presence: 10 },
        conditions: []
      }
    ]
    const encounter = startAdHocEncounter(
      {
        encounterId: 'enc-adhoc-allies',
        knownCombatants: allies,
        foeGeneration: { difficulty: 'easy', count: 2 },
        store
      },
      { roller: () => 10 }
    )
    expect(allies.filter((c) => c.kind === 'enemy' || c.kind === 'npc')).toHaveLength(0)
    expect(encounter.combatants.some((c) => c.kind === 'enemy')).toBe(true)
    expect(encounter.combatants.some((c) => c.id === 'hero')).toBe(true)
  })
})

describe('CombatEngine encounter start mode distinction', () => {
  it('distinguishes ad-hoc start from pre-authored encounter start', () => {
    const store = createMemoryEncounterStore()
    const combatants = authoredCombatants()
    const authored = startEncounter(
      { encounterId: 'enc-authored', combatants, store },
      { roller: () => 10 }
    )
    const adHoc = startAdHocEncounter(
      {
        encounterId: 'enc-adhoc-mode',
        knownCombatants: [combatants[0]!],
        foeGeneration: { difficulty: 'medium', count: 1 },
        store
      },
      { roller: () => 10 }
    )
    expect(authored.startMode).toBe('pre-authored')
    expect(adHoc.startMode).toBe('ad-hoc')
    expect(authored.startMode).not.toBe(adHoc.startMode)
  })
})

function authoredCombatants(): EncounterCombatantInput[] {
  return [
    {
      id: 'hero',
      kind: 'character',
      abilityScores: { Body: 10, Agility: 12, Mind: 10, Presence: 10 },
      conditions: []
    },
    {
      id: 'guard',
      kind: 'npc',
      abilityScores: { Body: 12, Agility: 10, Mind: 10, Presence: 10 },
      conditions: []
    }
  ]
}
