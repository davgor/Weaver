import { describe, expect, it } from 'vitest'
import {
  createMemoryEncounterStore,
  getEncounter,
  startEncounter,
  submitCombatAction
} from '@weaver/combat-engine'
import type { EncounterStore } from '@weaver/combat-engine'

describe('DMEngine -> CombatEngine encounter contract (048)', () => {
  it('submits combat actions only while encounter status is active', () => {
    const store = createMemoryEncounterStore()
    const encounter = seedEncounter(store, 'enc-contract', 'hero-contract')

    expect(encounter.status).toBe('active')
    expect(getEncounter({ encounterId: 'enc-contract', store })?.status).toBe('active')

    const acted = submitCombatAction({
      encounterId: 'enc-contract',
      combatantId: currentActor(store, 'enc-contract'),
      action: { type: 'typed-action', action: 'Strike with longsword' },
      store
    })

    expect(acted.currentTurn.actionUsed).toBe(true)
    expect(acted.turnLog.at(-1)).toMatchObject({
      kind: 'action',
      action: { type: 'typed-action', action: 'Strike with longsword' }
    })
  })
})

function seedEncounter(store: EncounterStore, encounterId: string, heroId: string) {
  return startEncounter(
    {
      encounterId,
      combatants: [
        { id: heroId, kind: 'character', abilityScores: scores() },
        { id: 'foe-1', kind: 'enemy', abilityScores: scores() }
      ],
      store
    },
    { roller: () => 18 }
  )
}

function currentActor(store: EncounterStore, encounterId: string): string {
  const encounter = getEncounter({ encounterId, store })
  if (encounter === undefined) {
    throw new Error(`missing encounter ${encounterId}`)
  }
  return encounter.currentTurn.combatantId
}

function scores() {
  return { Body: 10, Agility: 12, Mind: 10, Presence: 10 }
}
