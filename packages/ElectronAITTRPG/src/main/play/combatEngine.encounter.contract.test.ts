import { describe, expect, it } from 'vitest'
import {
  createMemoryEncounterStore,
  getEncounter,
  startEncounter,
  submitCombatAction
} from '@weaver/combat-engine'

describe('ElectronAITTRPG contract: CombatEngine encounter chrome APIs', () => {
  it('starts, reads, and updates active encounter turn state for UI chrome', () => {
    const store = createMemoryEncounterStore()
    const encounter = startEncounter(
      {
        encounterId: 'enc-ui',
        store,
        combatants: [
          { id: 'pc-1', kind: 'character', displayName: 'Ilyra', abilityScores: scores(), hp: hp(10, 10) },
          { id: 'enemy-1', kind: 'enemy', displayName: 'Goblin', abilityScores: scores(), hp: hp(4, 6) }
        ]
      },
      { roller: () => 12 }
    )

    submitCombatAction({
      encounterId: 'enc-ui',
      store,
      combatantId: encounter.currentTurn.combatantId,
      action: { type: 'typed-action', action: 'Slash' }
    })

    expect(getEncounter({ encounterId: 'enc-ui', store })).toMatchObject({
      status: 'active',
      currentTurn: { actionUsed: true },
      turnOrder: expect.arrayContaining(['pc-1', 'enemy-1'])
    })
  })
})

function scores() {
  return { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
}

function hp(current: number, max: number) {
  return { current, max }
}
