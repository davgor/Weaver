import { describe, expect, it } from 'vitest'
import { createSeedCatalog, getAction } from '@weaver/action-engine'
import {
  EXPECTED_ACTION_ENGINE_ACTION_IDS,
  STARTING_GEAR_ARCHETYPES,
  getStartingLoadout
} from '../startingGear.js'

describe('ItemEngine -> ActionEngine starting-gear catalog contract', () => {
  it('resolves every starting-loadout action id from the real ActionEngine seed catalog', () => {
    const catalog = createSeedCatalog()

    for (const archetype of STARTING_GEAR_ARCHETYPES) {
      const loadout = getStartingLoadout(archetype)
      for (const actionId of loadout.actionIds) {
        expect(getAction(catalog.actions, actionId)?.actionId).toBe(actionId)
      }
    }
  })

  it('keeps expected starter action ids present in the published seed catalog', () => {
    const catalog = createSeedCatalog()

    for (const actionId of EXPECTED_ACTION_ENGINE_ACTION_IDS) {
      expect(getAction(catalog.actions, actionId)).toBeDefined()
    }
  })
})
