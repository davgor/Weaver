import { describe, expect, it } from 'vitest'
import { learnKnownAction, listKnownActions } from '@weaver/character-engine'
import {
  createActionLockoutStore,
  createKnownActionStore,
  createSeedCatalog,
  getAction,
  validateUse,
  useAction,
  type UseActionDeps
} from '../index.js'

function knownActionDeps(): UseActionDeps {
  const catalog = createSeedCatalog()
  return {
    catalog,
    knownActions: createKnownActionStore(catalog),
    lockout: createActionLockoutStore()
  }
}

describe('ActionEngine -> CharacterEngine known-actions contract', () => {
  it('gates use on CharacterEngine-learned catalog action ids', () => {
    const characterId = 'contract-pc-known-actions'
    const deps = knownActionDeps()
    learnKnownAction(characterId, 'ice_bolt')
    expect(listKnownActions(characterId)).toEqual(['ice_bolt'])
    expect(getAction(deps.catalog.actions, 'ice_bolt')?.actionId).toBe('ice_bolt')
    for (const actionId of listKnownActions(characterId)) {
      deps.knownActions.grantKnownAction(characterId, actionId)
    }
    expect(
      validateUse({ characterId, actionId: 'ice_bolt', distanceFeet: 20 }, deps).ok
    ).toBe(true)
    expect(
      useAction(
        { characterId, actionId: 'ice_bolt', distanceFeet: 20, targetIds: ['goblin-1'] },
        deps
      ).ok
    ).toBe(true)
  })

  it('rejects CharacterEngine ids outside the ActionEngine catalog', () => {
    const characterId = 'contract-pc-unknown-catalog'
    const deps = knownActionDeps()
    learnKnownAction(characterId, 'spell.not_in_action_catalog')
    expect(listKnownActions(characterId)).toContain('spell.not_in_action_catalog')
    expect(getAction(deps.catalog.actions, 'spell.not_in_action_catalog')).toBeUndefined()
    expect(() =>
      deps.knownActions.grantKnownAction(characterId, 'spell.not_in_action_catalog')
    ).toThrow(/Unknown catalog action/)
    expect(
      validateUse(
        { characterId, actionId: 'spell.not_in_action_catalog', distanceFeet: 5 },
        deps
      ).ok
    ).toBe(false)
  })
})
