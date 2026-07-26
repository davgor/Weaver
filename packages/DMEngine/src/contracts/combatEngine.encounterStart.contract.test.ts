import { describe, expect, it } from 'vitest'
import {
  createMemoryEncounterStore,
  getEncounter,
  type EncounterCombatantInput
} from '@weaver/combat-engine'
import { createStoreCombatTurnApi } from '../turnRouting/combatApi.js'
import { startEncounterForTurn } from '../encounterLoop/encounterLoop.js'

describe('DMEngine -> CombatEngine encounter start contract', () => {
  it('starts an ad-hoc encounter through CombatEngine without a pre-supplied encounter id', () => {
    const store = createMemoryEncounterStore()
    const combat = createStoreCombatTurnApi(store, {
      start: { roller: () => 12 },
      adHoc: { roller: () => 12 }
    })

    const encounter = startEncounterForTurn({
      combat,
      context: { campaignId: 'camp-contract-start', characterId: 'hero', text: 'ambush them' },
      encounterStart: {
        mode: 'adHoc',
        knownCombatants: [hero()],
        foeGeneration: { difficulty: 'easy', count: 1 }
      },
      createEncounterId: () => 'enc-contract-generated'
    })

    expect(encounter.encounterId).toBe('enc-contract-generated')
    expect(encounter.startMode).toBe('ad-hoc')
    expect(encounter.status).toBe('active')
    expect(getEncounter({ encounterId: 'enc-contract-generated', store })?.combatants.length).toBeGreaterThan(1)
  })
})

function hero(): EncounterCombatantInput {
  return {
    id: 'hero',
    kind: 'character',
    abilityScores: { Body: 12, Agility: 14, Mind: 10, Presence: 10 },
    hp: { current: 20, max: 20 }
  }
}
