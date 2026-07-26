import { describe, expect, it } from 'vitest'
import {
  createMemoryEncounterStore,
  startEncounter,
  submitCombatAction
} from '@weaver/combat-engine'
import {
  createActionLockoutStore,
  createKnownActionStore,
  createSeedCatalog,
  useAction,
  type UseActionDeps
} from '../index.js'

function lockoutDeps(characterId: string): UseActionDeps {
  const catalog = createSeedCatalog()
  const knownActions = createKnownActionStore(catalog)
  knownActions.grantKnownAction(characterId, 'ice_bolt')
  return { catalog, knownActions, lockout: createActionLockoutStore() }
}

const scores = { Body: 10, Agility: 12, Mind: 10, Presence: 10 }

describe('ActionEngine -> CombatEngine Action-turn lockout contract', () => {
  it('locks ActionEngine use after catalog cost and Combat Action slot', () => {
    const characterId = 'hero-lockout'
    const deps = lockoutDeps(characterId)
    const store = createMemoryEncounterStore()
    const encounter = startEncounter(
      {
        encounterId: 'enc-action-lockout',
        combatants: [
          { id: characterId, kind: 'character', abilityScores: scores },
          { id: 'foe-1', kind: 'enemy', abilityScores: scores }
        ],
        store
      },
      { roller: () => 20 }
    )
    const used = useAction(
      { characterId, actionId: 'ice_bolt', distanceFeet: 15, targetIds: ['foe-1'] },
      deps
    )
    expect(used.ok && used.lockout.actionTurns).toBe(1)
    expect(deps.lockout.getRemainingActionTurns(characterId)).toBe(1)
    const after = submitCombatAction({
      encounterId: encounter.encounterId,
      combatantId: characterId,
      action: { type: 'typed-action', action: 'ice_bolt' },
      store
    })
    expect(after.currentTurn.actionUsed).toBe(true)
    expect(() =>
      submitCombatAction({
        encounterId: encounter.encounterId,
        combatantId: characterId,
        action: { type: 'typed-action', action: 'another-swing' },
        store
      })
    ).toThrow(/already used an Action/)
    expect(
      useAction(
        { characterId, actionId: 'ice_bolt', distanceFeet: 15, targetIds: ['foe-1'] },
        deps
      ).ok
    ).toBe(false)
  })
})
