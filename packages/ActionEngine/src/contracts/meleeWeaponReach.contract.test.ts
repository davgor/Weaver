import { describe, expect, it } from 'vitest'
import {
  createActionLockoutStore,
  createKnownActionStore,
  createSeedCatalog,
  getAction,
  validateUse
} from '../index.js'

/**
 * Item/Combat callers supply equipped weapon reach. ActionEngine must not invent
 * reach from the meleeWeapon action definition (which carries no feet amount).
 */
describe('ActionEngine meleeWeapon reach input contract (Item/Combat)', () => {
  it('resolves melee reach only from caller-supplied Item/Combat inputs', () => {
    const catalog = createSeedCatalog()
    const knownActions = createKnownActionStore(catalog)
    const lockout = createActionLockoutStore()
    const characterId = 'melee-reach-caster'
    knownActions.grantKnownAction(characterId, 'hamstring_strike')

    const action = getAction(catalog.actions, 'hamstring_strike')
    expect(action?.range).toEqual({ kind: 'meleeWeapon' })
    expect(action).not.toHaveProperty('range.amount')

    const shortReachFromItem = 5
    const longReachFromCombat = 10

    expect(
      validateUse(
        {
          characterId,
          actionId: 'hamstring_strike',
          distanceFeet: 8,
          weaponReachFeet: shortReachFromItem
        },
        { catalog, knownActions, lockout }
      ).ok
    ).toBe(false)

    expect(
      validateUse(
        {
          characterId,
          actionId: 'hamstring_strike',
          distanceFeet: 8,
          weaponReachFeet: longReachFromCombat
        },
        { catalog, knownActions, lockout }
      ).ok
    ).toBe(true)
  })
})
